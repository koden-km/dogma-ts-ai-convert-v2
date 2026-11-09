import {
  type Context,
  create,
  type Deadline,
  type Event,
  executesCommand,
  handlesEvent,
  InvalidMessageError,
  type ProcessConfigurer,
  type ProcessDeadlineScope,
  type ProcessEventScope,
  type ProcessMessageHandler,
  type ProcessRoot,
  registerDeadline,
  schedulesDeadline,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  AccountCredited,
  AccountDebitDeclined,
  AccountDebited,
  ApproveTransfer,
  ConsumeDailyDebitLimit,
  CreditAccount,
  CreditThirdPartyAccount,
  DailyDebitLimitConsumed,
  DailyDebitLimitExceeded,
  DebitAccount,
  DebitFailureReason,
  DeclineTransfer,
  type DomainEvent,
  dailyDebitLimitDate,
  formatAmount,
  formatDebitFailureReason,
  MarkTransferAsFailed,
  ThirdPartyAccountCredited,
  ThirdPartyAccountCreditFailed,
  TransactionType,
  TransferApproved,
  TransferDeclined,
  TransferFailed,
  TransferStarted,
} from "../messages/index.ts";
import {
  type TransferReadyToProceed as TransferReadyToProceedMessage,
  TransferReadyToProceedSchema,
} from "./transfer_pb.ts";

export type TransferReadyToProceed = TransferReadyToProceedMessage;
export const TransferReadyToProceed = TransferReadyToProceedSchema;

registerDeadline(
  TransferReadyToProceed,
  "b5474f89-e985-4661-b85b-645347a4a645",
  {
    validate(m: TransferReadyToProceed) {
      if (m.transactionId === "") {
        throw new InvalidMessageError(
          "TransferReadyToProceed must not have an empty transaction ID",
        );
      }
    },
    describe(m: TransferReadyToProceed) {
      return `transfer ${m.transactionId} is ready to proceed`;
    },
    allowIdempotent: true,
  },
);

// TransferProcess is the process root for a funds transfer.
export type TransferProcess = ProcessRoot & {
  fromAccountId: string;
  toAccountId: string;
  toThirdPartyBank: boolean;
  amount: bigint;
  declineReason: DebitFailureReason;
};

