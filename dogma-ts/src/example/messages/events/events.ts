import {
  describeMessage,
  type EventValidationScope,
  validateMessage,
} from "@/dogma/message.ts";
import * as account from "./account.ts";
import * as customer from "./customer.ts";
import * as dailyDebitLimit from "./dailydebitlimit.ts";
import * as deposit from "./deposit.ts";
import * as thirdPartyCredit from "./third-party-credit.ts";
import * as transfer from "./transfer.ts";
import * as withdrawal from "./withdrawal.ts";

export {
  AccountCredited,
  AccountDebitDeclined,
  AccountDebited,
  AccountOpened,
} from "./account.ts";
export { CustomerAcquired } from "./customer.ts";
export {
  DailyDebitLimitConsumed,
  DailyDebitLimitExceeded,
} from "./dailydebitlimit.ts";
export { DepositApproved, DepositStarted } from "./deposit.ts";
export {
  ThirdPartyAccountCredited,
  ThirdPartyAccountCreditFailed,
} from "./third-party-credit.ts";
export {
  TransferApproved,
  TransferDeclined,
  TransferFailed,
  TransferStarted,
} from "./transfer.ts";
export {
  WithdrawalApproved,
  WithdrawalDeclined,
  WithdrawalStarted,
} from "./withdrawal.ts";

export type DomainEvent =
  | account.DomainEvent
  | customer.DomainEvent
  | dailyDebitLimit.DomainEvent
  | deposit.DomainEvent
  | transfer.DomainEvent
  | withdrawal.DomainEvent
  | thirdPartyCredit.DomainEvent;

export function validateEvent(
  msg: DomainEvent,
  scope?: EventValidationScope,
): void {
  validateMessage(msg, scope);
}

export function describeEvent(msg: DomainEvent): string {
  return describeMessage(msg);
}
