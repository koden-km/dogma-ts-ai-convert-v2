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
  type CreditAccount,
  CreditAccountSchema,
  type DebitAccount,
  DebitAccountSchema,
  type OpenAccount,
  type OpenAccountForNewCustomer,
  OpenAccountForNewCustomerSchema,
  OpenAccountSchema,
} from "./account.ts";
export {
  type ConsumeDailyDebitLimit,
  ConsumeDailyDebitLimitSchema,
} from "./daily-debit-limit.ts";
export {
  type ApproveDeposit,
  ApproveDepositSchema,
  type Deposit,
  DepositSchema,
} from "./deposit.ts";
export {
  type CreditThirdPartyAccount,
  CreditThirdPartyAccountSchema,
} from "./third-party-credit.ts";
export {
  type ApproveTransfer,
  ApproveTransferSchema,
  type DeclineTransfer,
  DeclineTransferSchema,
  type MarkTransferAsFailed,
  MarkTransferAsFailedSchema,
  type Transfer,
  TransferSchema,
} from "./transfer.ts";
export {
  type ApproveWithdrawal,
  ApproveWithdrawalSchema,
  type DeclineWithdrawal,
  DeclineWithdrawalSchema,
  type Withdraw,
  WithdrawSchema,
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
