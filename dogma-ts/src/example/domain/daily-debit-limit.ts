import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  create,
  type Event,
  handlesCommand,
  NoSnapshotBehavior,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  ConsumeDailyDebitLimitSchema,
  DailyDebitLimitConsumedSchema,
  DailyDebitLimitExceededSchema,
  type DomainCommand,
  type DomainEvent,
  formatAmount,
} from "../messages/index.ts";

// Limit amount, in cents.
export const maximumDailyDebitLimit = 900000n;

// DailyDebitLimit is the aggregate root for an account daily debit limit
// policy.
export type DailyDebitLimit = AggregateRoot & {
  // totalDebitsForDay is the total of all debits for the day, in cents.
  totalDebitsForDay: bigint;
};

// DailyDebitLimitHandler implements the business logic for an account daily
// debit limit policy.
//
// It centralizes all debits that are applied to an account over a calendar day
// in order to enforce a policy of limited daily debits.
export const DailyDebitLimitHandler: AggregateMessageHandler<DailyDebitLimit> =
  {
    ...NoSnapshotBehavior,

    configure(c: AggregateConfigurer): void {
      c.identity("daily-debit-limit", "238c5a7b-b51d-42d8-ac8d-a8c81b780230");

      c.routes(
        handlesCommand(ConsumeDailyDebitLimitSchema),
        recordsEvent(DailyDebitLimitConsumedSchema),
        recordsEvent(DailyDebitLimitExceededSchema),
      );
    },

    newRoot(): DailyDebitLimit {
      return {
        totalDebitsForDay: 0n,
      };
    },

    describeInstance(r: DailyDebitLimit): string {
      return `${formatAmount(r.totalDebitsForDay)}/${formatAmount(maximumDailyDebitLimit)}`;
    },

    applyEvent(r: DailyDebitLimit, e: Event): void {
      const m = e as DomainEvent;
      switch (m.$typeName) {
        case DailyDebitLimitConsumedSchema.typeName:
          r.totalDebitsForDay = m.totalDebitsForDay;
          break;
      }
    },

    routeCommandToInstance(c: Command): string {
      const m = c as DomainCommand;
      switch (m.$typeName) {
        case ConsumeDailyDebitLimitSchema.typeName:
          return `${m.date}:${m.accountId}`;
        default:
          throw new UnexpectedMessageError();
      }
    },

    handleCommand(
      r: DailyDebitLimit,
      s: AggregateCommandScope<DailyDebitLimit>,
      c: Command,
    ): void {
      const m = c as DomainCommand;
      switch (m.$typeName) {
        case ConsumeDailyDebitLimitSchema.typeName:
          if (r.totalDebitsForDay + m.amount > maximumDailyDebitLimit) {
            s.recordEvent(
              create(DailyDebitLimitExceededSchema, {
                transactionId: m.transactionId,
                accountId: m.accountId,
                debitType: m.debitType,
                amount: m.amount,
                date: m.date,
                totalDebitsForDay: r.totalDebitsForDay,
                dailyLimit: maximumDailyDebitLimit,
              }),
            );
          } else {
            s.recordEvent(
              create(DailyDebitLimitConsumedSchema, {
                transactionId: m.transactionId,
                accountId: m.accountId,
                debitType: m.debitType,
                amount: m.amount,
                date: m.date,
                totalDebitsForDay: r.totalDebitsForDay + m.amount,
                dailyLimit: maximumDailyDebitLimit,
              }),
            );
          }
          return;
        default:
          throw new UnexpectedMessageError();
      }
    },
  };
