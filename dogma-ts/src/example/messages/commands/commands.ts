import {
  type CommandValidationScope,
  describeMessage,
  validateMessage,
} from "@/dogma/message.ts";
import * as account from "./account.ts";
import * as dailyDebitLimit from "./daily-debit-limit.ts";
import * as deposit from "./deposit.ts";
import * as thirdPartyCredit from "./third-party-credit.ts";
import * as transfer from "./transfer.ts";
import * as withdrawal from "./withdrawal.ts";

export {
  CreditAccount,
  DebitAccount,
  OpenAccount,
  OpenAccountForNewCustomer,
} from "./account.ts";
export { ConsumeDailyDebitLimit } from "./daily-debit-limit.ts";
export { ApproveDeposit, Deposit } from "./deposit.ts";
export { CreditThirdPartyAccount } from "./third-party-credit.ts";
export {
  ApproveTransfer,
  DeclineTransfer,
  MarkTransferAsFailed,
  Transfer,
} from "./transfer.ts";
export {
  ApproveWithdrawal,
  DeclineWithdrawal,
  Withdraw,
} from "./withdrawal.ts";

export type DomainCommand =
  | account.DomainCommand
  | dailyDebitLimit.DomainCommand
  | deposit.DomainCommand
  | transfer.DomainCommand
  | withdrawal.DomainCommand
  | thirdPartyCredit.DomainCommand;

export function validateCommand(
  msg: DomainCommand,
  scope?: CommandValidationScope,
): void {
  validateMessage(msg, scope);
}

export function describeCommand(msg: DomainCommand): string {
  return describeMessage(msg);
}
