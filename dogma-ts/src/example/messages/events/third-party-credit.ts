import { InvalidMessageError, registerEvent } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  type ThirdPartyAccountCredited,
  ThirdPartyAccountCreditedSchema,
  type ThirdPartyAccountCreditFailed,
  ThirdPartyAccountCreditFailedSchema,
} from "./third-party-credit_pb.ts";

export {
  type ThirdPartyAccountCredited,
  ThirdPartyAccountCreditedSchema,
  type ThirdPartyAccountCreditFailed,
  ThirdPartyAccountCreditFailedSchema,
};

export type DomainEvent =
  | ThirdPartyAccountCredited
  | ThirdPartyAccountCreditFailed;

registerEvent(
  ThirdPartyAccountCreditedSchema,
  "a7f3c8e2-5d1b-4a9e-8c6f-3b2d0e7a1c5d",
  {
    validate: validateThirdPartyAccountCredited,
    describe: describeThirdPartyAccountCredited,
    allowIdempotent: true,
  },
);

registerEvent(
  ThirdPartyAccountCreditFailedSchema,
  "e9b4d7f0-2c6a-4e8b-9d3f-1a5c0b8e4d2a",
  {
    validate: validateThirdPartyAccountCreditFailed,
    describe: describeThirdPartyAccountCreditFailed,
    allowIdempotent: true,
  },
);

function validateThirdPartyAccountCredited(m: ThirdPartyAccountCredited) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "ThirdPartyAccountCredited must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
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

function validateThirdPartyAccountCreditFailed(
  m: ThirdPartyAccountCreditFailed,
) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "ThirdPartyAccountCreditFailed must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
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

function describeThirdPartyAccountCredited(m: ThirdPartyAccountCredited) {
  return `transfer ${m.transactionId}: credited ${formatAmount(m.amount)} to third-party account ${m.accountId}`;
}

function describeThirdPartyAccountCreditFailed(
  m: ThirdPartyAccountCreditFailed,
) {
  return `transfer ${m.transactionId}: failed to credit ${formatAmount(m.amount)} to third-party account ${m.accountId}`;
}
