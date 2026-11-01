import { Event, InvalidMessageError, defineEvents } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import { DebitFailureReason } from "../transaction.ts";

export const EventName = {
  TransferStarted: "TransferStarted",
  TransferApproved: "TransferApproved",
  TransferDeclined: "TransferDeclined",
} as const;

// TransferStarted is an event indicating that the process of transferring funds
// from one account to another has begun.
export type TransferStarted = Event & {
  name: typeof EventName.TransferStarted;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    amount: bigint;
    scheduledTime: string; // ISO date string
  };
};

// TransferApproved is an event that indicates a requested transfer has been
// approved.
export type TransferApproved = Event & {
  name: typeof EventName.TransferApproved;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    amount: bigint;
  };
};

// TransferDeclined is an event that indicates a requested transfer has been
// declined.
export type TransferDeclined = Event & {
  name: typeof EventName.TransferDeclined;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    amount: bigint;
    reason: DebitFailureReason;
  };
};

export type DomainEvent = TransferStarted | TransferApproved | TransferDeclined;

export const { messageCreators, messageValidators, messageDescribers } =
  defineEvents<DomainEvent>([
    [
      EventName.TransferStarted,
      validateTransferStarted,
      describeTransferStarted,
    ],
    [
      EventName.TransferApproved,
      validateTransferApproved,
      describeTransferApproved,
    ],
    [
      EventName.TransferDeclined,
      validateTransferDeclined,
      describeTransferDeclined,
    ],
  ]);

function validateTransferStarted({ data: m }: TransferStarted) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "TransferStarted must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID == "") {
    throw new InvalidMessageError(
      "TransferStarted must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID == "") {
    throw new InvalidMessageError(
      "TransferStarted must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountID == m.toAccountID) {
    throw new InvalidMessageError(
      "TransferStarted from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "TransferStarted must have a positive amount",
    );
  }
}

function validateTransferApproved({ data: m }: TransferApproved) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "TransferApproved must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID == "") {
    throw new InvalidMessageError(
      "TransferApproved must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID == "") {
    throw new InvalidMessageError(
      "TransferApproved must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountID == m.toAccountID) {
    throw new InvalidMessageError(
      "TransferApproved from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "TransferApproved must have a positive amount",
    );
  }
}

function validateTransferDeclined({ data: m }: TransferDeclined) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "TransferDeclined must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID == "") {
    throw new InvalidMessageError(
      "TransferDeclined must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID == "") {
    throw new InvalidMessageError(
      "TransferDeclined must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountID == m.toAccountID) {
    throw new InvalidMessageError(
      "TransferDeclined from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "TransferDeclined must have a positive amount",
    );
  }
  if (!Object.values(DebitFailureReason).includes(m.reason)) {
    throw new InvalidMessageError(
      `TransferDeclined must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function describeTransferStarted({ data: m }: TransferStarted) {
  return `transfer ${m.transactionID}: started transfer of ${formatAmount(m.amount)} from account ${m.fromAccountID} to account ${m.toAccountID}`;
}

function describeTransferApproved({ data: m }: TransferApproved) {
  return `transfer ${m.transactionID}: approved transfer of ${formatAmount(m.amount)} from account ${m.fromAccountID} to account ${m.toAccountID}`;
}

function describeTransferDeclined({ data: m }: TransferDeclined) {
  return `transfer ${m.transactionID}: declined transfer of ${formatAmount(m.amount)} from account ${m.fromAccountID} to account ${m.toAccountID}: ${m.reason}`;
}
