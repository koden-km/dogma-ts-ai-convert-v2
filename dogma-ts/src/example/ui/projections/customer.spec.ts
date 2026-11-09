import { describe, expect, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import { OpenAccountForNewCustomer } from "@/example/messages/index.ts";
import { mustNewDB } from "@/example/ui/projections/index.ts";
import { begin, executeCommand } from "@/testkit/index.ts";

describe("CustomerProjectionHandler", () => {
  it("when an account is opened for a new customer", () => {
    const db = mustNewDB();
    try {
      begin(newApp(db))
        .enableHandlers("customers")
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

      const rows = db
        .prepare(
          `SELECT
            id,
            name
          FROM customers`,
        )
        .all() as Array<{ id: string; name: string }>;

      expect(rows).toEqual([
        {
          id: "C001",
          name: "Anna Smith",
        },
      ]);
    } finally {
      db.close();
    }
  });
});
