import {
  defineEvents,
  type Event,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";

export const EventName = {
  DepositStarted: "DepositStarted",
  DepositApproved: "DepositApproved",
} as const;

// DepositStarted is an event indicating that the process of depositing funds
// into an account has begun.
export type DepositStarted = Event & {
  name: typeof EventName.DepositStarted;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

// DepositApproved is an event that indicates a requested deposit has been
// approved.
export type DepositApproved = Event & {
  name: typeof EventName.DepositApproved;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

export type DomainEvent = DepositStarted | DepositApproved;

export const { messageCreators, messageValidators, messageDescribers } =
  defineEvents<DomainEvent>([
    [
      EventName.DepositStarted,
      "699ae4e6-ea0a-4450-8a04-8ec5248b8042",
      validateDepositStarted,
      describeDepositStarted,
    ],
    [
      EventName.DepositApproved,
      "8520d995-5c0e-4905-9bbf-99b5f8028505",
      validateDepositApproved,
      describeDepositApproved,
    ],
  ]);

function validateDepositStarted({ data: m }: DepositStarted) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "DepositStarted must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "DepositStarted must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError("DepositStarted must have a positive amount");
  }
}

function validateDepositApproved({ data: m }: DepositApproved) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "DepositApproved must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
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

function describeDepositStarted({ data: m }: DepositStarted) {
  return `deposit ${m.transactionID}: started deposit of ${formatAmount(m.amount)} into account ${m.accountID}`;
}

function describeDepositApproved({ data: m }: DepositApproved) {
  return `deposit ${m.transactionID}: approved deposit of ${formatAmount(m.amount)} into account ${m.accountID}`;
}
