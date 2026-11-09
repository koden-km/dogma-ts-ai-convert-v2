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
  ApproveDepositSchema,
  ApproveTransferSchema,
  ApproveWithdrawalSchema,
  DeclineTransferSchema,
  DeclineWithdrawalSchema,
  DepositApprovedSchema,
  DepositSchema,
  DepositStartedSchema,
  type DomainCommand,
  type DomainEvent,
  formatAmount,
  formatDebitFailureReason,
  MarkTransferAsFailedSchema,
  TransferApprovedSchema,
  TransferDeclinedSchema,
  TransferFailedSchema,
  TransferSchema,
  TransferStartedSchema,
  WithdrawalApprovedSchema,
  WithdrawalDeclinedSchema,
  WithdrawalStartedSchema,
  WithdrawSchema,
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
      handlesCommand(DepositSchema),
      handlesCommand(ApproveDepositSchema),
      handlesCommand(WithdrawSchema),
      handlesCommand(ApproveWithdrawalSchema),
      handlesCommand(DeclineWithdrawalSchema),
      handlesCommand(TransferSchema),
      handlesCommand(ApproveTransferSchema),
      handlesCommand(DeclineTransferSchema),
      handlesCommand(MarkTransferAsFailedSchema),
      recordsEvent(DepositStartedSchema),
      recordsEvent(DepositApprovedSchema),
      recordsEvent(WithdrawalStartedSchema),
      recordsEvent(WithdrawalApprovedSchema),
      recordsEvent(WithdrawalDeclinedSchema),
      recordsEvent(TransferStartedSchema),
      recordsEvent(TransferApprovedSchema),
      recordsEvent(TransferDeclinedSchema),
      recordsEvent(TransferFailedSchema),
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
      case DepositStartedSchema.typeName:
        r.type = "deposit";
        r.amount = m.amount;
        r.status = "pending";
        break;
      case DepositApprovedSchema.typeName:
        r.status = "approved";
        break;

      case WithdrawalStartedSchema.typeName:
        r.type = "withdrawal";
        r.amount = m.amount;
        r.status = "pending";
        break;
      case WithdrawalApprovedSchema.typeName:
        r.status = "approved";
        break;
      case WithdrawalDeclinedSchema.typeName:
        r.status = `declined: ${formatDebitFailureReason(m.reason)}`;
        break;

      case TransferStartedSchema.typeName:
        r.type = "transfer";
        r.amount = m.amount;
        r.status = "pending";
        break;
      case TransferApprovedSchema.typeName:
        r.status = "approved";
        break;
      case TransferDeclinedSchema.typeName:
        r.status = `declined: ${formatDebitFailureReason(m.reason)}`;
        break;
      case TransferFailedSchema.typeName:
        r.status = "failed";
        break;
    }
  },

  routeCommandToInstance(c: Command): string {
    const m = c as DomainCommand;
    switch (m.$typeName) {
      case DepositSchema.typeName:
      case ApproveDepositSchema.typeName:
      case WithdrawSchema.typeName:
      case ApproveWithdrawalSchema.typeName:
      case DeclineWithdrawalSchema.typeName:
      case TransferSchema.typeName:
      case ApproveTransferSchema.typeName:
      case DeclineTransferSchema.typeName:
      case MarkTransferAsFailedSchema.typeName:
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
      case DepositSchema.typeName:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        s.recordEvent(
          create(DepositStartedSchema, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
          }),
        );
        return;

      case ApproveDepositSchema.typeName:
        s.recordEvent(
          create(DepositApprovedSchema, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
          }),
        );
        return;

      case WithdrawSchema.typeName:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        s.recordEvent(
          create(WithdrawalStartedSchema, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
            scheduledTime: m.scheduledTime,
          }),
        );
        return;

      case ApproveWithdrawalSchema.typeName:
        s.recordEvent(
          create(WithdrawalApprovedSchema, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
          }),
        );
        return;

      case DeclineWithdrawalSchema.typeName:
        s.recordEvent(
          create(WithdrawalDeclinedSchema, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            amount: m.amount,
            reason: m.reason,
          }),
        );
        return;

      case TransferSchema.typeName:
        if (r.status !== "") {
          s.log("transaction already started");
          return;
        }
        if (m.fromAccountId === m.toAccountId) {
          s.log("cannot transfer to same account");
          return;
        }
        s.recordEvent(
          create(TransferStartedSchema, {
            transactionId: m.transactionId,
            fromAccountId: m.fromAccountId,
            toAccountId: m.toAccountId,
            toThirdPartyBank: m.toThirdPartyBank,
            amount: m.amount,
            scheduledTime: m.scheduledTime,
          }),
        );
        return;

      case ApproveTransferSchema.typeName:
        s.recordEvent(
          create(TransferApprovedSchema, {
            transactionId: m.transactionId,
            fromAccountId: m.fromAccountId,
            toAccountId: m.toAccountId,
            amount: m.amount,
          }),
        );
        return;

      case DeclineTransferSchema.typeName:
        s.recordEvent(
          create(TransferDeclinedSchema, {
            transactionId: m.transactionId,
            fromAccountId: m.fromAccountId,
            toAccountId: m.toAccountId,
            amount: m.amount,
            reason: m.reason,
          }),
        );
        return;

      case MarkTransferAsFailedSchema.typeName:
        s.recordEvent(
          create(TransferFailedSchema, {
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
