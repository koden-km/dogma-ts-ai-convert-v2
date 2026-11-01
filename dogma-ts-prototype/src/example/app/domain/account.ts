// package domain

// import (
//   "github.com/dogmatiq/dogma"
//   "github.com/dogmatiq/example/messages"
//   "github.com/dogmatiq/example/messages/commands"
//   "github.com/dogmatiq/example/messages/events"
// )

import { Command, Event, UnexpectedMessageError } from "@/dogma/message.ts";
import {
  AggregateCommandScope,
  AggregateConfigurer,
  AggregateMessageHandler,
  AggregateRoot,
} from "@/dogma/aggregate.ts";
import {
  CreditAccount,
  DebitAccount,
  DomainCommand,
  OpenAccount,
} from "../messages/commands/account.ts";
import { CommandName } from "../messages/commands/commands.ts";
import {
  createEvent,
  DomainEvent,
  EventName,
} from "../messages/events/events.ts";
import { DebitFailureReason } from "../messages/transaction.ts";
import { formatAmount } from "../messages/format.ts";

// NOTE(KM): It might be good to make this current `Account` be `AccountRoot`
// and have just the state itself be `Account` (or `AccountState`)?
// That clarifies the usage of what you are given, as the root is only used by
// outer parts and the state used internally.

// Account is the aggregate root for a bank account.
export type Account = AggregateRoot & {
  // Name is the account name.
  name: string;

  // Balance is the current account balance, in cents.
  balance: bigint;
};

// AccountHandler implements the business logic for a bank account.
//
// It centralizes all transactions that are applied to an account in order to
// enforce a strict no-overdraw policy.
export const AccountHandler: AggregateMessageHandler<Account> = {
  configure(c: AggregateConfigurer): void {
    c.identity("account", "fcce9a78-23a3-4211-b608-ecbe21ea446f");

    // c.routes(
    //   // dogma.HandlesCommand[commands.OpenAccount](),
    //   //   dogma.HandlesCommand[commands.CreditAccount](),
    //   //   dogma.HandlesCommand[commands.DebitAccount](),
    //   //   dogma.RecordsEvent[events.AccountOpened](),
    //   //   dogma.RecordsEvent[events.AccountCredited](),
    //   //   dogma.RecordsEvent[events.AccountDebited](),
    //   //   dogma.RecordsEvent[events.AccountDebitDeclined](),
    // );
  },

  newRoot(): Account {
    return {
      name: "",
      balance: 0n,

      // ----------------------------------------
      // NOTE(KM): Not sure if these functions should be created in every
      // instance of the AggregateRoot type (eg. Account) or as separate
      // functions that take the instance to read/write.
      // Separate could be safer/pure?
      // I probably need to wait until I convert the thing that calls this...
      //
      // Example, predefine function outside this block and take the instance to mutate:
      //   function applyEvent(r: Account, e: Event): void {
      //     const m = e as DomainEvent;
      //     switch (m.name) {
      //       case EventName.AccountOpened:
      //         r.name = m.data.accountName;
      //         break;
      //       case EventName.AccountCredited:
      //         r.balance += m.data.amount;
      //         break;
      //   ...
      //
      // The `newRoot()` returned object will still need the functions assigned to satisfy type, but that is simpler
      //   newRoot(): Account {
      //     return {
      //       name: "",
      //       balance: 0n,
      //
      //       aggregateInstanceDescription,
      //       applyEvent,
      //       marshal,
      //       unmarshal,
      //   }
      // ----------------------------------------

      aggregateInstanceDescription(): string {
        if (this.name === "") {
          return "";
        }
        return `${this.name} (${formatAmount(this.balance)})`;
      },

      applyEvent(e: Event): void {
        const m = e as DomainEvent;
        switch (m.name) {
          case EventName.AccountOpened:
            this.name = m.data.accountName;
            break;
          case EventName.AccountCredited:
            this.balance += m.data.amount;
            break;
          case EventName.AccountDebited:
            this.balance -= m.data.amount;
            break;
        }
      },

      marshal(): string {
        return JSON.stringify({
          name: this.name,
          balance: this.balance.toString(),
        });
      },

      unmarshal(data: string): void {
        const parsed = JSON.parse(data) as Account;
        this.name = parsed.name;
        this.balance = BigInt(parsed.balance);
      },
    };
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
  r: Account,
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
