import {
  type Context,
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
  CommandName,
  createCommand,
  CreditAccount,
  DepositStarted,
  type DomainEvent,
  EventName,
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
        handlesEvent(EventName.DepositStarted),
        handlesEvent(EventName.AccountCredited),
        handlesEvent(EventName.DepositApproved),
        executesCommand(CommandName.CreditAccount),
        executesCommand(CommandName.ApproveDeposit),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.name) {
        case EventName.DepositStarted:
          return [m.data.transactionID, true];
        case EventName.AccountCredited:
          return [
            m.data.transactionID,
            m.data.transactionType === TransactionType.Deposit,
          ];
        case EventName.DepositApproved:
          return [m.data.transactionID, true];
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
      switch (m.name) {
        case EventName.DepositStarted:
          creditAccount(s, m);
          return;
        case EventName.AccountCredited:
          approveDeposit(s, m);
          return;
        case EventName.DepositApproved:
          s.end();
          return;
        default:
          throw new UnexpectedMessageError();
      }
    },
  };

function creditAccount(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: DepositStarted,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.CreditAccount, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      transactionType: TransactionType.Deposit,
      amount: m.amount,
    }),
  );
}

function approveDeposit(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: AccountCredited,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.ApproveDeposit, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
    }),
  );
}
