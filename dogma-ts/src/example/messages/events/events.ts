import {
  createMessageCreator,
  createMessageDescriber,
  createMessageValidator,
  type EventValidationScope,
  type MessageCreators,
  type MessageDescribers,
  type MessageValidators,
} from "@/dogma/message.ts";
import * as account from "./account.ts";
import * as customer from "./customer.ts";
import * as dailyDebitLimit from "./dailydebitlimit.ts";
import * as deposit from "./deposit.ts";
import * as thirdPartyCredit from "./third-party-credit.ts";
import * as transfer from "./transfer.ts";
import * as withdrawal from "./withdrawal.ts";

export type {
  AccountCredited,
  AccountDebitDeclined,
  AccountDebited,
  AccountOpened,
} from "./account.ts";
export type { CustomerAcquired } from "./customer.ts";
export type {
  DailyDebitLimitConsumed,
  DailyDebitLimitExceeded,
} from "./dailydebitlimit.ts";
export type { DepositApproved, DepositStarted } from "./deposit.ts";
export type {
  ThirdPartyAccountCredited,
  ThirdPartyAccountCreditFailed,
} from "./third-party-credit.ts";
export type {
  TransferApproved,
  TransferDeclined,
  TransferFailed,
  TransferStarted,
} from "./transfer.ts";
export type {
  WithdrawalApproved,
  WithdrawalDeclined,
  WithdrawalStarted,
} from "./withdrawal.ts";

export const EventName = {
  ...account.EventName,
  ...customer.EventName,
  ...dailyDebitLimit.EventName,
  ...deposit.EventName,
  ...transfer.EventName,
  ...withdrawal.EventName,
  ...thirdPartyCredit.EventName,
} as const;

export type DomainEvent =
  | account.DomainEvent
  | customer.DomainEvent
  | dailyDebitLimit.DomainEvent
  | deposit.DomainEvent
  | transfer.DomainEvent
  | withdrawal.DomainEvent
  | thirdPartyCredit.DomainEvent;

const messageCreators: MessageCreators<DomainEvent> = {
  ...account.messageCreators,
  ...customer.messageCreators,
  ...dailyDebitLimit.messageCreators,
  ...deposit.messageCreators,
  ...transfer.messageCreators,
  ...withdrawal.messageCreators,
  ...thirdPartyCredit.messageCreators,
};

const messageValidators: MessageValidators<DomainEvent, EventValidationScope> =
  {
  ...account.messageValidators,
  ...customer.messageValidators,
  ...dailyDebitLimit.messageValidators,
  ...deposit.messageValidators,
  ...transfer.messageValidators,
  ...withdrawal.messageValidators,
  ...thirdPartyCredit.messageValidators,
};

const messageDescribers: MessageDescribers<DomainEvent> = {
  ...account.messageDescribers,
  ...customer.messageDescribers,
  ...dailyDebitLimit.messageDescribers,
  ...deposit.messageDescribers,
  ...transfer.messageDescribers,
  ...withdrawal.messageDescribers,
  ...thirdPartyCredit.messageDescribers,
};

export const createEvent = createMessageCreator(messageCreators, "event");

export const validateEvent: (msg: DomainEvent) => void =
  createMessageValidator(messageValidators);

export const describeEvent: (msg: DomainEvent) => string =
  createMessageDescriber(messageDescribers);
