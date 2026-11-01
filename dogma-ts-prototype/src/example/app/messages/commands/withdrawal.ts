import {
  Command,
  InvalidMessageError,
  defineCommands,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import { DebitFailureReason } from "../transaction.ts";

export const CommandName = {
  Withdraw: "Withdraw",
  ApproveWithdrawal: "ApproveWithdrawal",
  DeclineWithdrawal: "DeclineWithdrawal",
} as const;

// Withdraw is a command requesting that funds be withdrawn from a bank account.
export type Withdraw = Command & {
  name: typeof CommandName.Withdraw;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
    scheduledTime: string; // ISO date string
  };
};

// ApproveWithdrawal is a command that approves an account withdrawal.
export type ApproveWithdrawal = Command & {
  name: typeof CommandName.ApproveWithdrawal;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

// DeclineWithdrawal is a command that rejects an account withdrawal.
export type DeclineWithdrawal = Command & {
  name: typeof CommandName.DeclineWithdrawal;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
    reason: DebitFailureReason;
  };
};

export type DomainCommand = Withdraw | ApproveWithdrawal | DeclineWithdrawal;

export const { messageCreators, messageValidators, messageDescribers } =
  defineCommands<DomainCommand>([
    [CommandName.Withdraw, validateWithdraw, describeWithdraw],
    [
      CommandName.ApproveWithdrawal,
      validateApproveWithdrawal,
      describeApproveWithdrawal,
    ],
    [
      CommandName.DeclineWithdrawal,
      validateDeclineWithdrawal,
      describeDeclineWithdrawal,
    ],
  ]);

function validateWithdraw({ data: m }: Withdraw) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "Withdraw must not have an empty transaction ID",
    );
  }
  if (m.accountID == "") {
    throw new InvalidMessageError("Withdraw must not have an empty account ID");
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("Withdraw must have a positive amount");
  }
}

function validateApproveWithdrawal({ data: m }: ApproveWithdrawal) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "ApproveWithdrawal must not have an empty transaction ID",
    );
  }
  if (m.accountID == "") {
    throw new InvalidMessageError(
      "ApproveWithdrawal must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "ApproveWithdrawal must have a positive amount",
    );
  }
}

function validateDeclineWithdrawal({ data: m }: DeclineWithdrawal) {
  if (m.transactionID == "") {
    throw new InvalidMessageError(
      "DeclineWithdrawal must not have an empty transaction ID",
    );
  }
  if (m.accountID == "") {
    throw new InvalidMessageError(
      "DeclineWithdrawal must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DeclineWithdrawal must have a positive amount",
    );
  }
  if (!Object.values(DebitFailureReason).includes(m.reason)) {
    throw new InvalidMessageError(
      `DeclineWithdrawal must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function describeWithdraw({ data: m }: Withdraw) {
  return `withdrawal ${m.transactionID}: withdrawing ${formatAmount(m.amount)} from account ${m.accountID}`;
}

function describeApproveWithdrawal({ data: m }: ApproveWithdrawal) {
  return `withdrawal ${m.transactionID}: approving withdrawal of ${formatAmount(m.amount)} from account ${m.accountID}`;
}

function describeDeclineWithdrawal({ data: m }: DeclineWithdrawal) {
  return `withdrawal ${m.transactionID}: declining withdrawal of ${formatAmount(m.amount)} from account ${m.accountID}: ${m.reason}`;
}