// TransferProcessHandler manages the process of transferring funds between
// accounts.
export const TransferProcessHandler: ProcessMessageHandler<TransferProcess> = {
  configure(c: ProcessConfigurer): void {
    c.identity("transfer", "35afbe82-24c1-4868-a689-c2ec96c2e953");

    c.routes(
      handlesEvent(TransferStarted),
      handlesEvent(AccountDebited),
      handlesEvent(AccountDebitDeclined),
      handlesEvent(DailyDebitLimitConsumed),
      handlesEvent(DailyDebitLimitExceeded),
      handlesEvent(AccountCredited),
      handlesEvent(ThirdPartyAccountCredited),
      handlesEvent(ThirdPartyAccountCreditFailed),
      handlesEvent(TransferApproved),
      handlesEvent(TransferDeclined),
      handlesEvent(TransferFailed),
      executesCommand(DebitAccount),
      executesCommand(ConsumeDailyDebitLimit),
      executesCommand(CreditAccount),
      executesCommand(CreditThirdPartyAccount),
      executesCommand(ApproveTransfer),
      executesCommand(DeclineTransfer),
      executesCommand(MarkTransferAsFailed),
      schedulesDeadline(TransferReadyToProceed),
    );
  },

  newRoot(): TransferProcess {
    return {
      fromAccountId: "",
      toAccountId: "",
      toThirdPartyBank: false,
      amount: 0n,
      declineReason: DebitFailureReason.DEBIT_FAILURE_REASON_UNSPECIFIED,
    };
  },

  describeInstance(p: TransferProcess, ended: boolean): string {
    if (p.amount === 0n) {
      return "";
    }
    if (!ended) {
      return `transferring ${formatAmount(p.amount)} from ${p.fromAccountId} to ${p.toAccountId}`;
    }
    if (
      p.declineReason !== DebitFailureReason.DEBIT_FAILURE_REASON_UNSPECIFIED
    ) {
      return `transfer of ${formatAmount(p.amount)} from ${p.fromAccountId} to ${p.toAccountId} declined: ${formatDebitFailureReason(p.declineReason)}`;
    }
    return `transferred ${formatAmount(p.amount)} from ${p.fromAccountId} to ${p.toAccountId}`;
  },

  routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
    const m = e as DomainEvent;
    switch (m.$typeName) {
      case TransferStarted.typeName:
        return [m.transactionId, true];
      case AccountDebited.typeName:
        return [
          m.transactionId,
          m.transactionType === TransactionType.TRANSFER,
        ];
      case AccountDebitDeclined.typeName:
        return [
          m.transactionId,
          m.transactionType === TransactionType.TRANSFER,
        ];
      case DailyDebitLimitConsumed.typeName:
        return [m.transactionId, m.debitType === TransactionType.TRANSFER];
      case DailyDebitLimitExceeded.typeName:
        return [m.transactionId, m.debitType === TransactionType.TRANSFER];
      case AccountCredited.typeName:
        return [
          m.transactionId,
          m.transactionType === TransactionType.TRANSFER,
        ];
      case ThirdPartyAccountCredited.typeName:
      case ThirdPartyAccountCreditFailed.typeName:
      case TransferApproved.typeName:
      case TransferDeclined.typeName:
      case TransferFailed.typeName:
        return [m.transactionId, true];
      default:
        throw new UnexpectedMessageError();
    }
  },

  handleEvent(
    _ctx: Context,
    t: TransferProcess,
    s: ProcessEventScope<TransferProcess>,
    e: Event,
  ): void {
    const m = e as DomainEvent;
    switch (m.$typeName) {
      case TransferStarted.typeName: {
        s.mutate((root) => {
          root.fromAccountId = m.fromAccountId;
          root.toAccountId = m.toAccountId;
          root.toThirdPartyBank = Boolean(m.toThirdPartyBank);
          root.amount = m.amount;
        });

        const scheduledAt = new Date(m.scheduledTime);

        s.scheduleDeadline(
          create(TransferReadyToProceed, {
            transactionId: m.transactionId,
          }),
          scheduledAt,
        );
        return;
      }

      case AccountDebited.typeName:
        s.executeCommand(
          create(ConsumeDailyDebitLimit, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            debitType: TransactionType.TRANSFER,
            amount: m.amount,
            date: dailyDebitLimitDate(m.scheduledTime),
          }),
        );
        return;

      case AccountDebitDeclined.typeName:
        s.executeCommand(
          create(DeclineTransfer, {
            transactionId: m.transactionId,
            fromAccountId: t.fromAccountId,
            toAccountId: t.toAccountId,
            amount: m.amount,
            reason: m.reason,
          }),
        );
        return;

      case DailyDebitLimitConsumed.typeName:
        if (t.toThirdPartyBank) {
          s.executeCommand(
            create(CreditThirdPartyAccount, {
              transactionId: m.transactionId,
              accountId: t.toAccountId,
              amount: m.amount,
            }),
          );
        } else {
          s.executeCommand(
            create(CreditAccount, {
              transactionId: m.transactionId,
              accountId: t.toAccountId,
              transactionType: TransactionType.TRANSFER,
              amount: m.amount,
            }),
          );
        }
        return;

      case DailyDebitLimitExceeded.typeName:
        s.mutate((root) => {
          root.declineReason = DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED;
        });

        // compensate the initial debit
        s.executeCommand(
          create(CreditAccount, {
            transactionId: m.transactionId,
            accountId: t.fromAccountId,
            transactionType: TransactionType.TRANSFER,
            amount: m.amount,
          }),
        );
        return;

      case AccountCredited.typeName:
        if (t.toAccountId === m.accountId) {
          // it was a credit to complete the transfer (success)
          s.executeCommand(
            create(ApproveTransfer, {
              transactionId: m.transactionId,
              fromAccountId: t.fromAccountId,
              toAccountId: t.toAccountId,
              amount: m.amount,
            }),
          );
        } else {
          // it was a compensating credit to undo the transfer (business rejection)
          s.executeCommand(
            create(DeclineTransfer, {
              transactionId: m.transactionId,
              fromAccountId: t.fromAccountId,
              toAccountId: t.toAccountId,
              amount: m.amount,
              reason:
                t.declineReason ||
                DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED,
            }),
          );
        }
        return;

      case ThirdPartyAccountCredited.typeName:
        s.executeCommand(
          create(ApproveTransfer, {
            transactionId: m.transactionId,
            fromAccountId: t.fromAccountId,
            toAccountId: t.toAccountId,
            amount: t.amount,
          }),
        );
        return;

      case ThirdPartyAccountCreditFailed.typeName:
        s.executeCommand(
          create(MarkTransferAsFailed, {
            transactionId: m.transactionId,
            fromAccountId: t.fromAccountId,
            toAccountId: t.toAccountId,
            amount: t.amount,
          }),
        );

        s.executeCommand(
          create(CreditAccount, {
            transactionId: m.transactionId,
            accountId: t.fromAccountId,
            transactionType: TransactionType.TRANSFER,
            amount: t.amount,
          }),
        );
        return;

      case TransferApproved.typeName:
      case TransferDeclined.typeName:
      case TransferFailed.typeName:
        s.end();
        return;

      default:
        throw new UnexpectedMessageError();
    }
  },

  handleDeadline(
    _ctx: Context,
    t: TransferProcess,
    s: ProcessDeadlineScope<TransferProcess>,
    d: Deadline,
  ): void {
    const m = d as TransferReadyToProceed;
    switch (m.$typeName) {
      case TransferReadyToProceed.typeName:
        s.executeCommand(
          create(DebitAccount, {
            transactionId: m.transactionId,
            accountId: t.fromAccountId,
            transactionType: TransactionType.TRANSFER,
            amount: t.amount,
            scheduledTime: s.scheduledFor().toISOString(),
          }),
        );
        return;
      default:
        throw new UnexpectedMessageError();
    }
  },
};
