import { describe, it } from "vitest";
import { newApp } from "@/example/app.ts";
import {
  CommandName,
  createCommand,
  createEvent,
  EventName,
} from "@/example/messages/index.ts";
import { begin, executeCommand, toRecordEvent } from "@/testkit/index.ts";

describe("ThirdPartyBankIntegrationHandler", () => {
  describe("when a credit is requested", () => {
    it("it credits the account if the account ID is numeric", () => {
      begin(newApp())
        .enableHandlers("third-party-bank")
        .prepare(
          executeCommand(
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
          executeCommand(
            createCommand(CommandName.Deposit, {
              transactionID: "D001",
              accountID: "A001",
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Transfer, {
              transactionID: "T001",
              fromAccountID: "A001",
              toAccountID: "100001",
              amount: 100n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
              toThirdPartyBank: true,
            }),
          ),
          toRecordEvent(
            createEvent(EventName.ThirdPartyAccountCredited, {
              transactionID: "T001",
              accountID: "100001",
              amount: 100n,
            }),
          ),
        );
    });

    it("it fails the credit if the account ID is not numeric", () => {
      begin(newApp())
        .enableHandlers("third-party-bank")
        .prepare(
          executeCommand(
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
          executeCommand(
            createCommand(CommandName.Deposit, {
              transactionID: "D001",
              accountID: "A001",
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Transfer, {
              transactionID: "T001",
              fromAccountID: "A001",
              toAccountID: "EXT001",
              amount: 100n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
              toThirdPartyBank: true,
            }),
          ),
          toRecordEvent(
            createEvent(EventName.ThirdPartyAccountCreditFailed, {
              transactionID: "T001",
              accountID: "EXT001",
              amount: 100n,
            }),
          ),
        );
    });
  });
});
