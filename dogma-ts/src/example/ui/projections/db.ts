import { DatabaseSync } from "node:sqlite";
import { backgroundContext, type Context } from "@/dogma/index.ts";
import { SQLiteDriver } from "@/projectionkit/sqlprojection/index.ts";

export { DatabaseSync };

const CUSTOMER_SCHEMA = `
-- customers contains one row per bank customer.
--
-- It is populated by the "customers" projection, implemented by the
-- CustomerProjectionHandler in customer.ts.
CREATE TABLE IF NOT EXISTS customers (
    id   TEXT NOT NULL, -- unique customer identifier
    name TEXT NOT NULL, -- customer's full name

    PRIMARY KEY (id)
);
`;

const LEDGER_SCHEMA = `
-- accounts contains one row per bank account, with a running balance.
--
-- It is populated by the "ledger" projection, implemented by the
-- LedgerProjectionHandler in ledger.ts.
CREATE TABLE IF NOT EXISTS accounts (
    id          TEXT    NOT NULL,           -- unique account identifier
    name        TEXT    NOT NULL,           -- display name chosen by the customer
    customer_id TEXT    NOT NULL,           -- owner of the account
    balance     INTEGER NOT NULL DEFAULT 0, -- current balance, in cents

    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_customer ON accounts (customer_id);

-- ledger records each credit or debit against an account.
--
-- It is populated by the "ledger" projection, implemented by the
-- LedgerProjectionHandler in ledger.ts.
CREATE TABLE IF NOT EXISTS ledger (
    account_id        TEXT      NOT NULL,            -- account this entry belongs to
    transaction_id    TEXT      NOT NULL DEFAULT '', -- transaction that produced this entry
    transaction_order INTEGER   NOT NULL DEFAULT 0,  -- order of this entry within its transaction
    description       TEXT      NOT NULL,            -- human-readable description shown in the UI
    debit             INTEGER   NOT NULL DEFAULT 0,  -- amount debited, in cents
    credit            INTEGER   NOT NULL DEFAULT 0,  -- amount credited, in cents
    balance           INTEGER   NOT NULL,            -- running account balance after this entry, in cents
    created_at        TIMESTAMP NOT NULL,            -- time the originating event was recorded

    PRIMARY KEY (account_id, transaction_id, transaction_order)
);
`;

// newDB returns an in-memory SQLite database, with database tables necessary to
// run the example application.
export function newDB(): DatabaseSync {
  const ctx = backgroundContext();
  const db = new DatabaseSync(":memory:");

  try {
    SQLiteDriver.createSchema(ctx, db);
    createSchema(ctx, db);
    return db;
  } catch (err) {
    db.close();
    throw err;
  }
}

// mustNewDB returns an in-memory SQLite database, with database tables
// necessary to run the example application.
export function mustNewDB(): DatabaseSync {
  return newDB();
}

// createSchema creates the schema elements required by the projection handlers.
export function createSchema(_ctx: Context, db: DatabaseSync): void {
  db.exec(CUSTOMER_SCHEMA);
  db.exec(LEDGER_SCHEMA);
}
