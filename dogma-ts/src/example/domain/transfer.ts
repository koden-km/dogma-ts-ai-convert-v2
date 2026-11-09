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
  AccountCreditedSchema,
  AccountDebitDeclinedSchema,
  AccountDebitedSchema,
  ApproveTransferSchema,
  ConsumeDailyDebitLimitSchema,
  CreditAccountSchema,
  CreditThirdPartyAccountSchema,
  DailyDebitLimitConsumedSchema,
  DailyDebitLimitExceededSchema,
  DebitAccountSchema,
  DebitFailureReason,
  DeclineTransferSchema,
  type DomainEvent,
  dailyDebitLimitDate,
  formatAmount,
  formatDebitFailureReason,
  MarkTransferAsFailedSchema,
  ThirdPartyAccountCreditedSchema,
  ThirdPartyAccountCreditFailedSchema,
  TransactionType,
  TransferApprovedSchema,
  TransferDeclinedSchema,
  TransferFailedSchema,
  TransferStartedSchema,
} from "../messages/index.ts";
import {
  type TransferReadyToProceed,
  TransferReadyToProceedSchema,
} from "./transfer_pb.ts";

export { type TransferReadyToProceed, TransferReadyToProceedSchema };

registerDeadline(
  TransferReadyToProceedSchema,
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
      handlesEvent(TransferStartedSchema),
      handlesEvent(AccountDebitedSchema),
      handlesEvent(AccountDebitDeclinedSchema),
      handlesEvent(DailyDebitLimitConsumedSchema),
      handlesEvent(DailyDebitLimitExceededSchema),
      handlesEvent(AccountCreditedSchema),
      handlesEvent(ThirdPartyAccountCreditedSchema),
      handlesEvent(ThirdPartyAccountCreditFailedSchema),
      handlesEvent(TransferApprovedSchema),
      handlesEvent(TransferDeclinedSchema),
      handlesEvent(TransferFailedSchema),
      executesCommand(DebitAccountSchema),
      executesCommand(ConsumeDailyDebitLimitSchema),
      executesCommand(CreditAccountSchema),
      executesCommand(CreditThirdPartyAccountSchema),
      executesCommand(ApproveTransferSchema),
      executesCommand(DeclineTransferSchema),
      executesCommand(MarkTransferAsFailedSchema),
      schedulesDeadline(TransferReadyToProceedSchema),
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
      case TransferStartedSchema.typeName:
        return [m.transactionId, true];
      case AccountDebitedSchema.typeName:
        return [
          m.transactionId,
          m.transactionType === TransactionType.TRANSFER,
        ];
      case AccountDebitDeclinedSchema.typeName:
        return [
          m.transactionId,
          m.transactionType === TransactionType.TRANSFER,
        ];
      case DailyDebitLimitConsumedSchema.typeName:
        return [m.transactionId, m.debitType === TransactionType.TRANSFER];
      case DailyDebitLimitExceededSchema.typeName:
        return [m.transactionId, m.debitType === TransactionType.TRANSFER];
      case AccountCreditedSchema.typeName:
        return [
          m.transactionId,
          m.transactionType === TransactionType.TRANSFER,
        ];
      case ThirdPartyAccountCreditedSchema.typeName:
      case ThirdPartyAccountCreditFailedSchema.typeName:
      case TransferApprovedSchema.typeName:
      case TransferDeclinedSchema.typeName:
      case TransferFailedSchema.typeName:
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
      case TransferStartedSchema.typeName: {
        s.mutate((root) => {
          root.fromAccountId = m.fromAccountId;
          root.toAccountId = m.toAccountId;
          root.toThirdPartyBank = Boolean(m.toThirdPartyBank);
          root.amount = m.amount;
        });

        const scheduledAt = new Date(m.scheduledTime);

        s.scheduleDeadline(
          create(TransferReadyToProceedSchema, {
            transactionId: m.transactionId,
          }),
          scheduledAt,
        );
        return;
      }

      case AccountDebitedSchema.typeName:
        s.executeCommand(
          create(ConsumeDailyDebitLimitSchema, {
            transactionId: m.transactionId,
            accountId: m.accountId,
            debitType: TransactionType.TRANSFER,
            amount: m.amount,
            date: dailyDebitLimitDate(m.scheduledTime),
          }),
        );
        return;

      case AccountDebitDeclinedSchema.typeName:
        s.executeCommand(
          create(DeclineTransferSchema, {
            transactionId: m.transactionId,
            fromAccountId: t.fromAccountId,
            toAccountId: t.toAccountId,
            amount: m.amount,
            reason: m.reason,
          }),
        );
        return;

      case DailyDebitLimitConsumedSchema.typeName:
        if (t.toThirdPartyBank) {
          s.executeCommand(
            create(CreditThirdPartyAccountSchema, {
              transactionId: m.transactionId,
              accountId: t.toAccountId,
              amount: m.amount,
            }),
          );
        } else {
          s.executeCommand(
            create(CreditAccountSchema, {
              transactionId: m.transactionId,
              accountId: t.toAccountId,
              transactionType: TransactionType.TRANSFER,
              amount: m.amount,
            }),
          );
        }
        return;

      case DailyDebitLimitExceededSchema.typeName:
        s.mutate((root) => {
          root.declineReason = DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED;
        });

        // compensate the initial debit
        s.executeCommand(
          create(CreditAccountSchema, {
            transactionId: m.transactionId,
            accountId: t.fromAccountId,
            transactionType: TransactionType.TRANSFER,
            amount: m.amount,
          }),
        );
        return;

      case AccountCreditedSchema.typeName:
        if (t.toAccountId === m.accountId) {
          // it was a credit to complete the transfer (success)
          s.executeCommand(
            create(ApproveTransferSchema, {
              transactionId: m.transactionId,
              fromAccountId: t.fromAccountId,
              toAccountId: t.toAccountId,
              amount: m.amount,
            }),
          );
        } else {
          // it was a compensating credit to undo the transfer (business rejection)
          s.executeCommand(
            create(DeclineTransferSchema, {
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

      case ThirdPartyAccountCreditedSchema.typeName:
        s.executeCommand(
          create(ApproveTransferSchema, {
            transactionId: m.transactionId,
            fromAccountId: t.fromAccountId,
            toAccountId: t.toAccountId,
            amount: t.amount,
          }),
        );
        return;

      case ThirdPartyAccountCreditFailedSchema.typeName:
        s.executeCommand(
          create(MarkTransferAsFailedSchema, {
            transactionId: m.transactionId,
            fromAccountId: t.fromAccountId,
            toAccountId: t.toAccountId,
            amount: t.amount,
          }),
        );

        s.executeCommand(
          create(CreditAccountSchema, {
            transactionId: m.transactionId,
            accountId: t.fromAccountId,
            transactionType: TransactionType.TRANSFER,
            amount: t.amount,
          }),
        );
        return;

      case TransferApprovedSchema.typeName:
      case TransferDeclinedSchema.typeName:
      case TransferFailedSchema.typeName:
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
      case TransferReadyToProceedSchema.typeName:
        s.executeCommand(
          create(DebitAccountSchema, {
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
