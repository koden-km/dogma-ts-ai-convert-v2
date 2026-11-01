import {
  createMessageCreator,
  createMessageDescriber,
  createMessageValidator,
  MessageCreators,
  MessageDescribers,
  MessageValidators,
} from "@/dogma/message.ts";
import * as account from "./account.ts";
import * as dailyDebitLimit from "./daily-debit-limit.ts";
import * as deposit from "./deposit.ts";
import * as transfer from "./transfer.ts";
import * as withdrawal from "./withdrawal.ts";

export const CommandName = {
  ...account.CommandName,
  ...dailyDebitLimit.CommandName,
  ...deposit.CommandName,
  ...transfer.CommandName,
  ...withdrawal.CommandName,
};

export type DomainCommand =
  | account.DomainCommand
  | dailyDebitLimit.DomainCommand
  | deposit.DomainCommand
  | transfer.DomainCommand
  | withdrawal.DomainCommand;

const messageCreators: MessageCreators<DomainCommand> = {
  ...account.messageCreators,
  ...dailyDebitLimit.messageCreators,
  ...deposit.messageCreators,
  ...transfer.messageCreators,
  ...withdrawal.messageCreators,
};

const messageValidators: MessageValidators<DomainCommand> = {
  ...account.messageValidators,
  ...dailyDebitLimit.messageValidators,
  ...deposit.messageValidators,
  ...transfer.messageValidators,
  ...withdrawal.messageValidators,
};

const messageDescribers: MessageDescribers<DomainCommand> = {
  ...account.messageDescribers,
  ...dailyDebitLimit.messageDescribers,
  ...deposit.messageDescribers,
  ...transfer.messageDescribers,
  ...withdrawal.messageDescribers,
};

export const createCommand = createMessageCreator(messageCreators, "command");

export const validateCommand: (msg: DomainCommand) => void =
  createMessageValidator(messageValidators);

export const describeCommand: (msg: DomainCommand) => string =
  createMessageDescriber(messageDescribers);
