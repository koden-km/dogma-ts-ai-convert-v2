import {
  type Context,
  create,
  type Event,
  executesCommand,
  handlesEvent,
  NoDeadlineMessagesBehavior,
  type ProcessConfigurer,
  type ProcessEventScope,
  type ProcessMessageHandler,
  StatelessProcessBehavior,
  type StatelessProcessRoot,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  AccountCreditedSchema,
  ApproveDepositSchema,
  CreditAccountSchema,
  DepositApprovedSchema,
  DepositStartedSchema,
  type DomainEvent,
  TransactionType,
} from "../messages/index.ts";

// DepositProcessHandler manages the process of depositing funds into an
// account.
export const DepositProcessHandler: ProcessMessageHandler<StatelessProcessRoot> =
  {
    ...StatelessProcessBehavior,
    ...NoDeadlineMessagesBehavior,

    configure(c: ProcessConfigurer): void {
      c.identity("deposit", "4e50b66b-b2c4-4522-bf15-39756186caee");

      c.routes(
        handlesEvent(DepositStartedSchema),
        handlesEvent(AccountCreditedSchema),
        handlesEvent(DepositApprovedSchema),
        executesCommand(CreditAccountSchema),
        executesCommand(ApproveDepositSchema),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case DepositStartedSchema.typeName:
          return [m.transactionId, true];
        case AccountCreditedSchema.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.DEPOSIT,
          ];
        case DepositApprovedSchema.typeName:
          return [m.transactionId, true];
        default:
          throw new UnexpectedMessageError();
      }
    },

    handleEvent(
      _ctx: Context,
      _r: StatelessProcessRoot,
      s: ProcessEventScope<StatelessProcessRoot>,
      e: Event,
    ): void {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case DepositStartedSchema.typeName:
          s.executeCommand(
            create(CreditAccountSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              transactionType: TransactionType.DEPOSIT,
              amount: m.amount,
            }),
          );
          return;

        case AccountCreditedSchema.typeName:
          s.executeCommand(
            create(ApproveDepositSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
            }),
          );
          return;

        case DepositApprovedSchema.typeName:
          s.end();
          return;

        default:
          throw new UnexpectedMessageError();
      }
    },
  };
