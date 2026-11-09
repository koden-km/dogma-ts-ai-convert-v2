import { InvalidMessageError, registerCommand } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  formatDebitFailureReason,
  isValidDebitFailureReason,
} from "../transaction.ts";
import {
  type ApproveTransfer,
  ApproveTransferSchema,
  type DeclineTransfer,
  DeclineTransferSchema,
  type MarkTransferAsFailed,
  MarkTransferAsFailedSchema,
  type Transfer,
  TransferSchema,
} from "./transfer_pb.ts";

export {
  type ApproveTransfer,
  ApproveTransferSchema,
  type DeclineTransfer,
  DeclineTransferSchema,
  type MarkTransferAsFailed,
  MarkTransferAsFailedSchema,
  type Transfer,
  TransferSchema,
};

export type DomainCommand =
  | Transfer
  | ApproveTransfer
  | DeclineTransfer
  | MarkTransferAsFailed;

registerCommand(TransferSchema, "5ee87c7b-bde3-4b39-9f12-44968cdb9889", {
  validate: validateTransfer,
  describe: describeTransfer,
  allowIdempotent: true,
});

registerCommand(ApproveTransferSchema, "0d22aaa5-4449-459a-b9b1-c5fb0ce4a990", {
  validate: validateApproveTransfer,
  describe: describeApproveTransfer,
  allowIdempotent: true,
});

registerCommand(DeclineTransferSchema, "d7d069a2-41fc-415e-91dd-7db3affa9f6d", {
  validate: validateDeclineTransfer,
  describe: describeDeclineTransfer,
  allowIdempotent: true,
});

registerCommand(
  MarkTransferAsFailedSchema,
  "b3e5f6a2-7c1d-4e8b-a9f0-3d2c1e4b5f6a",
  {
    validate: validateMarkTransferAsFailed,
    describe: describeMarkTransferAsFailed,
    allowIdempotent: true,
  },
);

function validateTransfer(m: Transfer) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountId === m.toAccountId) {
    throw new InvalidMessageError(
      "Transfer from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("Transfer must have a positive amount");
  }
}

function validateApproveTransfer(m: ApproveTransfer) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "ApproveTransfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "ApproveTransfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "ApproveTransfer must not have an empty 'to' account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "ApproveTransfer must have a positive amount",
    );
  }
}

function validateDeclineTransfer(m: DeclineTransfer) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty 'to' account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DeclineTransfer must have a positive amount",
    );
  }
  if (!isValidDebitFailureReason(m.reason)) {
    throw new InvalidMessageError(
      `DeclineTransfer must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function validateMarkTransferAsFailed(m: MarkTransferAsFailed) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "MarkTransferAsFailed must not have an empty transaction ID",
    );
  }
  if (m.fromAccountId === "") {
    throw new InvalidMessageError(
      "MarkTransferAsFailed must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountId === "") {
    throw new InvalidMessageError(
      "MarkTransferAsFailed must not have an empty 'to' account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "MarkTransferAsFailed must have a positive amount",
    );
  }
}

function describeTransfer(m: Transfer) {
  return `transfer ${m.transactionId}: transferring ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}`;
}

function describeApproveTransfer(m: ApproveTransfer) {
  return `transfer ${m.transactionId}: approving transfer of ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}`;
}

function describeDeclineTransfer(m: DeclineTransfer) {
  return `transfer ${m.transactionId}: declining transfer of ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}: ${formatDebitFailureReason(m.reason)}`;
}

function describeMarkTransferAsFailed(m: MarkTransferAsFailed) {
  return `transfer ${m.transactionId}: failing transfer of ${formatAmount(m.amount)} from account ${m.fromAccountId} to account ${m.toAccountId}`;
}
