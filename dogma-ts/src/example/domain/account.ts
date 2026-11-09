import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  type AggregateRoot,
  type Command,
  create,
  type Event,
  handlesCommand,
  recordsEvent,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  AccountCredited,
  AccountDebitDeclined,
  AccountDebited,
  AccountOpened,
  CreditAccount,
  DebitAccount,
  DebitFailureReason,
  type DomainCommand,
  type DomainEvent,
  formatAmount,
  OpenAccount,
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
      handlesCommand(OpenAccount),
      handlesCommand(CreditAccount),
      handlesCommand(DebitAccount),
      recordsEvent(AccountOpened),
      recordsEvent(AccountCredited),
      recordsEvent(AccountDebited),
      recordsEvent(AccountDebitDeclined),
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
    switch (m.$typeName) {
      case AccountOpened.typeName:
        r.name = m.accountName;
        break;
      case AccountCredited.typeName:
        r.balance += m.amount;
        break;
      case AccountDebited.typeName:
        r.balance -= m.amount;
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
    switch (m.$typeName) {
      case OpenAccount.typeName:
        return m.accountId;
      case CreditAccount.typeName:
        return m.accountId;
      case DebitAccount.typeName:
        return m.accountId;
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
    switch (m.$typeName) {
      case OpenAccount.typeName:
        return openAccount(r, s, m);
      case CreditAccount.typeName:
        return creditAccount(r, s, m);
      case DebitAccount.typeName:
        return debitAccount(r, s, m);
      default:
        throw new UnexpectedMessageError();
    }
  },
};

function openAccount(
  r: Account,
  s: AggregateCommandScope<Account>,
  m: OpenAccount,
) {
  if (r.name !== "") {
    s.log("account has already been opened");
    return;
  }

  s.recordEvent(
    create(AccountOpened, {
      customerId: m.customerId,
      accountId: m.accountId,
      accountName: m.accountName,
    }),
  );
}

function creditAccount(
  _r: Account,
  s: AggregateCommandScope<Account>,
  m: CreditAccount,
) {
  s.recordEvent(
    create(AccountCredited, {
      transactionId: m.transactionId,
      accountId: m.accountId,
      transactionType: m.transactionType,
      amount: m.amount,
    }),
  );
}

function debitAccount(
  r: Account,
  s: AggregateCommandScope<Account>,
  m: DebitAccount,
) {
  if (hasSufficientFunds(r, m.amount)) {
    s.recordEvent(
      create(AccountDebited, {
        transactionId: m.transactionId,
        accountId: m.accountId,
        transactionType: m.transactionType,
        amount: m.amount,
        scheduledTime: m.scheduledTime,
      }),
    );
  } else {
    s.recordEvent(
      create(AccountDebitDeclined, {
        transactionId: m.transactionId,
        accountId: m.accountId,
        transactionType: m.transactionType,
        amount: m.amount,
        reason: DebitFailureReason.INSUFFICIENT_FUNDS,
      }),
    );
  }
}

function hasSufficientFunds(r: Account, amount: bigint): boolean {
  return r.balance >= amount;
}
