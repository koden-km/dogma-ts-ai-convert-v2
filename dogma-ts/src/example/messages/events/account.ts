import { InvalidMessageError, registerEvent } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  formatDebitFailureReason,
  formatTransactionType,
  isValidDebitFailureReason,
  isValidTransactionType,
} from "../transaction.ts";
import {
  type AccountCredited,
  AccountCreditedSchema,
  type AccountDebitDeclined,
  AccountDebitDeclinedSchema,
  type AccountDebited,
  AccountDebitedSchema,
  type AccountOpened,
  AccountOpenedSchema,
} from "./account_pb.ts";

export {
  type AccountCredited,
  AccountCreditedSchema,
  type AccountDebitDeclined,
  AccountDebitDeclinedSchema,
  type AccountDebited,
  AccountDebitedSchema,
  type AccountOpened,
  AccountOpenedSchema,
};

export type DomainEvent =
  | AccountOpened
  | AccountCredited
  | AccountDebited
  | AccountDebitDeclined;

registerEvent(AccountOpenedSchema, "75ef425c-3c42-4ead-8925-cd26cbea3139", {
  validate: validateAccountOpened,
  describe: describeAccountOpened,
  allowIdempotent: true,
});

registerEvent(AccountCreditedSchema, "f3091f46-7d36-4e5f-b0ab-fb96029e5d7a", {
  validate: validateAccountCredited,
  describe: describeAccountCredited,
  allowIdempotent: true,
});

registerEvent(AccountDebitedSchema, "76552351-0095-442e-85dd-68f8f7fae286", {
  validate: validateAccountDebited,
  describe: describeAccountDebited,
  allowIdempotent: true,
});

registerEvent(
  AccountDebitDeclinedSchema,
  "34b0c426-5467-44d8-a5db-7d09c789c930",
  {
    validate: validateAccountDebitDeclined,
    describe: describeAccountDebitDeclined,
    allowIdempotent: true,
  },
);

function validateAccountOpened(m: AccountOpened) {
  if (m.customerId === "") {
    throw new InvalidMessageError(
      "AccountOpened must not have an empty customer ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "AccountOpened must not have an empty account ID",
    );
  }
  if (m.accountName === "") {
    throw new InvalidMessageError(
      "AccountOpened must not have an empty account name",
    );
  }
}

function validateAccountCredited(m: AccountCredited) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "AccountCredited must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "AccountCredited must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.transactionType)) {
    throw new InvalidMessageError(
      `AccountCredited must have a valid transaction type: ${m.transactionType}`,
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "AccountCredited must have a positive amount",
    );
  }
}

function validateAccountDebited(m: AccountDebited) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "AccountDebited must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "AccountDebited must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.transactionType)) {
    throw new InvalidMessageError(
      `AccountDebited must have a valid transaction type: ${m.transactionType}`,
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("AccountDebited must have a positive amount");
  }
}

function validateAccountDebitDeclined(m: AccountDebitDeclined) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "AccountDebitDeclined must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "AccountDebitDeclined must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.transactionType)) {
    throw new InvalidMessageError(
      `AccountDebitDeclined must have a valid transaction type: ${m.transactionType}`,
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "AccountDebitDeclined must have a positive amount",
    );
  }
  if (!isValidDebitFailureReason(m.reason)) {
    throw new InvalidMessageError(
      `AccountDebitDeclined must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function describeAccountOpened(m: AccountOpened) {
  return `opened account ${m.accountId} ${m.accountName} for customer ${m.customerId}`;
}

function describeAccountCredited(m: AccountCredited) {
  return `${formatTransactionType(m.transactionType)} ${m.transactionId}: credited ${formatAmount(m.amount)} to account ${m.accountId}`;
}

function describeAccountDebited(m: AccountDebited) {
  return `${formatTransactionType(m.transactionType)} ${m.transactionId}: debited ${formatAmount(m.amount)} from account ${m.accountId}`;
}

function describeAccountDebitDeclined(m: AccountDebitDeclined) {
  return `${formatTransactionType(m.transactionType)} ${m.transactionId}: declined debit of ${formatAmount(m.amount)} from account ${m.accountId}: ${formatDebitFailureReason(m.reason)}`;
}
