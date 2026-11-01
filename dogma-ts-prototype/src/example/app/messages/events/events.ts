import {
  createMessageCreator,
  createMessageDescriber,
  createMessageValidator,
  MessageCreators,
  MessageDescribers,
  MessageValidators,
} from "@/dogma/message.ts";
import * as account from "./account.ts";
import * as customer from "./customer.ts";
import * as dailyDebitLimit from "./dailydebitlimit.ts";
import * as deposit from "./deposit.ts";
import * as transfer from "./transfer.ts";
import * as withdrawal from "./withdrawal.ts";

export const EventName = {
  ...account.EventName,
  ...customer.EventName,
  ...dailyDebitLimit.EventName,
  ...deposit.EventName,
  ...transfer.EventName,
  ...withdrawal.EventName,
};

export type DomainEvent =
  | account.DomainEvent
  | customer.DomainEvent
  | dailyDebitLimit.DomainEvent
  | deposit.DomainEvent
  | transfer.DomainEvent
  | withdrawal.DomainEvent;

const messageCreators: MessageCreators<DomainEvent> = {
  ...account.messageCreators,
  ...customer.messageCreators,
  ...dailyDebitLimit.messageCreators,
  ...deposit.messageCreators,
  ...transfer.messageCreators,
  ...withdrawal.messageCreators,
};

const messageValidators: MessageValidators<DomainEvent> = {
  ...account.messageValidators,
  ...customer.messageValidators,
  ...dailyDebitLimit.messageValidators,
  ...deposit.messageValidators,
  ...transfer.messageValidators,
  ...withdrawal.messageValidators,
};

const messageDescribers: MessageDescribers<DomainEvent> = {
  ...account.messageDescribers,
  ...customer.messageDescribers,
  ...dailyDebitLimit.messageDescribers,
  ...deposit.messageDescribers,
  ...transfer.messageDescribers,
  ...withdrawal.messageDescribers,
};

export const createEvent = createMessageCreator(messageCreators, "event");

export const validateEvent: (msg: DomainEvent) => void =
  createMessageValidator(messageValidators);

export const describeEvent: (msg: DomainEvent) => string =
  createMessageDescriber(messageDescribers);
