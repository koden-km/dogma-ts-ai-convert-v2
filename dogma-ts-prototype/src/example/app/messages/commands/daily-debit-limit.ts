import {
  Command,
  InvalidMessageError,
  defineCommands,
} from "@/dogma/message.ts";
import {
  isDebit,
  isValidTransactionType,
  TransactionType,
} from "../transaction.ts";
import { formatAmount } from "../format.ts";
import { isValidDate } from "../internal/validation/validation.ts";

export const CommandName = {
  ConsumeDailyDebitLimit: "ConsumeDailyDebitLimit",
} as const;

// ConsumeDailyDebitLimit is a command requesting that an amount of an account
// daily debit limit be consumed.
export type ConsumeDailyDebitLimit = Command & {
  name: typeof CommandName.ConsumeDailyDebitLimit;
  data: {
    transactionID: string;
    accountID: string;
    debitType: TransactionType;
    amount: bigint;
    date: string;
  };
};

export type DomainCommand = ConsumeDailyDebitLimit;

export const { messageCreators, messageValidators, messageDescribers } =
  defineCommands<DomainCommand>([
    [
      CommandName.ConsumeDailyDebitLimit,
      validateConsumeDailyDebitLimit,
      describeConsumeDailyDebitLimit,
    ],
  ]);

function validateConsumeDailyDebitLimit({ data: m }: ConsumeDailyDebitLimit) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "ConsumeDailyDebitLimit must not have an empty transaction ID",
    );
  }
  if (m.accountID == "") {
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

function describeConsumeDailyDebitLimit({ data: m }: ConsumeDailyDebitLimit) {
  return `${m.debitType} ${m.transactionID}: consuming ${formatAmount(m.amount)} from ${m.date} daily debit limit of account ${m.accountID}`;
}
