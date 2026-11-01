import {
  Command,
  InvalidMessageError,
  defineCommands,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";

export const CommandName = {
  Transfer: "Transfer",
  ApproveTransfer: "ApproveTransfer",
  DeclineTransfer: "DeclineTransfer",
} as const;

// Transfer is a command requesting that funds be transferred from one bank
// account to another.
export type Transfer = Command & {
  name: typeof CommandName.Transfer;
  data: {
    transactionID: string;
    fromAccountID: string;
    toAccountID: string;
    amount: bigint;
    scheduledTime: string; // ISO date string
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
    reason: string;
  };
};

export type DomainCommand = Transfer | ApproveTransfer | DeclineTransfer;

export const { messageCreators, messageValidators, messageDescribers } =
  defineCommands<DomainCommand>([
    [CommandName.Transfer, validateTransfer, describeTransfer],
    [
      CommandName.ApproveTransfer,
      validateApproveTransfer,
      describeApproveTransfer,
    ],
    [
      CommandName.DeclineTransfer,
      validateDeclineTransfer,
      describeDeclineTransfer,
    ],
  ]);

function validateTransfer({ data: m }: Transfer) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID == "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID == "") {
    throw new InvalidMessageError(
      "Transfer must not have an empty 'to' account ID",
    );
  }
  if (m.fromAccountID == m.toAccountID) {
    throw new InvalidMessageError(
      "Transfer from account ID and to account ID must be different",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("Transfer must have a positive amount");
  }
}

function validateApproveTransfer({ data: m }: ApproveTransfer) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "ApproveTransfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID == "") {
    throw new InvalidMessageError(
      "ApproveTransfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID == "") {
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
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty transaction ID",
    );
  }
  if (m.fromAccountID == "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty 'from' account ID",
    );
  }
  if (m.toAccountID == "") {
    throw new InvalidMessageError(
      "DeclineTransfer must not have an empty 'to' account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DeclineTransfer must have a positive amount",
    );
  }
  if (m.reason == "") {
    throw new InvalidMessageError("DeclineTransfer must have a valid reason");
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
