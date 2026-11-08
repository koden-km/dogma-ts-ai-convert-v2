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
  AccountCredited,
  AccountDebitDeclined,
  AccountDebited,
  CommandName,
  createCommand,
  DailyDebitLimitConsumed,
  dailyDebitLimitDate,
  DailyDebitLimitExceeded,
  DebitFailureReason,
  type DomainEvent,
  EventName,
  formatAmount,
  ThirdPartyAccountCredited,
  ThirdPartyAccountCreditFailed,
  TransactionType,
  TransferStarted,
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
    p: TransferProcess,
    s: ProcessEventScope<TransferProcess>,
    e: Event,
  ): void {
    const m = e as DomainEvent;
    switch (m.name) {
      case EventName.TransferStarted:
        scheduleTransfer(p, s, m);
        return;
      case EventName.AccountDebited:
        consumeDailyDebitLimit(p, s, m);
        return;
      case EventName.AccountDebitDeclined:
        declineTransferDueToDeclinedDebit(p, s, m);
        return;
      case EventName.DailyDebitLimitConsumed:
        creditAccountForTransfer(p, s, m);
        return;
      case EventName.DailyDebitLimitExceeded:
        refundDebitDueToDailyLimitExceeded(p, s, m);
        return;
      case EventName.AccountCredited:
        completeInternalTransfer(p, s, m);
        return;
      case EventName.ThirdPartyAccountCredited:
        approveExternalTransfer(p, s, m);
        return;
      case EventName.ThirdPartyAccountCreditFailed:
        refundTransferDueToFailedExternalCredit(p, s, m);
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
    p: TransferProcess,
    s: ProcessDeadlineScope<TransferProcess>,
    d: Deadline,
  ): void {
    const m = d as TransferReadyToProceed;
    switch (m.name) {
      case DeadlineName.TransferReadyToProceed:
        debitAccountForTransfer(p, s, m);
        return;
      default:
        throw new UnexpectedMessageError();
    }
  },
};

function scheduleTransfer(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: TransferStarted,
) {
  const { data: m } = e;
  s.mutate((root) => {
    root.fromAccountID = m.fromAccountID;
    root.toAccountID = m.toAccountID;
    root.toThirdPartyBank = Boolean(m.toThirdPartyBank);
    root.amount = m.amount;
  });

  const scheduledAt =
    typeof m.scheduledTime === "string"
      ? new Date(m.scheduledTime)
      : m.scheduledTime;

  s.scheduleDeadline(
    createDeadline(DeadlineName.TransferReadyToProceed, {
      transactionID: m.transactionID,
    }),
    scheduledAt,
  );
}

function consumeDailyDebitLimit(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: AccountDebited,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.ConsumeDailyDebitLimit, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      debitType: TransactionType.Transfer,
      amount: m.amount,
      date: dailyDebitLimitDate(m.scheduledTime),
    }),
  );
}

function declineTransferDueToDeclinedDebit(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: AccountDebitDeclined,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.DeclineTransfer, {
      transactionID: m.transactionID,
      fromAccountID: p.fromAccountID,
      toAccountID: p.toAccountID,
      amount: m.amount,
      reason: m.reason,
    }),
  );
}

function creditAccountForTransfer(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: DailyDebitLimitConsumed,
) {
  if (p.toThirdPartyBank) {
    creditExternalAccount(p, s, e);
  } else {
    creditInternalAccount(p, s, e);
  }
}

function creditExternalAccount(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: DailyDebitLimitConsumed,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.CreditThirdPartyAccount, {
      transactionID: m.transactionID,
      accountID: p.toAccountID,
      amount: m.amount,
    }),
  );
}

function creditInternalAccount(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: DailyDebitLimitConsumed,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.CreditAccount, {
      transactionID: m.transactionID,
      accountID: p.toAccountID,
      transactionType: TransactionType.Transfer,
      amount: m.amount,
    }),
  );
}

function refundDebitDueToDailyLimitExceeded(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: DailyDebitLimitExceeded,
) {
  const { data: m } = e;
  s.mutate((root) => {
    root.declineReason = DebitFailureReason.DailyDebitLimitExceeded;
  });
  // compensate the initial debit
  s.executeCommand(
    createCommand(CommandName.CreditAccount, {
      transactionID: m.transactionID,
      accountID: p.fromAccountID,
      transactionType: TransactionType.Transfer,
      amount: m.amount,
    }),
  );
}

function completeInternalTransfer(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: AccountCredited,
) {
  const { data: m } = e;
  if (p.toAccountID === m.accountID) {
    // it was a credit to complete the transfer (success)
    approveInternalTransfer(p, s, e);
  } else {
    // it was a compensating credit to undo the transfer (business rejection)
    declineInternalTransfer(p, s, e);
  }
}

function approveInternalTransfer(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: AccountCredited,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.ApproveTransfer, {
      transactionID: m.transactionID,
      fromAccountID: p.fromAccountID,
      toAccountID: p.toAccountID,
      amount: m.amount,
    }),
  );
}

function declineInternalTransfer(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: AccountCredited,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.DeclineTransfer, {
      transactionID: m.transactionID,
      fromAccountID: p.fromAccountID,
      toAccountID: p.toAccountID,
      amount: m.amount,
      reason: p.declineReason || DebitFailureReason.DailyDebitLimitExceeded,
    }),
  );
}

function approveExternalTransfer(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: ThirdPartyAccountCredited,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.ApproveTransfer, {
      transactionID: m.transactionID,
      fromAccountID: p.fromAccountID,
      toAccountID: p.toAccountID,
      amount: p.amount,
    }),
  );
}

function refundTransferDueToFailedExternalCredit(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: ThirdPartyAccountCreditFailed,
) {
  markTransferAsFailed(p, s, e);
  refundInternalAccount(p, s, e);
}

function markTransferAsFailed(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: ThirdPartyAccountCreditFailed,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.MarkTransferAsFailed, {
      transactionID: m.transactionID,
      fromAccountID: p.fromAccountID,
      toAccountID: p.toAccountID,
      amount: p.amount,
    }),
  );
}

function refundInternalAccount(
  p: TransferProcess,
  s: ProcessEventScope<TransferProcess>,
  e: ThirdPartyAccountCreditFailed,
) {
  const { data: m } = e;
  s.executeCommand(
    createCommand(CommandName.CreditAccount, {
      transactionID: m.transactionID,
      accountID: p.fromAccountID,
      transactionType: TransactionType.Transfer,
      amount: p.amount,
    }),
  );
}

function debitAccountForTransfer(
  p: TransferProcess,
  s: ProcessDeadlineScope<TransferProcess>,
  d: TransferReadyToProceed,
) {
  const { data: m } = d;
  s.executeCommand(
    createCommand(CommandName.DebitAccount, {
      transactionID: m.transactionID,
      accountID: p.fromAccountID,
      transactionType: TransactionType.Transfer,
      amount: p.amount,
      scheduledTime: s.scheduledFor(),
    }),
  );
}
