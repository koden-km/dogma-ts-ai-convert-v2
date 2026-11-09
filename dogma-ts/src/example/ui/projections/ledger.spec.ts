import { describe, expect, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import {
  Deposit,
  OpenAccountForNewCustomer,
  Transfer,
  Withdraw,
} from "@/example/messages/index.ts";
import { mustNewDB } from "@/example/ui/projections/index.ts";
import { begin, executeCommand } from "@/testkit/index.ts";

describe("LedgerProjectionHandler", () => {
  it("when an account is opened", () => {
    const db = mustNewDB();
    try {
      begin(newApp(db))
        .enableHandlers("ledger")
        .prepare(
          executeCommand(
            create(OpenAccountForNewCustomer, {
              customerId: "C001",
              customerName: "Anna Smith",
              accountId: "A001",
              accountName: "Savings",
            }),
          ),
        );

      const row = db
        .prepare(
          `SELECT
            name,
            customer_id,
            balance
          FROM accounts
          WHERE id = 'A001'`,
        )
        .get() as
        | { name: string; customer_id: string; balance: number }
        | undefined;

      expect(row).toEqual({
        name: "Savings",
        customer_id: "C001",
        balance: 0,
      });
    } finally {
      db.close();
    }
  });

  it("when an account is credited", () => {
    const db = mustNewDB();
    try {
      begin(newApp(db))
        .enableHandlers("ledger")
        .prepare(
          executeCommand(
            create(OpenAccountForNewCustomer, {
              customerId: "C001",
              customerName: "Anna Smith",
              accountId: "A001",
              accountName: "Savings",
            }),
          ),
          executeCommand(
            create(Deposit, {
              transactionId: "T001",
              accountId: "A001",
              amount: 150n,
            }),
          ),
        );

      const accountRow = db
        .prepare(
          `SELECT balance
          FROM accounts
          WHERE id = 'A001'`,
        )
        .get() as { balance: number } | undefined;

      expect(accountRow?.balance).toBe(150);

      const ledgerRow = db
        .prepare(
          `SELECT
            description,
            debit,
            credit,
            balance
          FROM ledger
          WHERE account_id = 'A001'`,
        )
        .get() as
        | {
            description: string;
            debit: number;
            credit: number;
            balance: number;
          }
        | undefined;

      expect(ledgerRow).toEqual({
        description: "Deposit",
        debit: 0,
        credit: 150,
        balance: 150,
      });
    } finally {
      db.close();
    }
  });

  it("when an account is debited", () => {
    const db = mustNewDB();
    try {
      begin(newApp(db))
        .enableHandlers("ledger")
        .prepare(
          executeCommand(
            create(OpenAccountForNewCustomer, {
              customerId: "C001",
              customerName: "Anna Smith",
              accountId: "A001",
              accountName: "Savings",
            }),
          ),
          executeCommand(
            create(Deposit, {
              transactionId: "T001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
          executeCommand(
            create(Withdraw, {
              transactionId: "T002",
              accountId: "A001",
              amount: 150n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
        );

      const accountRow = db
        .prepare(
          `SELECT balance
          FROM accounts
          WHERE id = 'A001'`,
        )
        .get() as { balance: number } | undefined;

      expect(accountRow?.balance).toBe(350);

      const ledgerRow = db
        .prepare(
          `SELECT
            description,
            debit,
            credit,
            balance
          FROM ledger
          WHERE account_id = 'A001'
            AND transaction_id = 'T002'`,
        )
        .get() as
        | {
            description: string;
            debit: number;
            credit: number;
            balance: number;
          }
        | undefined;

      expect(ledgerRow).toEqual({
        description: "Withdrawal",
        debit: 150,
        credit: 0,
        balance: 350,
      });
    } finally {
      db.close();
    }
  });

  it("when a transfer is approved", () => {
    const db = mustNewDB();
    try {
      begin(newApp(db))
        .enableHandlers("ledger")
        .prepare(
          executeCommand(
            create(OpenAccountForNewCustomer, {
              customerId: "C001",
              customerName: "Anna Smith",
              accountId: "A001",
              accountName: "Savings",
            }),
          ),
          executeCommand(
            create(OpenAccountForNewCustomer, {
              customerId: "C002",
              customerName: "Bob Jones",
              accountId: "A002",
              accountName: "Checking",
            }),
          ),
          executeCommand(
            create(Deposit, {
              transactionId: "T001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
          executeCommand(
            create(Transfer, {
              transactionId: "T002",
              fromAccountId: "A001",
              toAccountId: "A002",
              amount: 200n,
              toThirdPartyBank: false,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
        );

      const debitRow = db
        .prepare(
          `SELECT description
          FROM ledger
          WHERE account_id = 'A001'
            AND transaction_id = 'T002'
            AND debit > 0`,
        )
        .get() as { description: string } | undefined;

      expect(debitRow?.description).toBe("Outgoing transfer");

      const creditRow = db
        .prepare(
          `SELECT description
          FROM ledger
          WHERE account_id = 'A002'
            AND transaction_id = 'T002'
            AND credit > 0`,
        )
        .get() as { description: string } | undefined;

      expect(creditRow?.description).toBe("Incoming transfer");
    } finally {
      db.close();
    }
  });

  it("when a transfer is declined after debiting", () => {
    const db = mustNewDB();
    try {
      begin(newApp(db))
        .enableHandlers("ledger")
        .prepare(
          executeCommand(
            create(OpenAccountForNewCustomer, {
              customerId: "C001",
              customerName: "Anna Smith",
              accountId: "A001",
              accountName: "Savings",
            }),
          ),
          executeCommand(
            create(OpenAccountForNewCustomer, {
              customerId: "C002",
              customerName: "Bob Jones",
              accountId: "A002",
              accountName: "Checking",
            }),
          ),
          executeCommand(
            create(Deposit, {
              transactionId: "T001",
              accountId: "A001",
              amount: 1000000n,
            }),
          ),
          executeCommand(
            create(Transfer, {
              transactionId: "T002",
              fromAccountId: "A001",
              toAccountId: "A002",
              amount: 900001n,
              toThirdPartyBank: false,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
        );

      const refundRow = db
        .prepare(
          `SELECT description
          FROM ledger
          WHERE account_id = 'A001'
            AND transaction_id = 'T002'
            AND credit > 0`,
        )
        .get() as { description: string } | undefined;

      expect(refundRow?.description).toBe("Outgoing transfer refund");
    } finally {
      db.close();
    }
  });
});
