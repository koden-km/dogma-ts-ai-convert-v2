import {
  type CommandValidationScope,
  createMessageCreator,
  createMessageDescriber,
  createMessageValidator,
  type MessageCreators,
  type MessageDescribers,
  type MessageValidators,
} from "@/dogma/message.ts";
import * as account from "./account.ts";
import * as dailyDebitLimit from "./daily-debit-limit.ts";
import * as deposit from "./deposit.ts";
import * as thirdPartyCredit from "./third-party-credit.ts";
import * as transfer from "./transfer.ts";
import * as withdrawal from "./withdrawal.ts";

export type {
  CreditAccount,
  DebitAccount,
  OpenAccount,
  OpenAccountForNewCustomer,
} from "./account.ts";
export type { ConsumeDailyDebitLimit } from "./daily-debit-limit.ts";
export type { ApproveDeposit, Deposit } from "./deposit.ts";
export type { CreditThirdPartyAccount } from "./third-party-credit.ts";
export type {
  ApproveTransfer,
  DeclineTransfer,
  MarkTransferAsFailed,
  Transfer,
} from "./transfer.ts";
export type {
  ApproveWithdrawal,
  DeclineWithdrawal,
  Withdraw,
} from "./withdrawal.ts";

export const CommandName = {
  ...account.CommandName,
  ...dailyDebitLimit.CommandName,
  ...deposit.CommandName,
  ...transfer.CommandName,
  ...withdrawal.CommandName,
  ...thirdPartyCredit.CommandName,
} as const;

export type DomainCommand =
  | account.DomainCommand
  | dailyDebitLimit.DomainCommand
  | deposit.DomainCommand
  | transfer.DomainCommand
  | withdrawal.DomainCommand
  | thirdPartyCredit.DomainCommand;

const messageCreators: MessageCreators<DomainCommand> = {
  ...account.messageCreators,
  ...dailyDebitLimit.messageCreators,
  ...deposit.messageCreators,
  ...transfer.messageCreators,
  ...withdrawal.messageCreators,
  ...thirdPartyCredit.messageCreators,
};

const messageValidators: MessageValidators<
  DomainCommand,
  CommandValidationScope
> = {
  ...account.messageValidators,
  ...dailyDebitLimit.messageValidators,
  ...deposit.messageValidators,
  ...transfer.messageValidators,
  ...withdrawal.messageValidators,
  ...thirdPartyCredit.messageValidators,
};

const messageDescribers: MessageDescribers<DomainCommand> = {
  ...account.messageDescribers,
  ...dailyDebitLimit.messageDescribers,
  ...deposit.messageDescribers,
  ...transfer.messageDescribers,
  ...withdrawal.messageDescribers,
  ...thirdPartyCredit.messageDescribers,
};

export const createCommand = createMessageCreator(messageCreators, "command");

export const validateCommand: (msg: DomainCommand) => void =
  createMessageValidator(messageValidators);

export const describeCommand: (msg: DomainCommand) => string =
  createMessageDescriber(messageDescribers);
