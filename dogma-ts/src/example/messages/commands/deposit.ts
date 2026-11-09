import { InvalidMessageError, registerCommand } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  type ApproveDeposit,
  ApproveDepositSchema,
  type Deposit,
  DepositSchema,
} from "./deposit_pb.ts";

export {
  type ApproveDeposit,
  ApproveDepositSchema,
  type Deposit,
  DepositSchema,
};

export type DomainCommand = Deposit | ApproveDeposit;

registerCommand(DepositSchema, "0cfac865-a1d9-4fd2-b085-f8fce0053795", {
  validate: validateDeposit,
  describe: describeDeposit,
  allowIdempotent: true,
});

registerCommand(ApproveDepositSchema, "6cd5ee09-b59d-45ef-a8ed-91cb1bb6940a", {
  validate: validateApproveDeposit,
  describe: describeApproveDeposit,
  allowIdempotent: true,
});

function validateDeposit(m: Deposit) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "Deposit must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError("Deposit must not have an empty account ID");
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("Deposit must have a positive amount");
  }
}

function validateApproveDeposit(m: ApproveDeposit) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "ApproveDeposit must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "ApproveDeposit must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("ApproveDeposit must have a positive amount");
  }
}

function describeDeposit(m: Deposit) {
  return `deposit ${m.transactionId}: depositing ${formatAmount(m.amount)} into account ${m.accountId}`;
}

function describeApproveDeposit(m: ApproveDeposit) {
  return `deposit ${m.transactionId}: approving deposit of ${formatAmount(m.amount)} into account ${m.accountId}`;
}
