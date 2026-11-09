import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  create,
  type Event,
  handlesCommand,
  NoSnapshotBehavior,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  ApproveDeposit,
  ApproveTransfer,
  ApproveWithdrawal,
  DeclineTransfer,
  DeclineWithdrawal,
  Deposit,
  DepositApproved,
  DepositStarted,
  type DomainCommand,
  type DomainEvent,
  formatAmount,
  formatDebitFailureReason,
  MarkTransferAsFailed,
  Transfer,
  TransferApproved,
  TransferDeclined,
  TransferFailed,
  TransferStarted,
  Withdraw,
  WithdrawalApproved,
  WithdrawalDeclined,
  WithdrawalStarted,
} from "../messages/index.ts";

// Transaction is the aggregate root for a bank transaction.
export type Transaction = AggregateRoot & {
  type: string;
  amount: bigint;
  status: string;
};

// TransactionHandler implements the business logic for a transaction of any
// kind against an account.
//
// Its sole purpose is to ensure the global uniqueness of transaction IDs.
export const TransactionHandler: AggregateMessageHandler<Transaction> = {
  ...NoSnapshotBehavior,

  configure(c: AggregateConfigurer): void {
    c.identity("transaction", "2afe7484-8eb4-4c02-9c39-c2493e0defb0");

    c.routes(
      handlesCommand(Deposit),
      handlesCommand(ApproveDeposit),
      handlesCommand(Withdraw),
      handlesCommand(ApproveWithdrawal),
      handlesCommand(DeclineWithdrawal),
      handlesCommand(Transfer),
      handlesCommand(ApproveTransfer),
      handlesCommand(DeclineTransfer),
      handlesCommand(MarkTransferAsFailed),
      recordsEvent(DepositStarted),
      recordsEvent(DepositApproved),
      recordsEvent(WithdrawalStarted),
      recordsEvent(WithdrawalApproved),
      recordsEvent(WithdrawalDeclined),
      recordsEvent(TransferStarted),
      recordsEvent(TransferApproved),
      recordsEvent(TransferDeclined),
      recordsEvent(TransferFailed),
    );
  },

  newRoot(): Transaction {
    return {
      type: "",
      amount: 0n,
      status: "",
    };
  },

  describeInstance(r: Transaction): string {
    if (r.type === "") {
      return "";
    }
    return `${r.type} of ${formatAmount(r.amount)} (${r.status})`;
  },

  applyEvent(r: Transaction, e: Event): void {
    const m = e as DomainEvent;
    switch (m.$typeName) {
      case DepositStarted.typeName:
        r.type = "deposit";
        r.amount = m.amount;
        r.status = "pending";
        break;
      case DepositApproved.typeName:
        r.status = "approved";
        break;

      case WithdrawalStarted.typeName:
        r.type = "withdrawal";
        r.amount = m.amount;
        r.status = "pending";
        break;
      case WithdrawalApproved.typeName:
        r.status = "approved";
        break;
      case WithdrawalDeclined.typeName:
        r.status = `declined: ${formatDebitFailureReason(m.reason)}`;
        break;

      case TransferStarted.typeName:
        r.type = "transfer";
        r.amount = m.amount;
        r.status = "pending";
        break;
      case TransferApproved.typeName:
        r.status = "approved";
        break;
      case TransferDeclined.typeName:
        r.status = `declined: ${formatDebitFailureReason(m.reason)}`;
        break;
      case TransferFailed.typeName:
        r.status = "failed";
        break;
    }
  },

  routeCommandToInstance(c: Command): string {
    const m = c as DomainCommand;
    switch (m.$typeName) {
      case Deposit.typeName:
      case ApproveDeposit.typeName:
      case Withdraw.typeName:
      case ApproveWithdrawal.typeName:
      case DeclineWithdrawal.typeName:
      case Transfer.typeName:
      case ApproveTransfer.typeName:
      case DeclineTransfer.typeName:
      case MarkTransferAsFailed.typeName:
        return m.transactionId;
      default:
        throw new UnexpectedMessageError();
    }
  },

  handleCommand(
    r: Transaction,
    s: AggregateCommandScope<Transaction>,
    c: Command,
  ): void {
    const m = c as DomainCommand;
    switch (m.$typeName) {
      case Deposit.typeName:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        s.recordEvent(
          create(DepositStarted, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
          }),
        );
        return;

      case ApproveDeposit.typeName:
        s.recordEvent(
          create(DepositApproved, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
          }),
        );
        return;

      case Withdraw.typeName:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        s.recordEvent(
          create(WithdrawalStarted, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
            scheduledTime: m.scheduledTime,
          }),
        );
        return;

      case ApproveWithdrawal.typeName:
        s.recordEvent(
          create(WithdrawalApproved, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
          }),
        );
        return;

      case DeclineWithdrawal.typeName:
        s.recordEvent(
          create(WithdrawalDeclined, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
            reason: m.reason,
          }),
        );
        return;

      case Transfer.typeName:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        if (m.fromAccountId === m.toAccountId) {
          s.log("cannot transfer to same account");
          return;
        }
        s.recordEvent(
          create(TransferStarted, {
            transactionId: m.transactionId,
            fromAccountId: m.fromAccountId,
            toAccountId: m.toAccountId,
            toThirdPartyBank: m.toThirdPartyBank,
            amount: m.amount,
            scheduledTime: m.scheduledTime,
          }),
        );
        return;

      case ApproveTransfer.typeName:
        s.recordEvent(
          create(TransferApproved, {
            transactionId: m.transactionId,
            fromAccountId: m.fromAccountId,
            toAccountId: m.toAccountId,
            amount: m.amount,
          }),
        );
        return;

      case DeclineTransfer.typeName:
        s.recordEvent(
          create(TransferDeclined, {
            transactionId: m.transactionId,
            fromAccountId: m.fromAccountId,
            toAccountId: m.toAccountId,
            amount: m.amount,
            reason: m.reason,
          }),
        );
        return;

      case MarkTransferAsFailed.typeName:
        s.recordEvent(
          create(TransferFailed, {
            transactionId: m.transactionId,
            fromAccountId: m.fromAccountId,
            toAccountId: m.toAccountId,
            amount: m.amount,
          }),
        );
        return;

      default:
        throw new UnexpectedMessageError();
    }
  },
};
