import { InvalidMessageError, registerCommand } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import { isValidDate } from "../internal/validation/validation.ts";
import {
  formatTransactionType,
  isDebit,
  isValidTransactionType,
} from "../transaction.ts";
import {
  type ConsumeDailyDebitLimit as ConsumeDailyDebitLimitMessage,
  ConsumeDailyDebitLimitSchema,
} from "./daily-debit-limit_pb.ts";

export type ConsumeDailyDebitLimit = ConsumeDailyDebitLimitMessage;
export const ConsumeDailyDebitLimit = ConsumeDailyDebitLimitSchema;

export type DomainCommand = ConsumeDailyDebitLimit;

registerCommand(
  ConsumeDailyDebitLimit,
  "d86ca816-6333-4b78-a1d3-9368b3adcf65",
  {
    validate: validateConsumeDailyDebitLimit,
    describe: describeConsumeDailyDebitLimit,
    allowIdempotent: true,
  },
);

function validateConsumeDailyDebitLimit(m: ConsumeDailyDebitLimit) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "ConsumeDailyDebitLimit must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "ConsumeDailyDebitLimit must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.debitType)) {
    throw new InvalidMessageError(
      `ConsumeDailyDebitLimit must have a valid transaction type: ${m.debitType}`,
    );
  }
  if (!isDebit(m.debitType)) {
    throw new InvalidMessageError(
      "ConsumeDailyDebitLimit must have a debit transaction type",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "ConsumeDailyDebitLimit must have a positive amount",
    );
  }
  if (!isValidDate(m.date)) {
    throw new InvalidMessageError(
      "ConsumeDailyDebitLimit must have a valid date",
    );
  }
}

function describeConsumeDailyDebitLimit(m: ConsumeDailyDebitLimit) {
  return `${formatTransactionType(m.debitType)} ${m.transactionId}: consuming ${formatAmount(m.amount)} from ${m.date} daily debit limit of account ${m.accountId}`;
}
