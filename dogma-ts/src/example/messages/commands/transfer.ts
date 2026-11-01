import {
  type Command,
  defineCommands,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import { DebitFailureReason } from "../transaction.ts";

export const CommandName = {
  Transfer: "Transfer",
  ApproveTransfer: "ApproveTransfer",
  DeclineTransfer: "DeclineTransfer",
  MarkTransferAsFailed: "MarkTransferAsFailed",
} as const;

// Transfer is a command requesting that funds be transferred from one bank
// account to another.
export type Transfer = Command & {
  name: typeof CommandName.Transfer;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    toThirdPartyBank?: boolean;
    amount: bigint;
    scheduledTime: string | Date;
  };
};

// ApproveTransfer is a command that approves an account transfer.
export type ApproveTransfer = Command & {
  name: typeof CommandName.ApproveTransfer;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    amount: bigint;
  };
};

// DeclineTransfer is a command that rejects an account transfer.
export type DeclineTransfer = Command & {
  name: typeof CommandName.DeclineTransfer;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    amount: bigint;
    reason: DebitFailureReason;
  };
};

// MarkTransferAsFailed is a command that marks an account transfer as failed
// due to an operational error that occurred after the transfer was initiated.
export type MarkTransferAsFailed = Command & {
  name: typeof CommandName.MarkTransferAsFailed;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    amount: bigint;
  };
};

export type DomainCommand =
  | Transfer
  | ApproveTransfer
  | DeclineTransfer
  | MarkTransferAsFailed;

export const { messageCreators, messageValidators, messageDescribers } =
  defineCommands<DomainCommand>([
    [
      CommandName.Transfer,
      "5ee87c7b-bde3-4b39-9f12-44968cdb9889",
      validateTransfer,
      describeTransfer,
    ],
    [
      CommandName.ApproveTransfer,
      "0d22aaa5-4449-459a-b9b1-c5fb0ce4a990",
      validateApproveTransfer,
      describeApproveTransfer,
    ],
    [
      CommandName.DeclineTransfer,
      "d7d069a2-41fc-415e-91dd-7db3affa9f6d",
      validateDeclineTransfer,
      describeDeclineTransfer,
    ],
    [
      CommandName.MarkTransferAsFailed,
      "b3e5f6a2-7c1d-4e8b-a9f0-3d2c1e4b5f6a",
      validateMarkTransferAsFailed,
      describeMarkTransferAsFailed,
    ],
  ]);

function validateTransfer({ data: m }: Transfer) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID === "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID === "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountID === m.toAccountID) {
    throw new InvalidMessageError(
      "Transfer from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("Transfer must have a positive amount");
  }
}

function validateApproveTransfer({ data: m }: ApproveTransfer) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "ApproveTransfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID === "") {
    throw new InvalidMessageError(
      "ApproveTransfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID === "") {
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

function validateDeclineTransfer({ data: m }: DeclineTransfer) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID === "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID === "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty 'to' account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DeclineTransfer must have a positive amount",
    );
  }
  if (!Object.values(DebitFailureReason).includes(m.reason)) {
    throw new InvalidMessageError(
      `DeclineTransfer must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function validateMarkTransferAsFailed({ data: m }: MarkTransferAsFailed) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "MarkTransferAsFailed must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID === "") {
    throw new InvalidMessageError(
      "MarkTransferAsFailed must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID === "") {
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

function describeTransfer({ data: m }: Transfer) {
  return `transfer ${m.transactionID}: transferring ${formatAmount(m.amount)} from account ${m.fromAccountID} to account ${m.toAccountID}`;
}

function describeApproveTransfer({ data: m }: ApproveTransfer) {
  return `transfer ${m.transactionID}: approving transfer of ${formatAmount(m.amount)} from account ${m.fromAccountID} to account ${m.toAccountID}`;
}

function describeDeclineTransfer({ data: m }: DeclineTransfer) {
  return `transfer ${m.transactionID}: declining transfer of ${formatAmount(m.amount)} from account ${m.fromAccountID} to account ${m.toAccountID}: ${m.reason}`;
}

function describeMarkTransferAsFailed({ data: m }: MarkTransferAsFailed) {
  return `transfer ${m.transactionID}: failing transfer of ${formatAmount(m.amount)} from account ${m.fromAccountID} to account ${m.toAccountID}`;
}
