import {
  defineEvents,
  type Event,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import { DebitFailureReason } from "../transaction.ts";

export const EventName = {
  WithdrawalStarted: "WithdrawalStarted",
  WithdrawalApproved: "WithdrawalApproved",
  WithdrawalDeclined: "WithdrawalDeclined",
} as const;

// WithdrawalStarted is an event indicating that the process of withdrawing
// funds from an account has begun.
export type WithdrawalStarted = Event & {
  name: typeof EventName.WithdrawalStarted;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
    scheduledTime: string | Date;
  };
};

// WithdrawalApproved is an event that indicates a requested withdrawal has been
// approved.
export type WithdrawalApproved = Event & {
  name: typeof EventName.WithdrawalApproved;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

// WithdrawalDeclined is an event that indicates a requested withdrawal has been
// declined.
export type WithdrawalDeclined = Event & {
  name: typeof EventName.WithdrawalDeclined;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
    reason: DebitFailureReason;
  };
};

export type DomainEvent =
  | WithdrawalStarted
  | WithdrawalApproved
  | WithdrawalDeclined;

export const { messageCreators, messageValidators, messageDescribers } =
  defineEvents<DomainEvent>([
    [
      EventName.WithdrawalStarted,
      "ae327c68-3de9-4fe1-aa39-c4830200602c",
      validateWithdrawalStarted,
      describeWithdrawalStarted,
    ],
    [
      EventName.WithdrawalApproved,
      "8551621a-ef28-42aa-b815-d5a448299d38",
      validateWithdrawalApproved,
      describeWithdrawalApproved,
    ],
    [
      EventName.WithdrawalDeclined,
      "a87f5f6f-52ec-4eeb-954f-2af97a165181",
      validateWithdrawalDeclined,
      describeWithdrawalDeclined,
    ],
  ]);

function validateWithdrawalStarted({ data: m }: WithdrawalStarted) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "WithdrawalStarted must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
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

function validateWithdrawalApproved({ data: m }: WithdrawalApproved) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "WithdrawalApproved must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
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

function validateWithdrawalDeclined({ data: m }: WithdrawalDeclined) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "WithdrawalDeclined must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "WithdrawalDeclined must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "WithdrawalDeclined must have a positive amount",
    );
  }
  if (!Object.values(DebitFailureReason).includes(m.reason)) {
    throw new InvalidMessageError(
      `WithdrawalDeclined must have a valid reason: invalid debit failure reason: ${String(m.reason)}`,
    );
  }
}

function describeWithdrawalStarted({ data: m }: WithdrawalStarted) {
  return `withdrawal ${m.transactionID}: started withdrawal of ${formatAmount(m.amount)} from account ${m.accountID}`;
}

function describeWithdrawalApproved({ data: m }: WithdrawalApproved) {
  return `withdrawal ${m.transactionID}: approved withdrawal of ${formatAmount(m.amount)} from account ${m.accountID}`;
}

function describeWithdrawalDeclined({ data: m }: WithdrawalDeclined) {
  return `withdrawal ${m.transactionID}: declined withdrawal of ${formatAmount(m.amount)} from account ${m.accountID}: ${m.reason}`;
}
