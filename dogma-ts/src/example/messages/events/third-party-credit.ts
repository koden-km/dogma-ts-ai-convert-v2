import {
  defineEvents,
  type Event,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";

export const EventName = {
  ThirdPartyAccountCredited: "ThirdPartyAccountCredited",
  ThirdPartyAccountCreditFailed: "ThirdPartyAccountCreditFailed",
} as const;

// ThirdPartyAccountCredited is an event indicating that the credit to a
// third-party bank account was completed successfully.
export type ThirdPartyAccountCredited = Event & {
  name: typeof EventName.ThirdPartyAccountCredited;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

// ThirdPartyAccountCreditFailed is an event indicating that the credit to a
// third-party bank account could not be completed.
export type ThirdPartyAccountCreditFailed = Event & {
  name: typeof EventName.ThirdPartyAccountCreditFailed;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

export type DomainEvent =
  | ThirdPartyAccountCredited
  | ThirdPartyAccountCreditFailed;

export const { messageCreators, messageValidators, messageDescribers } =
  defineEvents<DomainEvent>([
    [
      EventName.ThirdPartyAccountCredited,
      "a7f3c8e2-5d1b-4a9e-8c6f-3b2d0e7a1c5d",
      validateThirdPartyAccountCredited,
      describeThirdPartyAccountCredited,
    ],
    [
      EventName.ThirdPartyAccountCreditFailed,
      "e9b4d7f0-2c6a-4e8b-9d3f-1a5c0b8e4d2a",
      validateThirdPartyAccountCreditFailed,
      describeThirdPartyAccountCreditFailed,
    ],
  ]);

function validateThirdPartyAccountCredited({
  data: m,
}: ThirdPartyAccountCredited) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "ThirdPartyAccountCredited must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "ThirdPartyAccountCredited must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "ThirdPartyAccountCredited must have a positive amount",
    );
  }
}

function validateThirdPartyAccountCreditFailed({
  data: m,
}: ThirdPartyAccountCreditFailed) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "ThirdPartyAccountCreditFailed must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
    throw new InvalidMessageError(
      "ThirdPartyAccountCreditFailed must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "ThirdPartyAccountCreditFailed must have a positive amount",
    );
  }
}

function describeThirdPartyAccountCredited({
  data: m,
}: ThirdPartyAccountCredited) {
  return `transfer ${m.transactionID}: credited ${formatAmount(m.amount)} to third-party account ${m.accountID}`;
}

function describeThirdPartyAccountCreditFailed({
  data: m,
}: ThirdPartyAccountCreditFailed) {
  return `transfer ${m.transactionID}: failed to credit ${formatAmount(m.amount)} to third-party account ${m.accountID}`;
}
