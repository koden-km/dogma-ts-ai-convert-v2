import { describe, it } from "vitest";
import { newApp } from "@/example/app.ts";
import {
  CommandName,
  createCommand,
  createEvent,
  EventName,
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
          createCommand(CommandName.OpenAccountForNewCustomer, {
            customerID: "C001",
            customerName: "Bob Jones",
            accountID: "A001",
            accountName: "Bob Jones",
          }),
        ),
        toRecordEvent(
          createEvent(EventName.CustomerAcquired, {
            customerID: "C001",
            customerName: "Bob Jones",
            accountID: "A001",
            accountName: "Bob Jones",
          }),
        ),
      );
    });
  });

  describe("when the customer already exists", () => {
    it("it does not reacquire the customer", () => {
      const cmd = createCommand(CommandName.OpenAccountForNewCustomer, {
        customerID: "C001",
        customerName: "Bob Jones",
        accountID: "A001",
        accountName: "Bob Jones",
      });

      begin(newApp())
        .prepare(executeCommand(cmd))
        .expect(
          executeCommand(cmd),
          noneOf(toRecordEventOfType(EventName.CustomerAcquired)),
        );
    });
  });
});
