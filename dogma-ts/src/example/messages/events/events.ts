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
  type AccountCredited,
  AccountCreditedSchema,
  type AccountDebitDeclined,
  AccountDebitDeclinedSchema,
  type AccountDebited,
  AccountDebitedSchema,
  type AccountOpened,
  AccountOpenedSchema,
} from "./account.ts";
export {
  type CustomerAcquired,
  CustomerAcquiredSchema,
} from "./customer.ts";
export {
  type DailyDebitLimitConsumed,
  DailyDebitLimitConsumedSchema,
  type DailyDebitLimitExceeded,
  DailyDebitLimitExceededSchema,
} from "./dailydebitlimit.ts";
export {
  type DepositApproved,
  DepositApprovedSchema,
  type DepositStarted,
  DepositStartedSchema,
} from "./deposit.ts";
export {
  type ThirdPartyAccountCredited,
  ThirdPartyAccountCreditedSchema,
  type ThirdPartyAccountCreditFailed,
  ThirdPartyAccountCreditFailedSchema,
} from "./third-party-credit.ts";
export {
  type TransferApproved,
  TransferApprovedSchema,
  type TransferDeclined,
  TransferDeclinedSchema,
  type TransferFailed,
  TransferFailedSchema,
  type TransferStarted,
  TransferStartedSchema,
} from "./transfer.ts";
export {
  type WithdrawalApproved,
  WithdrawalApprovedSchema,
  type WithdrawalDeclined,
  WithdrawalDeclinedSchema,
  type WithdrawalStarted,
  WithdrawalStartedSchema,
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
