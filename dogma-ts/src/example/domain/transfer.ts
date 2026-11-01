import {
  type Context,
  createMessageCreator,
  type Deadline,
  defineDeadlines,
  type Event,
  executesCommand,
  handlesEvent,
  InvalidMessageError,
  type ProcessConfigurer,
  type ProcessDeadlineScope,
  type ProcessEventScope,
  type ProcessMessageHandler,
  type ProcessRoot,
  schedulesDeadline,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CommandName,
  createCommand,
  dailyDebitLimitDate,
  DebitFailureReason,
  type DomainEvent,
  EventName,
  formatAmount,
  TransactionType,
} from "../messages/index.ts";

export const DeadlineName = {
  TransferReadyToProceed: "TransferReadyToProceed",
} as const;

// TransferReadyToProceed is a deadline message notifying that the transfer is
// ready to proceed.
export type TransferReadyToProceed = Deadline & {
  name: typeof DeadlineName.TransferReadyToProceed;
  data: {
    transactionID: string;
  };
};

const { messageCreators } = defineDeadlines<TransferReadyToProceed>([
  [
    DeadlineName.TransferReadyToProceed,
    "b5474f89-e985-4661-b85b-645347a4a645",
    ({ data: m }: TransferReadyToProceed) => {
      if (m.transactionID === "") {
        throw new InvalidMessageError(
          "TransferReadyToProceed must not have an empty transaction ID",
        );
      }
    },
    ({ data: m }: TransferReadyToProceed) =>
      `transfer ${m.transactionID} is ready to proceed`,
  ],
]);

export const createDeadline = createMessageCreator(messageCreators, "deadline");

// TransferProcess is the process root for a funds transfer.
export type TransferProcess = ProcessRoot & {
  fromAccountID: string;
  toAccountID: string;
  toThirdPartyBank: boolean;
  amount: bigint;
  declineReason: DebitFailureReason | "";
};

