import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  type Event,
  handlesCommand,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  CommandName,
  type CreditAccount,
  createEvent,
  type DebitAccount,
  DebitFailureReason,
  type DomainCommand,
  type DomainEvent,
  EventName,
  formatAmount,
  type OpenAccount,
} from "../messages/index.ts";

// Account is the aggregate root for a bank account.
export type Account = AggregateRoot & {
  // name is the account name.
  name: string;

  // balance is the current account balance, in cents.
  balance: bigint;
};

// AccountHandler implements the business logic for a bank account.
//
// It centralizes all transactions that are applied to an account in order to
// enforce a strict no-overdraw policy.
export const AccountHandler: AggregateMessageHandler<Account> = {
  configure(c: AggregateConfigurer): void {
    c.identity("account", "fcce9a78-23a3-4211-b608-ecbe21ea446f");

    c.routes(
      handlesCommand<OpenAccount>(CommandName.OpenAccount),
      handlesCommand<CreditAccount>(CommandName.CreditAccount),
      handlesCommand<DebitAccount>(CommandName.DebitAccount),
      recordsEvent(EventName.AccountOpened),
      recordsEvent(EventName.AccountCredited),
      recordsEvent(EventName.AccountDebited),
      recordsEvent(EventName.AccountDebitDeclined),
    );
  },

  newRoot(): Account {
    return {
      name: "",
      balance: 0n,
    };
  },

  describeInstance(r: Account): string {
    if (r.name === "") {
      return "";
    }
    return `${r.name} (${formatAmount(r.balance)})`;
  },

  applyEvent(r: Account, e: Event): void {
    const m = e as DomainEvent;
    switch (m.name) {
      case EventName.AccountOpened:
        r.name = m.data.accountName;
        break;
      case EventName.AccountCredited:
        r.balance += m.data.amount;
        break;
      case EventName.AccountDebited:
        r.balance -= m.data.amount;
        break;
    }
  },

  marshal(r: Account): string {
    return JSON.stringify({
      name: r.name,
      balance: r.balance.toString(),
    });
  },

  unmarshal(r: Account, data: string | Uint8Array): void {
    const text =
      typeof data === "string" ? data : new TextDecoder().decode(data);
    const parsed = JSON.parse(text) as { name: string; balance: string };
    r.name = parsed.name;
    r.balance = BigInt(parsed.balance);
  },

  routeCommandToInstance(c: Command): string {
    const m = c as DomainCommand;
    switch (m.name) {
      case CommandName.OpenAccount:
        return m.data.accountID;
      case CommandName.CreditAccount:
        return m.data.accountID;
      case CommandName.DebitAccount:
        return m.data.accountID;
      default:
        throw new UnexpectedMessageError();
    }
  },

  handleCommand(
    r: Account,
    s: AggregateCommandScope<Account>,
    c: Command,
  ): void {
    const m = c as DomainCommand;
    switch (m.name) {
      case CommandName.OpenAccount:
        return openAccount(r, s, m);
      case CommandName.CreditAccount:
        return creditAccount(r, s, m);
      case CommandName.DebitAccount:
        return debitAccount(r, s, m);
      default:
        throw new UnexpectedMessageError();
    }
  },
};

function openAccount(
  r: Account,
  s: AggregateCommandScope<Account>,
  { data: m }: OpenAccount,
) {
  if (r.name !== "") {
    s.log("account has already been opened");
    return;
  }

  s.recordEvent(
    createEvent(EventName.AccountOpened, {
      customerID: m.customerID,
      accountID: m.accountID,
      accountName: m.accountName,
    }),
  );
}

function creditAccount(
  _r: Account,
  s: AggregateCommandScope<Account>,
  { data: m }: CreditAccount,
) {
  s.recordEvent(
    createEvent(EventName.AccountCredited, {
      transactionID: m.transactionID,
      accountID: m.accountID,
      transactionType: m.transactionType,
      amount: m.amount,
    }),
  );
}

function debitAccount(
  r: Account,
  s: AggregateCommandScope<Account>,
  { data: m }: DebitAccount,
) {
  if (hasSufficientFunds(r, m.amount)) {
    s.recordEvent(
      createEvent(EventName.AccountDebited, {
        transactionID: m.transactionID,
        accountID: m.accountID,
        transactionType: m.transactionType,
        amount: m.amount,
        scheduledTime: m.scheduledTime,
      }),
    );
  } else {
    s.recordEvent(
      createEvent(EventName.AccountDebitDeclined, {
        transactionID: m.transactionID,
        accountID: m.accountID,
        transactionType: m.transactionType,
        amount: m.amount,
        reason: DebitFailureReason.InsufficientFunds,
      }),
    );
  }
}

function hasSufficientFunds(r: Account, amount: bigint): boolean {
  return r.balance >= amount;
}
