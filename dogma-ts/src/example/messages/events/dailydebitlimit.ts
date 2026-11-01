import {
  defineEvents,
  type Event,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import { isValidDate } from "../internal/validation/validation.ts";
import {
  isDebit,
  isValidTransactionType,
  type TransactionType,
} from "../transaction.ts";

export const EventName = {
  DailyDebitLimitConsumed: "DailyDebitLimitConsumed",
  DailyDebitLimitExceeded: "DailyDebitLimitExceeded",
} as const;

// DailyDebitLimitConsumed is an event that indicates an amount of an account
// daily debit limit has been consumed.
export type DailyDebitLimitConsumed = Event & {
  name: typeof EventName.DailyDebitLimitConsumed;
  data: {
    transactionID: string;
    accountID: string;
    debitType: TransactionType;
    amount: bigint;
    date: string;
    totalDebitsForDay: bigint;
    dailyLimit: bigint;
  };
};

// DailyDebitLimitExceeded is an event that indicates an attempt to consume from
// an account daily debit limit has been rejected due to reaching the limit.
export type DailyDebitLimitExceeded = Event & {
  name: typeof EventName.DailyDebitLimitExceeded;
  data: {
    transactionID: string;
    accountID: string;
    debitType: TransactionType;
    amount: bigint;
    date: string;
    totalDebitsForDay: bigint;
    dailyLimit: bigint;
  };
};

export type DomainEvent = DailyDebitLimitConsumed | DailyDebitLimitExceeded;

export const { messageCreators, messageValidators, messageDescribers } =
  defineEvents<DomainEvent>([
    [
      EventName.DailyDebitLimitConsumed,
      "9b4a1114-817e-42d1-963d-ba6324dd07b2",
      validateDailyDebitLimitConsumed,
      describeDailyDebitLimitConsumed,
    ],
    [
      EventName.DailyDebitLimitExceeded,
      "83c5315e-440d-4d70-a6c8-41f97edc226f",
      validateDailyDebitLimitExceeded,
      describeDailyDebitLimitExceeded,
    ],
  ]);

function validateDailyDebitLimitConsumed({ data: m }: DailyDebitLimitConsumed) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.debitType)) {
    throw new InvalidMessageError(
      `DailyDebitLimitConsumed must have a valid transaction type: ${m.debitType}`,
    );
  }
  if (!isDebit(m.debitType)) {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must have a debit transaction type",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must have a positive amount",
    );
  }
  if (!isValidDate(m.date)) {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must have a valid date",
    );
  }
  if (m.totalDebitsForDay < 1n) {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must have consumed 1 or more total debits for day",
    );
  }
  if (m.dailyLimit < 0n) {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must not have a negative daily limit",
    );
  }
}

function validateDailyDebitLimitExceeded({ data: m }: DailyDebitLimitExceeded) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.debitType)) {
    throw new InvalidMessageError(
      `DailyDebitLimitExceeded must have a valid transaction type: ${m.debitType}`,
    );
  }
  if (!isDebit(m.debitType)) {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must have a debit transaction type",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must have a positive amount",
    );
  }
  if (!isValidDate(m.date)) {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must have a valid date",
    );
  }
  if (m.totalDebitsForDay < 0n) {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must not have a negative total debits for day",
    );
  }
  if (m.dailyLimit < 0n) {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must not have a negative daily limit",
    );
  }
}

function describeDailyDebitLimitConsumed({ data: m }: DailyDebitLimitConsumed) {
  return `${m.debitType} ${m.transactionID}: consumed ${formatAmount(m.amount)} from ${m.date} daily debit limit of account ${m.accountID}`;
}

function describeDailyDebitLimitExceeded({ data: m }: DailyDebitLimitExceeded) {
  return `${m.debitType} ${m.transactionID}: exceeded ${m.date} daily debit limit of account ${m.accountID} by ${formatAmount(m.totalDebitsForDay + m.amount - m.dailyLimit)}`;
}
