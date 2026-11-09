import { InvalidMessageError, registerEvent } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import { isValidDate } from "../internal/validation/validation.ts";
import {
  formatTransactionType,
  isDebit,
  isValidTransactionType,
} from "../transaction.ts";
import {
  type DailyDebitLimitConsumed as DailyDebitLimitConsumedMessage,
  DailyDebitLimitConsumedSchema,
  type DailyDebitLimitExceeded as DailyDebitLimitExceededMessage,
  DailyDebitLimitExceededSchema,
} from "./dailydebitlimit_pb.ts";

export type DailyDebitLimitConsumed = DailyDebitLimitConsumedMessage;
export const DailyDebitLimitConsumed = DailyDebitLimitConsumedSchema;

export type DailyDebitLimitExceeded = DailyDebitLimitExceededMessage;
export const DailyDebitLimitExceeded = DailyDebitLimitExceededSchema;

export type DomainEvent = DailyDebitLimitConsumed | DailyDebitLimitExceeded;

registerEvent(
  DailyDebitLimitConsumed,
  "9b4a1114-817e-42d1-963d-ba6324dd07b2",
  {
    validate: validateDailyDebitLimitConsumed,
    describe: describeDailyDebitLimitConsumed,
    allowIdempotent: true,
  },
);

registerEvent(
  DailyDebitLimitExceeded,
  "83c5315e-440d-4d70-a6c8-41f97edc226f",
  {
    validate: validateDailyDebitLimitExceeded,
    describe: describeDailyDebitLimitExceeded,
    allowIdempotent: true,
  },
);

function validateDailyDebitLimitConsumed(m: DailyDebitLimitConsumed) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "DailyDebitLimitConsumed must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
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

function validateDailyDebitLimitExceeded(m: DailyDebitLimitExceeded) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "DailyDebitLimitExceeded must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
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

function describeDailyDebitLimitConsumed(m: DailyDebitLimitConsumed) {
  return `${formatTransactionType(m.debitType)} ${m.transactionId}: consumed ${formatAmount(m.amount)} from ${m.date} daily debit limit of account ${m.accountId}`;
}

function describeDailyDebitLimitExceeded(m: DailyDebitLimitExceeded) {
  return `${formatTransactionType(m.debitType)} ${m.transactionId}: exceeded ${m.date} daily debit limit of account ${m.accountId} by ${formatAmount(m.totalDebitsForDay + m.amount - m.dailyLimit)}`;
}
