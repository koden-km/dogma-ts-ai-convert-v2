import {
  type Command,
  defineCommands,
  InvalidMessageError,
} from "@/dogma/message.ts";
import { formatAmount } from "../format.ts";

export const CommandName = {
  CreditThirdPartyAccount: "CreditThirdPartyAccount",
} as const;

// CreditThirdPartyAccount is a command to credit an account held at a
// third-party bank.
export type CreditThirdPartyAccount = Command & {
  name: typeof CommandName.CreditThirdPartyAccount;
  data: {
    transactionID: string;
    accountID: string;
    amount: bigint;
  };
};

export type DomainCommand = CreditThirdPartyAccount;

export const { messageCreators, messageValidators, messageDescribers } =
  defineCommands<DomainCommand>([
    [
      CommandName.CreditThirdPartyAccount,
      "c4a2e6f1-8b3d-4e7a-9f5c-2d1b0e8a3c6f",
      validateCreditThirdPartyAccount,
      describeCreditThirdPartyAccount,
    ],
  ]);

function validateCreditThirdPartyAccount({
  data: m,
}: CreditThirdPartyAccount) {
  if (m.transactionID === "") {
    throw new InvalidMessageError(
      "CreditThirdPartyAccount must not have an empty transaction ID",
    );
  }
  if (m.accountID === "") {
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

function describeCreditThirdPartyAccount({
  data: m,
}: CreditThirdPartyAccount) {
  return `transfer ${m.transactionID}: crediting ${formatAmount(m.amount)} to third-party account ${m.accountID}`;
}
