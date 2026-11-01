import {
  defineEvents,
  type Event,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  DebitFailureReason,
  isValidTransactionType,
  type TransactionType,
} from "../transaction.ts";

export const EventName = {
  AccountOpened: "AccountOpened",
  AccountCredited: "AccountCredited",
  AccountDebited: "AccountDebited",
  AccountDebitDeclined: "AccountDebitDeclined",
} as const;

// AccountOpened is an event indicating that a new bank account has been opened.
export type AccountOpened = Event & {
  name: typeof EventName.AccountOpened;
  data: {
    customerID: string;
    accountID: string;
    accountName: string;
  };
};

// AccountCredited is an event indicating that a bank account was credited.
export type AccountCredited = Event & {
  name: typeof EventName.AccountCredited;
  data: {
    transactionID: string;
    accountID: string;
    transactionType: TransactionType;
    amount: bigint;
  };
};

// AccountDebited is an event indicating that a bank account was debited.
export type AccountDebited = Event & {
  name: typeof EventName.AccountDebited;
  data: {
    transactionID: string;
    accountID: string;
    transactionType: TransactionType;
    amount: bigint;
    scheduledTime: string | Date;
  };
};

// AccountDebitDeclined is an event indicating that a bank account debit was
// declined.
export type AccountDebitDeclined = Event & {
  name: typeof EventName.AccountDebitDeclined;
  data: {
    transactionID: string;
    accountID: string;
    transactionType: TransactionType;
    amount: bigint;
    reason: DebitFailureReason;
  };
};

export type DomainEvent =
  | AccountOpened
  | AccountCredited
  | AccountDebited
  | AccountDebitDeclined;

export const { messageCreators, messageValidators, messageDescribers } =
  defineEvents<DomainEvent>([
    [
      EventName.AccountOpened,
      "75ef425c-3c42-4ead-8925-cd26cbea3139",
      validateAccountOpened,
      describeAccountOpened,
    ],
    [
      EventName.AccountCredited,
      "f3091f46-7d36-4e5f-b0ab-fb96029e5d7a",
      validateAccountCredited,
      describeAccountCredited,
    ],
    [
      EventName.AccountDebited,
      "76552351-0095-442e-85dd-68f8f7fae286",
      validateAccountDebited,
      describeAccountDebited,
    ],
    [
      EventName.AccountDebitDeclined,
      "34b0c426-5467-44d8-a5db-7d09c789c930",
      validateAccountDebitDeclined,
      describeAccountDebitDeclined,
    ],
  ]);

function validateAccountOpened({ data: m }: AccountOpened) {
  if (m.customerID === "") {
    throw new InvalidMessageError(
      "AccountOpened must not have an empty customer ID",
    );
  }
  if (m.accountID === "") {
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

function validateAccountCredited({ data: m }: AccountCredited) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "AccountCredited must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
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

function validateAccountDebited({ data: m }: AccountDebited) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "AccountDebited must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
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

function validateAccountDebitDeclined({ data: m }: AccountDebitDeclined) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "AccountDebitDeclined must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
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
  if (!Object.values(DebitFailureReason).includes(m.reason)) {
    throw new InvalidMessageError(
      `AccountDebitDeclined must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function describeAccountOpened({ data: m }: AccountOpened) {
  return `opened account ${m.accountID} ${m.accountName} for customer ${m.customerID}`;
}

function describeAccountCredited({ data: m }: AccountCredited) {
  return `${m.transactionType} ${m.transactionID}: credited ${formatAmount(m.amount)} to account ${m.accountID}`;
}

function describeAccountDebited({ data: m }: AccountDebited) {
  return `${m.transactionType} ${m.transactionID}: debited ${formatAmount(m.amount)} from account ${m.accountID}`;
}

function describeAccountDebitDeclined({ data: m }: AccountDebitDeclined) {
  return `${m.transactionType} ${m.transactionID}: declined debit of ${formatAmount(m.amount)} from account ${m.accountID}: ${m.reason}`;
}
