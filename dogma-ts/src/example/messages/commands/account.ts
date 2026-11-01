import {
  type Command,
  defineCommands,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { isValidTransactionType, type TransactionType } from "../transaction.ts";

export const CommandName = {
  OpenAccountForNewCustomer: "OpenAccountForNewCustomer",
  OpenAccount: "OpenAccount",
  CreditAccount: "CreditAccount",
  DebitAccount: "DebitAccount",
} as const;

// OpenAccountForNewCustomer is a command requesting that a new bank account be
// opened for a new customer.
export type OpenAccountForNewCustomer = Command & {
  name: typeof CommandName.OpenAccountForNewCustomer;
  data: {
    customerID: string;
    customerName: string;
    accountID: string;
    accountName: string;
  };
};

// OpenAccount is a command requesting that a new bank account be opened for an
// existing customer.
export type OpenAccount = Command & {
  name: typeof CommandName.OpenAccount;
  data: {
    customerID: string;
    accountID: string;
    accountName: string;
  };
};

// CreditAccount is a command that requests a bank account be credited.
export type CreditAccount = Command & {
  name: typeof CommandName.CreditAccount;
  data: {
    transactionID: string;
    accountID: string;
    transactionType: TransactionType;
    amount: bigint;
  };
};

// DebitAccount is a command that requests a bank account be debited.
export type DebitAccount = Command & {
  name: typeof CommandName.DebitAccount;
  data: {
    transactionID: string;
    accountID: string;
    transactionType: TransactionType;
    amount: bigint;
    scheduledTime: string | Date;
  };
};

export type DomainCommand =
  | OpenAccountForNewCustomer
  | OpenAccount
  | CreditAccount
  | DebitAccount;

export const { messageCreators, messageValidators, messageDescribers } =
  defineCommands<DomainCommand>([
    [
      CommandName.OpenAccountForNewCustomer,
      "209ed1ad-4394-4c1a-b36f-7b24fc8b1d1b",
      validateOpenAccountForNewCustomer,
      describeOpenAccountForNewCustomer,
    ],
    [
      CommandName.OpenAccount,
      "3d20299c-ba57-4756-8692-f4e3a95fe00d",
      validateOpenAccount,
      describeOpenAccount,
    ],
    [
      CommandName.CreditAccount,
      "0ffb0a54-eaf5-459c-a58b-76f22b95de2d",
      validateCreditAccount,
      describeCreditAccount,
    ],
    [
      CommandName.DebitAccount,
      "4209ab99-5f15-45b9-a88f-48bce219b911",
      validateDebitAccount,
      describeDebitAccount,
    ],
  ]);

function validateOpenAccountForNewCustomer({
  data: m,
}: OpenAccountForNewCustomer) {
  if (m.customerID === "") {
    throw new InvalidMessageError(
      "OpenAccountForNewCustomer must not have an empty customer ID",
    );
  }
  if (m.customerName === "") {
    throw new InvalidMessageError(
      "OpenAccountForNewCustomer must not have an empty customer name",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "OpenAccountForNewCustomer must not have an empty account ID",
    );
  }
  if (m.accountName === "") {
    throw new InvalidMessageError(
      "OpenAccountForNewCustomer must not have an empty account name",
    );
  }
}

function validateOpenAccount({ data: m }: OpenAccount) {
  if (m.customerID === "") {
    throw new InvalidMessageError(
      "OpenAccount must not have an empty customer ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "OpenAccount must not have an empty account ID",
    );
  }
  if (m.accountName === "") {
    throw new InvalidMessageError(
      "OpenAccount must not have an empty account name",
    );
  }
}

function validateCreditAccount({ data: m }: CreditAccount) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "CreditAccount must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "CreditAccount must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.transactionType)) {
    throw new InvalidMessageError(
      `CreditAccount must have a valid transaction type: ${m.transactionType}`,
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("CreditAccount must have a positive amount");
  }
}

function validateDebitAccount({ data: m }: DebitAccount) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "DebitAccount must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "DebitAccount must not have an empty account ID",
    );
  }
  if (!isValidTransactionType(m.transactionType)) {
    throw new InvalidMessageError(
      `DebitAccount must have a valid transaction type: ${m.transactionType}`,
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("DebitAccount must have a positive amount");
  }
}

function describeOpenAccountForNewCustomer({
  data: m,
}: OpenAccountForNewCustomer) {
  return `customer ${m.customerID} ${m.customerName} is opening their first account ${m.accountID} ${m.accountName}`;
}

function describeOpenAccount({ data: m }: OpenAccount) {
  return `opening account ${m.accountID} ${m.accountName} for customer ${m.customerID}`;
}

function describeCreditAccount({ data: m }: CreditAccount) {
  return `${m.transactionType} ${m.transactionID}: crediting ${m.amount} to account ${m.accountID}`;
}

function describeDebitAccount({ data: m }: DebitAccount) {
  return `${m.transactionType} ${m.transactionID}: debiting ${m.amount} from account ${m.accountID}`;
}
