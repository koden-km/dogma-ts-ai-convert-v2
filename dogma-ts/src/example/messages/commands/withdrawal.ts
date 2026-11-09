import { InvalidMessageError, registerCommand } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  formatDebitFailureReason,
  isValidDebitFailureReason,
} from "../transaction.ts";
import {
  type ApproveWithdrawal,
  ApproveWithdrawalSchema,
  type DeclineWithdrawal,
  DeclineWithdrawalSchema,
  type Withdraw,
  WithdrawSchema,
} from "./withdrawal_pb.ts";

export {
  type ApproveWithdrawal,
  ApproveWithdrawalSchema,
  type DeclineWithdrawal,
  DeclineWithdrawalSchema,
  type Withdraw,
  WithdrawSchema,
};

export type DomainCommand = Withdraw | ApproveWithdrawal | DeclineWithdrawal;

registerCommand(WithdrawSchema, "5528ea57-2fa4-4ddd-ac96-3ec56ec89fce", {
  validate: validateWithdraw,
  describe: describeWithdraw,
  allowIdempotent: true,
});

registerCommand(
  ApproveWithdrawalSchema,
  "1023356f-f49c-4ea1-9244-83fdb3225da9",
  {
    validate: validateApproveWithdrawal,
    describe: describeApproveWithdrawal,
    allowIdempotent: true,
  },
);

registerCommand(
  DeclineWithdrawalSchema,
  "ee1e59ff-ed96-4d66-a1aa-f0a11ca8c47d",
  {
    validate: validateDeclineWithdrawal,
    describe: describeDeclineWithdrawal,
    allowIdempotent: true,
  },
);

function validateWithdraw(m: Withdraw) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "Withdraw must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError("Withdraw must not have an empty account ID");
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("Withdraw must have a positive amount");
  }
}

function validateApproveWithdrawal(m: ApproveWithdrawal) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "ApproveWithdrawal must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
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

function validateDeclineWithdrawal(m: DeclineWithdrawal) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "DeclineWithdrawal must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "DeclineWithdrawal must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DeclineWithdrawal must have a positive amount",
    );
  }
  if (!isValidDebitFailureReason(m.reason)) {
    throw new InvalidMessageError(
      `DeclineWithdrawal must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function describeWithdraw(m: Withdraw) {
  return `withdrawal ${m.transactionId}: withdrawing ${formatAmount(m.amount)} from account ${m.accountId}`;
}

function describeApproveWithdrawal(m: ApproveWithdrawal) {
  return `withdrawal ${m.transactionId}: approving withdrawal of ${formatAmount(m.amount)} from account ${m.accountId}`;
}

function describeDeclineWithdrawal(m: DeclineWithdrawal) {
  return `withdrawal ${m.transactionId}: declining withdrawal of ${formatAmount(m.amount)} from account ${m.accountId}: ${formatDebitFailureReason(m.reason)}`;
}
