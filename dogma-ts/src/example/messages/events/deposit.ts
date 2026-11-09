import { InvalidMessageError, registerEvent } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  type DepositApproved as DepositApprovedMessage,
  DepositApprovedSchema,
  type DepositStarted as DepositStartedMessage,
  DepositStartedSchema,
} from "./deposit_pb.ts";

export type DepositStarted = DepositStartedMessage;
export const DepositStarted = DepositStartedSchema;

export type DepositApproved = DepositApprovedMessage;
export const DepositApproved = DepositApprovedSchema;

export type DomainEvent = DepositStarted | DepositApproved;

registerEvent(DepositStarted, "699ae4e6-ea0a-4450-8a04-8ec5248b8042", {
  validate: validateDepositStarted,
  describe: describeDepositStarted,
  allowIdempotent: true,
});

registerEvent(
  DepositApproved,
  "8520d995-5c0e-4905-9bbf-99b5f8028505",
  {
    validate: validateDepositApproved,
    describe: describeDepositApproved,
    allowIdempotent: true,
  },
);

function validateDepositStarted(m: DepositStarted) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "DepositStarted must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "DepositStarted must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("DepositStarted must have a positive amount");
  }
}

function validateDepositApproved(m: DepositApproved) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "DepositApproved must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "DepositApproved must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "DepositApproved must have a positive amount",
    );
  }
}

function describeDepositStarted(m: DepositStarted) {
  return `deposit ${m.transactionId}: started deposit of ${formatAmount(m.amount)} into account ${m.accountId}`;
}

function describeDepositApproved(m: DepositApproved) {
  return `deposit ${m.transactionId}: approved deposit of ${formatAmount(m.amount)} into account ${m.accountId}`;
}
