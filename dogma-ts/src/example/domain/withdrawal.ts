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
  AccountDebitDeclined,
  AccountDebited,
  ApproveWithdrawal,
  ConsumeDailyDebitLimit,
  CreditAccount,
  DailyDebitLimitConsumed,
  DailyDebitLimitExceeded,
  DebitAccount,
  DebitFailureReason,
  DeclineWithdrawal,
  type DomainEvent,
  dailyDebitLimitDate,
  TransactionType,
  WithdrawalApproved,
  WithdrawalDeclined,
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
        handlesEvent(WithdrawalStarted),
        handlesEvent(AccountDebited),
        handlesEvent(AccountDebitDeclined),
        handlesEvent(DailyDebitLimitConsumed),
        handlesEvent(DailyDebitLimitExceeded),
        handlesEvent(AccountCredited),
        handlesEvent(WithdrawalApproved),
        handlesEvent(WithdrawalDeclined),
        executesCommand(DebitAccount),
        executesCommand(ConsumeDailyDebitLimit),
        executesCommand(CreditAccount),
        executesCommand(ApproveWithdrawal),
        executesCommand(DeclineWithdrawal),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case WithdrawalStarted.typeName:
          return [m.transactionId, true];
        case AccountDebited.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.WITHDRAWAL,
          ];
        case AccountDebitDeclined.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.WITHDRAWAL,
          ];
        case DailyDebitLimitConsumed.typeName:
          return [
            m.transactionId,
            m.debitType === TransactionType.WITHDRAWAL,
          ];
        case DailyDebitLimitExceeded.typeName:
          return [
            m.transactionId,
            m.debitType === TransactionType.WITHDRAWAL,
          ];
        case AccountCredited.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.WITHDRAWAL,
          ];
        case WithdrawalApproved.typeName:
        case WithdrawalDeclined.typeName:
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
        case WithdrawalStarted.typeName:
          s.executeCommand(
            create(DebitAccount, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              transactionType: TransactionType.WITHDRAWAL,
              amount: m.amount,
              scheduledTime: m.scheduledTime,
            }),
          );
          return;

        case AccountDebited.typeName:
          s.executeCommand(
            create(ConsumeDailyDebitLimit, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              debitType: TransactionType.WITHDRAWAL,
              amount: m.amount,
              date: dailyDebitLimitDate(m.scheduledTime),
            }),
          );
          return;

        case AccountDebitDeclined.typeName:
          s.executeCommand(
            create(DeclineWithdrawal, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
              reason: m.reason,
            }),
          );
          return;

        case DailyDebitLimitConsumed.typeName:
          s.executeCommand(
            create(ApproveWithdrawal, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
            }),
          );
          return;

        case DailyDebitLimitExceeded.typeName:
          s.executeCommand(
            create(CreditAccount, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              transactionType: TransactionType.WITHDRAWAL,
              amount: m.amount,
            }),
          );
          return;

        case AccountCredited.typeName:
          s.executeCommand(
            create(DeclineWithdrawal, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
              reason: DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED,
            }),
          );
          return;

        case WithdrawalApproved.typeName:
        case WithdrawalDeclined.typeName:
          s.end();
          return;

        default:
          throw new UnexpectedMessageError();
      }
    },
  };
