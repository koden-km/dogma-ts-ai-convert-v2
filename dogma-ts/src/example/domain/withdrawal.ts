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
  CommandName,
  createCommand,
  dailyDebitLimitDate,
  DebitFailureReason,
  type DomainEvent,
  EventName,
  TransactionType,
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
          s.executeCommand(
            createCommand(CommandName.DebitAccount, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              transactionType: TransactionType.Withdrawal,
              amount: m.data.amount,
              scheduledTime: m.data.scheduledTime,
            }),
          );
          return;

        case EventName.AccountDebited:
          s.executeCommand(
            createCommand(CommandName.ConsumeDailyDebitLimit, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              debitType: TransactionType.Withdrawal,
              amount: m.data.amount,
              date: dailyDebitLimitDate(m.data.scheduledTime),
            }),
          );
          return;

        case EventName.AccountDebitDeclined:
          s.executeCommand(
            createCommand(CommandName.DeclineWithdrawal, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              amount: m.data.amount,
              reason: m.data.reason,
            }),
          );
          return;

        case EventName.DailyDebitLimitConsumed:
          s.executeCommand(
            createCommand(CommandName.ApproveWithdrawal, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              amount: m.data.amount,
            }),
          );
          return;

        case EventName.DailyDebitLimitExceeded:
          s.executeCommand(
            createCommand(CommandName.CreditAccount, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              transactionType: TransactionType.Withdrawal,
              amount: m.data.amount,
            }),
          );
          return;

        case EventName.AccountCredited:
          s.executeCommand(
            createCommand(CommandName.DeclineWithdrawal, {
              transactionID: m.data.transactionID,
              accountID: m.data.accountID,
              amount: m.data.amount,
              reason: DebitFailureReason.DailyDebitLimitExceeded,
            }),
          );
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
