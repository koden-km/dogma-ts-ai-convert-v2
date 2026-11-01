import {
  type Command,
  defineCommands,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";

export const CommandName = {
  Deposit: "Deposit",
  ApproveDeposit: "ApproveDeposit",
} as const;

// Deposit is a command requesting that funds be deposited into a bank account.
export type Deposit = Command & {
  name: typeof CommandName.Deposit;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

// ApproveDeposit is a command that approves an account deposit.
export type ApproveDeposit = Command & {
  name: typeof CommandName.ApproveDeposit;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

export type DomainCommand = Deposit | ApproveDeposit;

export const { messageCreators, messageValidators, messageDescribers } =
  defineCommands<DomainCommand>([
    [
      CommandName.Deposit,
      "0cfac865-a1d9-4fd2-b085-f8fce0053795",
      validateDeposit,
      describeDeposit,
    ],
    [
      CommandName.ApproveDeposit,
      "6cd5ee09-b59d-45ef-a8ed-91cb1bb6940a",
      validateApproveDeposit,
      describeApproveDeposit,
    ],
  ]);

function validateDeposit({ data: m }: Deposit) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "Deposit must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError("Deposit must not have an empty account ID");
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("Deposit must have a positive amount");
  }
}

function validateApproveDeposit({ data: m }: ApproveDeposit) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "ApproveDeposit must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "ApproveDeposit must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("ApproveDeposit must have a positive amount");
  }
}

function describeDeposit({ data: m }: Deposit) {
  return `deposit ${m.transactionID}: depositing ${formatAmount(m.amount)} into account ${m.accountID}`;
}

function describeApproveDeposit({ data: m }: ApproveDeposit) {
  return `deposit ${m.transactionID}: approving deposit of ${formatAmount(m.amount)} into account ${m.accountID}`;
}
