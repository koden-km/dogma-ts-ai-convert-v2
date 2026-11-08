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
  ApproveDeposit,
  ApproveTransfer,
  ApproveWithdrawal,
  CommandName,
  createEvent,
  DeclineTransfer,
  DeclineWithdrawal,
  Deposit,
  type DomainCommand,
  type DomainEvent,
  EventName,
  formatAmount,
  MarkTransferAsFailed,
  Transfer,
  Withdraw,
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
        startDeposit(r, s, m);
        return;
      case CommandName.ApproveDeposit:
        approveDeposit(r, s, m);
        return;
      case CommandName.Withdraw:
        startWithdrawal(r, s, m);
        return;
      case CommandName.ApproveWithdrawal:
        approveWithdrawal(r, s, m);
        return;
      case CommandName.DeclineWithdrawal:
        declineWithdrawal(r, s, m);
        return;
      case CommandName.Transfer:
        startTransfer(r, s, m);
        return;
      case CommandName.ApproveTransfer:
        approveTransfer(r, s, m);
        return;
      case CommandName.DeclineTransfer:
        declineTransfer(r, s, m);
        return;
      case CommandName.MarkTransferAsFailed:
        failTransfer(r, s, m);
        return;
      default:
        throw new UnexpectedMessageError();
    }
  },
};

function startDeposit(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: Deposit,
) {
  const { data: m } = c;
  if (r.status !== "") {
    s.log("transaction already started");
    return;
  }
  s.recordEvent(
    createEvent(EventName.DepositStarted, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
    }),
  );
}

function approveDeposit(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: ApproveDeposit,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.DepositApproved, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
    }),
  );
}

function startWithdrawal(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: Withdraw,
) {
  const { data: m } = c;
  if (r.status !== "") {
    s.log("transaction already started");
    return;
  }
  s.recordEvent(
    createEvent(EventName.WithdrawalStarted, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
      scheduledTime: m.scheduledTime,
    }),
  );
}

function approveWithdrawal(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: ApproveWithdrawal,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.WithdrawalApproved, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
    }),
  );
}

function declineWithdrawal(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: DeclineWithdrawal,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.WithdrawalDeclined, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      amount: m.amount,
      reason: m.reason,
    }),
  );
  return;
}

function startTransfer(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: Transfer,
) {
  const { data: m } = c;
  if (r.status !== "") {
    s.log("transaction already started");
    return;
  }
  if (m.fromAccountID === m.toAccountID) {
    s.log("cannot transfer to same account");
    return;
  }
  s.recordEvent(
    createEvent(EventName.TransferStarted, {
      transactionID: m.transactionID,
      fromAccountID: m.fromAccountID,
      toAccountID: m.toAccountID,
      toThirdPartyBank: m.toThirdPartyBank,
      amount: m.amount,
      scheduledTime: m.scheduledTime,
    }),
  );
}

function approveTransfer(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: ApproveTransfer,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.TransferApproved, {
      transactionID: m.transactionID,
      fromAccountID: m.fromAccountID,
      toAccountID: m.toAccountID,
      amount: m.amount,
    }),
  );
  return;
}

function declineTransfer(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: DeclineTransfer,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.TransferDeclined, {
      transactionID: m.transactionID,
      fromAccountID: m.fromAccountID,
      toAccountID: m.toAccountID,
      amount: m.amount,
      reason: m.reason,
    }),
  );
  return;
}

function failTransfer(
  r: Transaction,
  s: AggregateCommandScope<Transaction>,
  c: MarkTransferAsFailed,
) {
  const { data: m } = c;
  s.recordEvent(
    createEvent(EventName.TransferFailed, {
      transactionID: m.transactionID,
      fromAccountID: m.fromAccountID,
      toAccountID: m.toAccountID,
      amount: m.amount,
    }),
  );
}
