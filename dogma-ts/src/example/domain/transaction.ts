import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  type Event,
  handlesCommand,
  NoSnapshotBehavior,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CommandName,
  createEvent,
  type DomainCommand,
  type DomainEvent,
  EventName,
  formatAmount,
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
      handlesCommand(CommandName.Deposit),
      handlesCommand(CommandName.ApproveDeposit),
      handlesCommand(CommandName.Withdraw),
      handlesCommand(CommandName.ApproveWithdrawal),
      handlesCommand(CommandName.DeclineWithdrawal),
      handlesCommand(CommandName.Transfer),
      handlesCommand(CommandName.ApproveTransfer),
      handlesCommand(CommandName.DeclineTransfer),
      handlesCommand(CommandName.MarkTransferAsFailed),
      recordsEvent(EventName.DepositStarted),
      recordsEvent(EventName.DepositApproved),
      recordsEvent(EventName.WithdrawalStarted),
      recordsEvent(EventName.WithdrawalApproved),
      recordsEvent(EventName.WithdrawalDeclined),
      recordsEvent(EventName.TransferStarted),
      recordsEvent(EventName.TransferApproved),
      recordsEvent(EventName.TransferDeclined),
      recordsEvent(EventName.TransferFailed),
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
    switch (m.name) {
      case EventName.DepositStarted:
        r.type = "deposit";
        r.amount = m.data.amount;
        r.status = "pending";
        break;
      case EventName.DepositApproved:
        r.status = "approved";
        break;

      case EventName.WithdrawalStarted:
        r.type = "withdrawal";
        r.amount = m.data.amount;
        r.status = "pending";
        break;
      case EventName.WithdrawalApproved:
        r.status = "approved";
        break;
      case EventName.WithdrawalDeclined:
        r.status = `declined: ${m.data.reason}`;
        break;

      case EventName.TransferStarted:
        r.type = "transfer";
        r.amount = m.data.amount;
        r.status = "pending";
        break;
      case EventName.TransferApproved:
        r.status = "approved";
        break;
      case EventName.TransferDeclined:
        r.status = `declined: ${m.data.reason}`;
        break;
      case EventName.TransferFailed:
        r.status = "failed";
        break;
    }
  },

  routeCommandToInstance(c: Command): string {
    const m = c as DomainCommand;
    switch (m.name) {
      case CommandName.Deposit:
      case CommandName.ApproveDeposit:
      case CommandName.Withdraw:
      case CommandName.ApproveWithdrawal:
      case CommandName.DeclineWithdrawal:
      case CommandName.Transfer:
      case CommandName.ApproveTransfer:
      case CommandName.DeclineTransfer:
      case CommandName.MarkTransferAsFailed:
        return m.data.transactionID;
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
    switch (m.name) {
      case CommandName.Deposit:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        s.recordEvent(
          createEvent(EventName.DepositStarted, {
            transactionID: m.data.transactionID,
            accountID: m.data.accountID,
            amount: m.data.amount,
          }),
        );
        return;

      case CommandName.ApproveDeposit:
        s.recordEvent(
          createEvent(EventName.DepositApproved, {
            transactionID: m.data.transactionID,
            accountID: m.data.accountID,
            amount: m.data.amount,
          }),
        );
        return;

      case CommandName.Withdraw:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        s.recordEvent(
          createEvent(EventName.WithdrawalStarted, {
            transactionID: m.data.transactionID,
            accountID: m.data.accountID,
            amount: m.data.amount,
            scheduledTime: m.data.scheduledTime,
          }),
        );
        return;

      case CommandName.ApproveWithdrawal:
        s.recordEvent(
          createEvent(EventName.WithdrawalApproved, {
            transactionID: m.data.transactionID,
            accountID: m.data.accountID,
            amount: m.data.amount,
          }),
        );
        return;

      case CommandName.DeclineWithdrawal:
        s.recordEvent(
          createEvent(EventName.WithdrawalDeclined, {
            transactionID: m.data.transactionID,
            accountID: m.data.accountID,
            amount: m.data.amount,
            reason: m.data.reason,
          }),
        );
        return;

      case CommandName.Transfer:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        if (m.data.fromAccountID === m.data.toAccountID) {
          s.log("cannot transfer to same account");
          return;
        }
        s.recordEvent(
          createEvent(EventName.TransferStarted, {
            transactionID: m.data.transactionID,
            fromAccountID: m.data.fromAccountID,
            toAccountID: m.data.toAccountID,
            toThirdPartyBank: m.data.toThirdPartyBank,
            amount: m.data.amount,
            scheduledTime: m.data.scheduledTime,
          }),
        );
        return;

      case CommandName.ApproveTransfer:
        s.recordEvent(
          createEvent(EventName.TransferApproved, {
            transactionID: m.data.transactionID,
            fromAccountID: m.data.fromAccountID,
            toAccountID: m.data.toAccountID,
            amount: m.data.amount,
          }),
        );
        return;

      case CommandName.DeclineTransfer:
        s.recordEvent(
          createEvent(EventName.TransferDeclined, {
            transactionID: m.data.transactionID,
            fromAccountID: m.data.fromAccountID,
            toAccountID: m.data.toAccountID,
            amount: m.data.amount,
            reason: m.data.reason,
          }),
        );
        return;

      case CommandName.MarkTransferAsFailed:
        s.recordEvent(
          createEvent(EventName.TransferFailed, {
            transactionID: m.data.transactionID,
            fromAccountID: m.data.fromAccountID,
            toAccountID: m.data.toAccountID,
            amount: m.data.amount,
          }),
        );
        return;

      default:
        throw new UnexpectedMessageError();
    }
  },
};
