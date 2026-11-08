import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  type Event,
  handlesCommand,
  NoSnapshotBehavior,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CommandName,
  type ConsumeDailyDebitLimit,
  createEvent,
  type DomainCommand,
  type DomainEvent,
  EventName,
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
        handlesCommand<ConsumeDailyDebitLimit>(
          CommandName.ConsumeDailyDebitLimit,
        ),
        recordsEvent(EventName.DailyDebitLimitConsumed),
        recordsEvent(EventName.DailyDebitLimitExceeded),
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
      switch (m.name) {
        case EventName.DailyDebitLimitConsumed:
          r.totalDebitsForDay = m.data.totalDebitsForDay;
          break;
      }
    },

    routeCommandToInstance(c: Command): string {
      const m = c as DomainCommand;
      switch (m.name) {
        case CommandName.ConsumeDailyDebitLimit:
          return `${m.data.date}:${m.data.accountID}`;
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
      switch (m.name) {
        case CommandName.ConsumeDailyDebitLimit:
          attemptDebit(r, s, m);
          return;
        default:
          throw new UnexpectedMessageError();
      }
    },
  };

function attemptDebit(
  r: DailyDebitLimit,
  s: AggregateCommandScope<DailyDebitLimit>,
  c: ConsumeDailyDebitLimit,
) {
  const { data: m } = c;
  if (amountExceedsLimit(r.totalDebitsForDay, m.amount)) {
    rejectDebitDueToExceedingLimit(r, s, c);
    return;
  }
  consumeAmountFromLimit(r, s, c);
}

function rejectDebitDueToExceedingLimit(
  r: DailyDebitLimit,
  s: AggregateCommandScope<DailyDebitLimit>,
  c: ConsumeDailyDebitLimit,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.DailyDebitLimitExceeded, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      debitType: m.debitType,
      amount: m.amount,
      date: m.date,
      totalDebitsForDay: r.totalDebitsForDay,
      dailyLimit: maximumDailyDebitLimit,
    }),
  );
}

function consumeAmountFromLimit(
  r: DailyDebitLimit,
  s: AggregateCommandScope<DailyDebitLimit>,
  c: ConsumeDailyDebitLimit,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.DailyDebitLimitConsumed, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      debitType: m.debitType,
      amount: m.amount,
      date: m.date,
      totalDebitsForDay: r.totalDebitsForDay + m.amount,
      dailyLimit: maximumDailyDebitLimit,
    }),
  );
}

function amountExceedsLimit(
  totalDebitsForDay: bigint,
  amount: bigint,
): boolean {
  return totalDebitsForDay + amount > maximumDailyDebitLimit;
}
