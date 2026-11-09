import { InvalidMessageError, registerCommand } from "@/dogma/message.ts";
import {
  formatTransactionType,
  isValidTransactionType,
} from "../transaction.ts";
import {
  type CreditAccount,
  CreditAccountSchema,
  type DebitAccount,
  DebitAccountSchema,
  type OpenAccount,
  type OpenAccountForNewCustomer,
  OpenAccountForNewCustomerSchema,
  OpenAccountSchema,
} from "./account_pb.ts";

export {
  type CreditAccount,
  CreditAccountSchema,
  type DebitAccount,
  DebitAccountSchema,
  type OpenAccount,
  type OpenAccountForNewCustomer,
  OpenAccountForNewCustomerSchema,
  OpenAccountSchema,
};

export type DomainCommand =
  | OpenAccountForNewCustomer
  | OpenAccount
  | CreditAccount
  | DebitAccount;

registerCommand(
  OpenAccountForNewCustomerSchema,
  "209ed1ad-4394-4c1a-b36f-7b24fc8b1d1b",
  {
    validate: validateOpenAccountForNewCustomer,
    describe: describeOpenAccountForNewCustomer,
    allowIdempotent: true,
  },
);

registerCommand(OpenAccountSchema, "3d20299c-ba57-4756-8692-f4e3a95fe00d", {
  validate: validateOpenAccount,
  describe: describeOpenAccount,
  allowIdempotent: true,
});

registerCommand(CreditAccountSchema, "0ffb0a54-eaf5-459c-a58b-76f22b95de2d", {
  validate: validateCreditAccount,
  describe: describeCreditAccount,
  allowIdempotent: true,
});

registerCommand(DebitAccountSchema, "4209ab99-5f15-45b9-a88f-48bce219b911", {
  validate: validateDebitAccount,
  describe: describeDebitAccount,
  allowIdempotent: true,
});

function validateOpenAccountForNewCustomer(m: OpenAccountForNewCustomer) {
  if (m.customerId === "") {
    throw new InvalidMessageError(
      "OpenAccountForNewCustomer must not have an empty customer ID",
    );
  }
  if (m.customerName === "") {
    throw new InvalidMessageError(
      "OpenAccountForNewCustomer must not have an empty customer name",
    );
  }
  if (m.accountId === "") {
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

function validateOpenAccount(m: OpenAccount) {
  if (m.customerId === "") {
    throw new InvalidMessageError(
      "OpenAccount must not have an empty customer ID",
    );
  }
  if (m.accountId === "") {
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

function validateCreditAccount(m: CreditAccount) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "CreditAccount must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
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

function validateDebitAccount(m: DebitAccount) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "DebitAccount must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
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

function describeOpenAccountForNewCustomer(m: OpenAccountForNewCustomer) {
  return `customer ${m.customerId} ${m.customerName} is opening their first account ${m.accountId} ${m.accountName}`;
}

function describeOpenAccount(m: OpenAccount) {
  return `opening account ${m.accountId} ${m.accountName} for customer ${m.customerId}`;
}

function describeCreditAccount(m: CreditAccount) {
  return `${formatTransactionType(m.transactionType)} ${m.transactionId}: crediting ${m.amount} to account ${m.accountId}`;
}

function describeDebitAccount(m: DebitAccount) {
  return `${formatTransactionType(m.transactionType)} ${m.transactionId}: debiting ${m.amount} from account ${m.accountId}`;
}
