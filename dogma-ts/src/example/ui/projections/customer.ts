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
  CustomerAcquired,
  type DomainEvent,
} from "@/example/messages/index.ts";
import {
  type MessageHandler,
  NoCompactBehavior,
} from "@/projectionkit/sqlprojection/index.ts";

// CustomerProjectionHandler maintains a list of the bank's customers.
//
// The UI queries the customers table to populate the login page, which simply
// lets the user pick an existing customer rather than performing any real
// authentication. It is also used to display the customer's name throughout the
// interface.
export const CustomerProjectionHandler: MessageHandler = {
  ...NoCompactBehavior,

  configure(c: ProjectionConfigurer): void {
    c.identity("customers", "70b58269-931a-46d6-b745-286a670fb6f7");

    c.routes(handlesEvent(CustomerAcquired));
  },

  handleEvent(
    _ctx: Context,
    tx: DatabaseSync,
    _s: ProjectionEventScope,
    m: Event,
  ): void {
    const e = m as DomainEvent;

    switch (e.$typeName) {
      case CustomerAcquired.typeName: {
        const stmt = tx.prepare(`
          INSERT INTO customers (
            id,
            name
          ) VALUES (
            ?,
            ?
          )
        `);
        stmt.run(e.customerId, e.customerName);
        return;
      }

      default:
        throw new UnexpectedMessageError();
    }
  },

  reset(_ctx: Context, tx: DatabaseSync, _s: ProjectionResetScope): void {
    tx.exec(`DELETE FROM customers`);
  },
};