// TransferProcessHandler manages the process of transferring funds between
// accounts.
export const TransferProcessHandler: ProcessMessageHandler<TransferProcess> = {
  configure(c: ProcessConfigurer): void {
    c.identity("transfer", "35afbe82-24c1-4868-a689-c2ec96c2e953");

    c.routes(
      handlesEvent(EventName.TransferStarted),
      handlesEvent(EventName.AccountDebited),
      handlesEvent(EventName.AccountDebitDeclined),
      handlesEvent(EventName.DailyDebitLimitConsumed),
      handlesEvent(EventName.DailyDebitLimitExceeded),
      handlesEvent(EventName.AccountCredited),
      handlesEvent(EventName.ThirdPartyAccountCredited),
      handlesEvent(EventName.ThirdPartyAccountCreditFailed),
      handlesEvent(EventName.TransferApproved),
      handlesEvent(EventName.TransferDeclined),
      handlesEvent(EventName.TransferFailed),
      executesCommand(CommandName.DebitAccount),
      executesCommand(CommandName.ConsumeDailyDebitLimit),
      executesCommand(CommandName.CreditAccount),
      executesCommand(CommandName.CreditThirdPartyAccount),
      executesCommand(CommandName.ApproveTransfer),
      executesCommand(CommandName.DeclineTransfer),
      executesCommand(CommandName.MarkTransferAsFailed),
      schedulesDeadline(DeadlineName.TransferReadyToProceed),
    );
  },

  newRoot(): TransferProcess {
    return {
      fromAccountID: "",
      toAccountID: "",
      toThirdPartyBank: false,
      amount: 0n,
      declineReason: "",
    };
  },

  describeInstance(p: TransferProcess, ended: boolean): string {
    if (p.amount === 0n) {
      return "";
    }
    if (!ended) {
      return `transferring ${formatAmount(p.amount)} from ${p.fromAccountID} to ${p.toAccountID}`;
    }
    if (p.declineReason !== "") {
      return `transfer of ${formatAmount(p.amount)} from ${p.fromAccountID} to ${p.toAccountID} declined: ${p.declineReason}`;
    }
    return `transferred ${formatAmount(p.amount)} from ${p.fromAccountID} to ${p.toAccountID}`;
  },

  routeEventToInstance(_ctx: Context, e: Event): [string, boolean] {
    const m = e as DomainEvent;
    switch (m.name) {
      case EventName.TransferStarted:
        return [m.data.transactionID, true];
      case EventName.AccountDebited:
        return [
          m.data.transactionID,
          m.data.transactionType === TransactionType.Transfer,
        ];
      case EventName.AccountDebitDeclined:
        return [
          m.data.transactionID,
          m.data.transactionType === TransactionType.Transfer,
        ];
      case EventName.DailyDebitLimitConsumed:
        return [
          m.data.transactionID,
          m.data.debitType === TransactionType.Transfer,
        ];
      case EventName.DailyDebitLimitExceeded:
        return [
          m.data.transactionID,
          m.data.debitType === TransactionType.Transfer,
        ];
      case EventName.AccountCredited:
        return [
          m.data.transactionID,
          m.data.transactionType === TransactionType.Transfer,
        ];
      case EventName.ThirdPartyAccountCredited:
      case EventName.ThirdPartyAccountCreditFailed:
      case EventName.TransferApproved:
      case EventName.TransferDeclined:
      case EventName.TransferFailed:
        return [m.data.transactionID, true];
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
    switch (m.name) {
      case EventName.TransferStarted: {
        s.mutate((root) => {
          root.fromAccountID = m.data.fromAccountID;
          root.toAccountID = m.data.toAccountID;
          root.toThirdPartyBank = Boolean(m.data.toThirdPartyBank);
          root.amount = m.data.amount;
        });

        const scheduledAt =
          typeof m.data.scheduledTime === "string"
            ? new Date(m.data.scheduledTime)
            : m.data.scheduledTime;

        s.scheduleDeadline(
          createDeadline(DeadlineName.TransferReadyToProceed, {
            transactionID: m.data.transactionID,
          }),
          scheduledAt,
        );
        return;
      }

      case EventName.AccountDebited:
        s.executeCommand(
          createCommand(CommandName.ConsumeDailyDebitLimit, {
            transactionID: m.data.transactionID,
            accountID: m.data.accountID,
            debitType: TransactionType.Transfer,
            amount: m.data.amount,
            date: dailyDebitLimitDate(m.data.scheduledTime),
          }),
        );
        return;

      case EventName.AccountDebitDeclined:
        s.executeCommand(
          createCommand(CommandName.DeclineTransfer, {
            transactionID: m.data.transactionID,
            fromAccountID: t.fromAccountID,
            toAccountID: t.toAccountID,
            amount: m.data.amount,
            reason: m.data.reason,
          }),
        );
        return;

      case EventName.DailyDebitLimitConsumed:
        if (t.toThirdPartyBank) {
          s.executeCommand(
            createCommand(CommandName.CreditThirdPartyAccount, {
              transactionID: m.data.transactionID,
              accountID: t.toAccountID,
              amount: m.data.amount,
            }),
          );
        } else {
          s.executeCommand(
            createCommand(CommandName.CreditAccount, {
              transactionID: m.data.transactionID,
              accountID: t.toAccountID,
              transactionType: TransactionType.Transfer,
              amount: m.data.amount,
            }),
          );
        }
        return;

      case EventName.DailyDebitLimitExceeded:
        s.mutate((root) => {
          root.declineReason = DebitFailureReason.DailyDebitLimitExceeded;
        });

        // compensate the initial debit
        s.executeCommand(
          createCommand(CommandName.CreditAccount, {
            transactionID: m.data.transactionID,
            accountID: t.fromAccountID,
            transactionType: TransactionType.Transfer,
            amount: m.data.amount,
          }),
        );
        return;

      case EventName.AccountCredited:
        if (t.toAccountID === m.data.accountID) {
          // it was a credit to complete the transfer (success)
          s.executeCommand(
            createCommand(CommandName.ApproveTransfer, {
              transactionID: m.data.transactionID,
              fromAccountID: t.fromAccountID,
              toAccountID: t.toAccountID,
              amount: m.data.amount,
            }),
          );
        } else {
          // it was a compensating credit to undo the transfer (business rejection)
          s.executeCommand(
            createCommand(CommandName.DeclineTransfer, {
              transactionID: m.data.transactionID,
              fromAccountID: t.fromAccountID,
              toAccountID: t.toAccountID,
              amount: m.data.amount,
              reason:
                t.declineReason || DebitFailureReason.DailyDebitLimitExceeded,
            }),
          );
        }
        return;

      case EventName.ThirdPartyAccountCredited:
        s.executeCommand(
          createCommand(CommandName.ApproveTransfer, {
            transactionID: m.data.transactionID,
            fromAccountID: t.fromAccountID,
            toAccountID: t.toAccountID,
            amount: t.amount,
          }),
        );
        return;

      case EventName.ThirdPartyAccountCreditFailed:
        s.executeCommand(
          createCommand(CommandName.MarkTransferAsFailed, {
            transactionID: m.data.transactionID,
            fromAccountID: t.fromAccountID,
            toAccountID: t.toAccountID,
            amount: t.amount,
          }),
        );

        s.executeCommand(
          createCommand(CommandName.CreditAccount, {
            transactionID: m.data.transactionID,
            accountID: t.fromAccountID,
            transactionType: TransactionType.Transfer,
            amount: t.amount,
          }),
        );
        return;

      case EventName.TransferApproved:
      case EventName.TransferDeclined:
      case EventName.TransferFailed:
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
    switch (m.name) {
      case DeadlineName.TransferReadyToProceed:
        s.executeCommand(
          createCommand(CommandName.DebitAccount, {
            transactionID: m.data.transactionID,
            accountID: t.fromAccountID,
            transactionType: TransactionType.Transfer,
            amount: t.amount,
            scheduledTime: s.scheduledFor(),
          }),
        );
        return;
      default:
        throw new UnexpectedMessageError();
    }
  },
};
