import { describe, it } from "vitest";
import { newApp } from "@/example/app.ts";
import {
  CommandName,
  createCommand,
  createEvent,
  EventName,
} from "@/example/messages/index.ts";
import { begin, executeCommand, toRecordEvent } from "@/testkit/index.ts";

describe("Deposit", () => {
  describe("when the deposit has not yet started", () => {
    it("it deposits the funds into the account", () => {
      begin(newApp())
        .prepare(
          executeCommand(
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Deposit, {
              transactionID: "T001",
              accountID: "A001",
              amount: 500n,
            }),
          ),
          toRecordEvent(
            createEvent(EventName.DepositApproved, {
              transactionID: "T001",
              accountID: "A001",
              amount: 500n,
            }),
          ),
        )
        // verify that funds are available
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "W001",
              accountID: "A001",
              amount: 100n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalApproved, {
              transactionID: "W001",
              accountID: "A001",
              amount: 100n,
            }),
          ),
        );
    });
  });
});
