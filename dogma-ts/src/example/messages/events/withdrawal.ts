import { InvalidMessageError, registerEvent } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  formatDebitFailureReason,
  isValidDebitFailureReason,
} from "../transaction.ts";
import {
  type WithdrawalApproved as WithdrawalApprovedMessage,
  WithdrawalApprovedSchema,
  type WithdrawalDeclined as WithdrawalDeclinedMessage,
  WithdrawalDeclinedSchema,
  type WithdrawalStarted as WithdrawalStartedMessage,
  WithdrawalStartedSchema,
} from "./withdrawal_pb.ts";

export type WithdrawalStarted = WithdrawalStartedMessage;
export const WithdrawalStarted = WithdrawalStartedSchema;

export type WithdrawalApproved = WithdrawalApprovedMessage;
export const WithdrawalApproved = WithdrawalApprovedSchema;

export type WithdrawalDeclined = WithdrawalDeclinedMessage;
export const WithdrawalDeclined = WithdrawalDeclinedSchema;

export type DomainEvent =
  | WithdrawalStarted
  | WithdrawalApproved
  | WithdrawalDeclined;

registerEvent(
  WithdrawalStarted,
  "ae327c68-3de9-4fe1-aa39-c4830200602c",
  {
    validate: validateWithdrawalStarted,
    describe: describeWithdrawalStarted,
    allowIdempotent: true,
  },
);

registerEvent(
  WithdrawalApproved,
  "8551621a-ef28-42aa-b815-d5a448299d38",
  {
    validate: validateWithdrawalApproved,
    describe: describeWithdrawalApproved,
    allowIdempotent: true,
  },
);

registerEvent(
  WithdrawalDeclined,
  "a87f5f6f-52ec-4eeb-954f-2af97a165181",
  {
    validate: validateWithdrawalDeclined,
    describe: describeWithdrawalDeclined,
    allowIdempotent: true,
  },
);

function validateWithdrawalStarted(m: WithdrawalStarted) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "WithdrawalStarted must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "WithdrawalStarted must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "WithdrawalStarted must have a positive amount",
    );
  }
}

function validateWithdrawalApproved(m: WithdrawalApproved) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "WithdrawalApproved must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "WithdrawalApproved must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "WithdrawalApproved must have a positive amount",
    );
  }
}

function validateWithdrawalDeclined(m: WithdrawalDeclined) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "WithdrawalDeclined must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "WithdrawalDeclined must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "WithdrawalDeclined must have a positive amount",
    );
  }
  if (!isValidDebitFailureReason(m.reason)) {
    throw new InvalidMessageError(
      `WithdrawalDeclined must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function describeWithdrawalStarted(m: WithdrawalStarted) {
  return `withdrawal ${m.transactionId}: started withdrawal of ${formatAmount(m.amount)} from account ${m.accountId}`;
}

function describeWithdrawalApproved(m: WithdrawalApproved) {
  return `withdrawal ${m.transactionId}: approved withdrawal of ${formatAmount(m.amount)} from account ${m.accountId}`;
}

function describeWithdrawalDeclined(m: WithdrawalDeclined) {
  return `withdrawal ${m.transactionId}: declined withdrawal of ${formatAmount(m.amount)} from account ${m.accountId}: ${formatDebitFailureReason(m.reason)}`;
}
