import type { DatabaseSync } from "node:sqlite";
import {
  type Context,
  type Event,
  handlesEvent,
  type ProjectionConfigurer,
  type ProjectionEventScope,
  type ProjectionResetScope,
  UnexpectedMessageError,
} from "@/dogma/index.ts";
import {
  type DomainEvent,
  EventName,
  TransactionType,
} from "@/example/messages/index.ts";
import {
  type MessageHandler,
  NoCompactBehavior,
} from "@/projectionkit/sqlprojection/index.ts";

// creditDescription returns the human-readable description for a credit entry
// in the ledger.
//
// If isRefund is true, the description indicates that the credit is a refund of
// a prior debit within the same transaction.
function creditDescription(t: TransactionType, isRefund: boolean): string {
  if (isRefund) {
    return `${debitDescription(t)} refund`;
  }

  switch (t) {
    case TransactionType.Deposit:
      return "Deposit";
    case TransactionType.Transfer:
      return "Incoming transfer";
    default:
      throw new Error(`unrecognized transaction type for credit: ${String(t)}`);
  }
}

// debitDescription returns the human-readable description for a debit entry in
// the ledger.
function debitDescription(t: TransactionType): string {
  switch (t) {
    case TransactionType.Withdrawal:
      return "Withdrawal";
    case TransactionType.Transfer:
      return "Outgoing transfer";
    default:
      throw new Error(`unrecognized transaction type for debit: ${String(t)}`);
  }
}

// LedgerProjectionHandler maintains account balances and a ledger of
// transactions against each account.
//
// It handles both the accounts and ledger tables within a single projection to
// ensure the running balance recorded on each ledger entry is consistent with
// the account balance.
//
// The UI queries the accounts table to list a customer's accounts and their
// balances, and the ledger table to display transaction history.
export const LedgerProjectionHandler: MessageHandler = {
  ...NoCompactBehavior,

  configure(c: ProjectionConfigurer): void {
    c.identity("ledger", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    c.routes(
      handlesEvent(EventName.AccountOpened),
      handlesEvent(EventName.AccountCredited),
      handlesEvent(EventName.AccountDebited),
    );
  },

  handleEvent(
    _ctx: Context,
    tx: DatabaseSync,
    s: ProjectionEventScope,
    m: Event,
  ): void {
    const e = m as DomainEvent;

    switch (e.name) {
      case EventName.AccountOpened: {
        const stmt = tx.prepare(`
          INSERT INTO accounts (
            id,
            name,
            customer_id
          ) VALUES (
            ?,
            ?,
            ?
          )
        `);
        stmt.run(e.data.accountID, e.data.accountName, e.data.customerID);
        return;
      }

      case EventName.AccountCredited: {
        const updateStmt = tx.prepare(`
          UPDATE accounts SET
            balance = balance + ?
          WHERE id = ?
          RETURNING balance
        `);
        const balRow = updateStmt.get(e.data.amount, e.data.accountID) as
          | { balance: number | bigint }
          | undefined;
        if (!balRow) {
          throw new Error(`account ${e.data.accountID} not found`);
        }

        const refundStmt = tx.prepare(`
          SELECT EXISTS (
            SELECT 1 FROM ledger
            WHERE account_id = ?
              AND transaction_id = ?
              AND debit > 0
          ) AS is_refund
        `);
        const refundRow = refundStmt.get(
          e.data.accountID,
          e.data.transactionID,
        ) as { is_refund: number | bigint } | undefined;
        const isRefund = Boolean(refundRow?.is_refund);

        const insertStmt = tx.prepare(`
          INSERT INTO ledger (
            account_id,
            transaction_id,
            transaction_order,
            description,
            credit,
            balance,
            created_at
          ) VALUES (
            ?,
            ?,
            (SELECT COUNT(*) FROM ledger WHERE transaction_id = ?),
            ?,
            ?,
            ?,
            ?
          )
        `);
        insertStmt.run(
          e.data.accountID,
          e.data.transactionID,
          e.data.transactionID,
          creditDescription(e.data.transactionType, isRefund),
          e.data.amount,
          balRow.balance,
          s.recordedAt().toISOString(),
        );
        return;
      }

      case EventName.AccountDebited: {
        const updateStmt = tx.prepare(`
          UPDATE accounts SET
            balance = balance - ?
          WHERE id = ?
          RETURNING balance
        `);
        const balRow = updateStmt.get(e.data.amount, e.data.accountID) as
          | { balance: number | bigint }
          | undefined;
        if (!balRow) {
          throw new Error(`account ${e.data.accountID} not found`);
        }

        const insertStmt = tx.prepare(`
          INSERT INTO ledger (
            account_id,
            transaction_id,
            transaction_order,
            description,
            debit,
            balance,
            created_at
          ) VALUES (
            ?,
            ?,
            (SELECT COUNT(*) FROM ledger WHERE transaction_id = ?),
            ?,
            ?,
            ?,
            ?
          )
        `);
        insertStmt.run(
          e.data.accountID,
          e.data.transactionID,
          e.data.transactionID,
          debitDescription(e.data.transactionType),
          e.data.amount,
          balRow.balance,
          s.recordedAt().toISOString(),
        );
        return;
      }

      default:
        throw new UnexpectedMessageError();
    }
  },

  reset(_ctx: Context, tx: DatabaseSync, _s: ProjectionResetScope): void {
    tx.exec(`DELETE FROM ledger`);
    tx.exec(`DELETE FROM accounts`);
  },
};
