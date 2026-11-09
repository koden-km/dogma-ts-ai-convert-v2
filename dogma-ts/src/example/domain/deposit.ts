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
  AccountCredited,
  ApproveDeposit,
  CreditAccount,
  DepositApproved,
  DepositStarted,
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
        handlesEvent(DepositStarted),
        handlesEvent(AccountCredited),
        handlesEvent(DepositApproved),
        executesCommand(CreditAccount),
        executesCommand(ApproveDeposit),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case DepositStarted.typeName:
          return [m.transactionId, true];
        case AccountCredited.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.DEPOSIT,
          ];
        case DepositApproved.typeName:
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
        case DepositStarted.typeName:
          s.executeCommand(
            create(CreditAccount, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              transactionType: TransactionType.DEPOSIT,
              amount: m.amount,
            }),
          );
          return;

        case AccountCredited.typeName:
          s.executeCommand(
            create(ApproveDeposit, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
            }),
          );
          return;

        case DepositApproved.typeName:
          s.end();
          return;

        default:
          throw new UnexpectedMessageError();
      }
    },
  };
