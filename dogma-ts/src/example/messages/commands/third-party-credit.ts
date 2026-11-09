import { InvalidMessageError, registerCommand } from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";
import {
  type CreditThirdPartyAccount,
  CreditThirdPartyAccountSchema,
} from "./third-party-credit_pb.ts";

export { type CreditThirdPartyAccount, CreditThirdPartyAccountSchema };

export type DomainCommand = CreditThirdPartyAccount;

registerCommand(
  CreditThirdPartyAccountSchema,
  "c4a2e6f1-8b3d-4e7a-9f5c-2d1b0e8a3c6f",
  {
    validate: validateCreditThirdPartyAccount,
    describe: describeCreditThirdPartyAccount,
    allowIdempotent: true,
  },
);

function validateCreditThirdPartyAccount(m: CreditThirdPartyAccount) {
  if (m.transactionId === "") {
    throw new InvalidMessageError(
      "CreditThirdPartyAccount must not have an empty transaction ID",
    );
  }
  if (m.accountId === "") {
    throw new InvalidMessageError(
      "CreditThirdPartyAccount must not have an empty account ID",
    );
  }
  if (m.amount < 1n) {
    throw new InvalidMessageError(
      "CreditThirdPartyAccount must have a positive amount",
    );
  }
}

function describeCreditThirdPartyAccount(m: CreditThirdPartyAccount) {
  return `transfer ${m.transactionId}: crediting ${formatAmount(m.amount)} to third-party account ${m.accountId}`;
}
