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
  AccountDebitDeclined,
  AccountDebited,
  CommandName,
  createCommand,
  DailyDebitLimitConsumed,
  dailyDebitLimitDate,
  DailyDebitLimitExceeded,
  DebitFailureReason,
  type DomainEvent,
  EventName,
  TransactionType,
  WithdrawalStarted,
} from "../messages/index.ts";

// WithdrawalProcessHandler manages the process of withdrawing funds from an
// account.
export const WithdrawalProcessHandler: ProcessMessageHandler<StatelessProcessRoot> =
  {
    ...StatelessProcessBehavior,
    ...NoDeadlineMessagesBehavior,

    configure(c: ProcessConfigurer): void {
      c.identity("withdrawal", "23f70d2b-a289-4e0f-8a83-c0c6a69d11d9");

      c.routes(
        handlesEvent(EventName.WithdrawalStarted),
        handlesEvent(EventName.AccountDebited),
        handlesEvent(EventName.AccountDebitDeclined),
        handlesEvent(EventName.DailyDebitLimitConsumed),
        handlesEvent(EventName.DailyDebitLimitExceeded),
        handlesEvent(EventName.AccountCredited),
        handlesEvent(EventName.WithdrawalApproved),
        handlesEvent(EventName.WithdrawalDeclined),
        executesCommand(CommandName.DebitAccount),
        executesCommand(CommandName.ConsumeDailyDebitLimit),
        executesCommand(CommandName.CreditAccount),
        executesCommand(CommandName.ApproveWithdrawal),
        executesCommand(CommandName.DeclineWithdrawal),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.name) {
        case EventName.WithdrawalStarted:
          return [m.data.transactionID, true];
        case EventName.AccountDebited:
          return [
            m.data.transactionID,
            m.data.transactionType === TransactionType.Withdrawal,
          ];
        case EventName.AccountDebitDeclined:
          return [
            m.data.transactionID,
            m.data.transactionType === TransactionType.Withdrawal,
          ];
        case EventName.DailyDebitLimitConsumed:
          return [
            m.data.transactionID,
            m.data.debitType === TransactionType.Withdrawal,
          ];
        case EventName.DailyDebitLimitExceeded:
          return [
            m.data.transactionID,
            m.data.debitType === TransactionType.Withdrawal,
          ];
        case EventName.AccountCredited:
          return [
            m.data.transactionID,
            m.data.transactionType === TransactionType.Withdrawal,
          ];
        case EventName.WithdrawalApproved:
        case EventName.WithdrawalDeclined:
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
        case EventName.WithdrawalStarted:
          debitAccountForWithdrawal(s, m);
          return;
        case EventName.AccountDebited:
          consumeDailyDebitLimit(s, m);
          return;
        case EventName.AccountDebitDeclined:
          declineWithdrawalDueToDeclinedDebit(s, m);
          return;
        case EventName.DailyDebitLimitConsumed:
          approveWithdrawal(s, m);
          return;
        case EventName.DailyDebitLimitExceeded:
          refundAccountDueToExceedingDailyDebitLimit(s, m);
          return;
        case EventName.AccountCredited:
          declineWithdrawalDueToExceedingDailyLimit(s, m);
          return;
        case EventName.WithdrawalApproved:
        case EventName.WithdrawalDeclined:
          s.end();
          return;
        default:
          throw new UnexpectedMessageError();
      }
    },
  };

function debitAccountForWithdrawal(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: WithdrawalStarted,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.DebitAccount, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      transactionType: TransactionType.Withdrawal,
      amount: m.amount,
      scheduledTime: m.scheduledTime,
    }),
  );
}

function consumeDailyDebitLimit(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: AccountDebited,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.ConsumeDailyDebitLimit, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      debitType: TransactionType.Withdrawal,
      amount: m.amount,
      date: dailyDebitLimitDate(m.scheduledTime),
    }),
  );
}

function declineWithdrawalDueToDeclinedDebit(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: AccountDebitDeclined,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.DeclineWithdrawal, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
      reason: m.reason,
    }),
  );
  return;
}

function approveWithdrawal(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: DailyDebitLimitConsumed,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.ApproveWithdrawal, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
    }),
  );
}

function refundAccountDueToExceedingDailyDebitLimit(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: DailyDebitLimitExceeded,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.CreditAccount, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      transactionType: TransactionType.Withdrawal,
      amount: m.amount,
    }),
  );
  return;
}

function declineWithdrawalDueToExceedingDailyLimit(
  s: ProcessEventScope<StatelessProcessRoot>,
  e: AccountCredited,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.DeclineWithdrawal, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
      reason: DebitFailureReason.DailyDebitLimitExceeded,
    }),
  );
}
