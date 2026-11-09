import { InvalidMessageError, registerEvent } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  formatDebitFailureReason,
  isValidDebitFailureReason,
} from "../transaction.ts";
import {
  type TransferApproved as TransferApprovedMessage,
  TransferApprovedSchema,
  type TransferDeclined as TransferDeclinedMessage,
  TransferDeclinedSchema,
  type TransferFailed as TransferFailedMessage,
  TransferFailedSchema,
  type TransferStarted as TransferStartedMessage,
  TransferStartedSchema,
} from "./transfer_pb.ts";

export type TransferStarted = TransferStartedMessage;
export const TransferStarted = TransferStartedSchema;

export type TransferApproved = TransferApprovedMessage;
export const TransferApproved = TransferApprovedSchema;

export type TransferDeclined = TransferDeclinedMessage;
export const TransferDeclined = TransferDeclinedSchema;

export type TransferFailed = TransferFailedMessage;
export const TransferFailed = TransferFailedSchema;

export type DomainEvent =
  | TransferStarted
  | TransferApproved
  | TransferDeclined
  | TransferFailed;

registerEvent(TransferStarted, "e5a7db39-861a-4a98-b109-a6f4187ac407", {
  validate: validateTransferStarted,
  describe: describeTransferStarted,
  allowIdempotent: true,
});

registerEvent(
  TransferApproved,
  "bcc989cc-4ec7-4175-84dc-24908ac82676",
  {
    validate: validateTransferApproved,
    describe: describeTransferApproved,
    allowIdempotent: true,
  },
);

registerEvent(
  TransferDeclined,
  "0e43679a-bf5b-4730-a4a0-543e17a67479",
  {
    validate: validateTransferDeclined,
    describe: describeTransferDeclined,
    allowIdempotent: true,
  },
);

registerEvent(TransferFailed, "c6d8e9a1-2b4f-5e7c-8d0a-1f3e5c7b9d2e", {
  validate: validateTransferFailed,
  describe: describeTransferFailed,
  allowIdempotent: true,
});

function validateTransferStarted(m: TransferStarted) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "TransferStarted must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "TransferStarted must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "TransferStarted must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountId === m.toAccountId) {
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

function validateTransferApproved(m: TransferApproved) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "TransferApproved must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "TransferApproved must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "TransferApproved must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountId === m.toAccountId) {
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

function validateTransferDeclined(m: TransferDeclined) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "TransferDeclined must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "TransferDeclined must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "TransferDeclined must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountId === m.toAccountId) {
    throw new InvalidMessageError(
      "TransferDeclined from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "TransferDeclined must have a positive amount",
    );
  }
  if (!isValidDebitFailureReason(m.reason)) {
    throw new InvalidMessageError(
      `TransferDeclined must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function validateTransferFailed(m: TransferFailed) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "TransferFailed must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "TransferFailed must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "TransferFailed must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountId === m.toAccountId) {
    throw new InvalidMessageError(
      "TransferFailed from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("TransferFailed must have a positive amount");
  }
}

function describeTransferStarted(m: TransferStarted) {
  return `transfer ${m.transactionId}: started transfer of ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}`;
}

function describeTransferApproved(m: TransferApproved) {
  return `transfer ${m.transactionId}: approved transfer of ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}`;
}

function describeTransferDeclined(m: TransferDeclined) {
  return `transfer ${m.transactionId}: declined transfer of ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}: ${formatDebitFailureReason(m.reason)}`;
}

function describeTransferFailed(m: TransferFailed) {
  return `transfer ${m.transactionId}: failed transfer of ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}`;
}
