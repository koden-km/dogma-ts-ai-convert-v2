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
  AccountDebitDeclinedSchema,
  AccountDebitedSchema,
  ApproveWithdrawalSchema,
  ConsumeDailyDebitLimitSchema,
  CreditAccountSchema,
  DailyDebitLimitConsumedSchema,
  DailyDebitLimitExceededSchema,
  DebitAccountSchema,
  DebitFailureReason,
  DeclineWithdrawalSchema,
  type DomainEvent,
  dailyDebitLimitDate,
  TransactionType,
  WithdrawalApprovedSchema,
  WithdrawalDeclinedSchema,
  WithdrawalStartedSchema,
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
        handlesEvent(WithdrawalStartedSchema),
        handlesEvent(AccountDebitedSchema),
        handlesEvent(AccountDebitDeclinedSchema),
        handlesEvent(DailyDebitLimitConsumedSchema),
        handlesEvent(DailyDebitLimitExceededSchema),
        handlesEvent(AccountCreditedSchema),
        handlesEvent(WithdrawalApprovedSchema),
        handlesEvent(WithdrawalDeclinedSchema),
        executesCommand(DebitAccountSchema),
        executesCommand(ConsumeDailyDebitLimitSchema),
        executesCommand(CreditAccountSchema),
        executesCommand(ApproveWithdrawalSchema),
        executesCommand(DeclineWithdrawalSchema),
      );
    },

    routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case WithdrawalStartedSchema.typeName:
          return [m.transactionId, true];
        case AccountDebitedSchema.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.WITHDRAWAL,
          ];
        case AccountDebitDeclinedSchema.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.WITHDRAWAL,
          ];
        case DailyDebitLimitConsumedSchema.typeName:
          return [
            m.transactionId,
            m.debitType === TransactionType.WITHDRAWAL,
          ];
        case DailyDebitLimitExceededSchema.typeName:
          return [
            m.transactionId,
            m.debitType === TransactionType.WITHDRAWAL,
          ];
        case AccountCreditedSchema.typeName:
          return [
            m.transactionId,
            m.transactionType === TransactionType.WITHDRAWAL,
          ];
        case WithdrawalApprovedSchema.typeName:
        case WithdrawalDeclinedSchema.typeName:
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
        case WithdrawalStartedSchema.typeName:
          s.executeCommand(
            create(DebitAccountSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              transactionType: TransactionType.WITHDRAWAL,
              amount: m.amount,
              scheduledTime: m.scheduledTime,
            }),
          );
          return;

        case AccountDebitedSchema.typeName:
          s.executeCommand(
            create(ConsumeDailyDebitLimitSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              debitType: TransactionType.WITHDRAWAL,
              amount: m.amount,
              date: dailyDebitLimitDate(m.scheduledTime),
            }),
          );
          return;

        case AccountDebitDeclinedSchema.typeName:
          s.executeCommand(
            create(DeclineWithdrawalSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
              reason: m.reason,
            }),
          );
          return;

        case DailyDebitLimitConsumedSchema.typeName:
          s.executeCommand(
            create(ApproveWithdrawalSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
            }),
          );
          return;

        case DailyDebitLimitExceededSchema.typeName:
          s.executeCommand(
            create(CreditAccountSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              transactionType: TransactionType.WITHDRAWAL,
              amount: m.amount,
            }),
          );
          return;

        case AccountCreditedSchema.typeName:
          s.executeCommand(
            create(DeclineWithdrawalSchema, {
              transactionId: m.transactionId,
              accountId: m.accountId,
              amount: m.amount,
              reason: DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED,
            }),
          );
          return;

        case WithdrawalApprovedSchema.typeName:
        case WithdrawalDeclinedSchema.typeName:
          s.end();
          return;

        default:
          throw new UnexpectedMessageError();
      }
    },
  };
