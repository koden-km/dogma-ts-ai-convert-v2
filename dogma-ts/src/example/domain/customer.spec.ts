import { describe, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import {
  CustomerAcquiredSchema,
  OpenAccountForNewCustomerSchema,
} from "@/example/messages/index.ts";
import {
  begin,
  executeCommand,
  noneOf,
  toRecordEvent,
  toRecordEventOfType,
} from "@/testkit/index.ts";

describe("OpenAccountForNewCustomer", () => {
  describe("when the customer does not exist", () => {
    it("it acquires the customer", () => {
      begin(newApp()).expect(
        executeCommand(
          create(OpenAccountForNewCustomerSchema, {
            customerId: "C001",
            customerName: "Bob Jones",
            accountId: "A001",
            accountName: "Bob Jones",
          }),
        ),
        toRecordEvent(
          create(CustomerAcquiredSchema, {
            customerId: "C001",
            customerName: "Bob Jones",
            accountId: "A001",
            accountName: "Bob Jones",
          }),
        ),
      );
    });
  });

  describe("when the customer already exists", () => {
    it("it does not reacquire the customer", () => {
      const cmd = create(OpenAccountForNewCustomerSchema, {
        customerId: "C001",
        customerName: "Bob Jones",
        accountId: "A001",
        accountName: "Bob Jones",
      });

      begin(newApp())
        .prepare(executeCommand(cmd))
        .expect(
          executeCommand(cmd),
          noneOf(toRecordEventOfType(CustomerAcquiredSchema)),
        );
    });
  });
});
