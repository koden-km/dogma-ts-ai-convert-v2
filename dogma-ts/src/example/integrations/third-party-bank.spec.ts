import { describe, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import {
  DepositSchema,
  OpenAccountSchema,
  ThirdPartyAccountCreditedSchema,
  ThirdPartyAccountCreditFailedSchema,
  TransferSchema,
} from "@/example/messages/index.ts";
import { begin, executeCommand, toRecordEvent } from "@/testkit/index.ts";

describe("ThirdPartyBankIntegrationHandler", () => {
  describe("when a credit is requested", () => {
    it("it credits the account if the account ID is numeric", () => {
      begin(newApp())
        .enableHandlers("third-party-bank")
        .prepare(
          executeCommand(
            create(OpenAccountSchema, {
              customerId: "C001",
              accountId: "A001",
              accountName: "Anna Smith",
            }),
          ),
          executeCommand(
            create(DepositSchema, {
              transactionId: "D001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(TransferSchema, {
              transactionId: "T001",
              fromAccountId: "A001",
              toAccountId: "100001",
              amount: 100n,
              scheduledTime: "2001-02-03T00:00:00Z",
              toThirdPartyBank: true,
            }),
          ),
          toRecordEvent(
            create(ThirdPartyAccountCreditedSchema, {
              transactionId: "T001",
              accountId: "100001",
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
            create(OpenAccountSchema, {
              customerId: "C001",
              accountId: "A001",
              accountName: "Anna Smith",
            }),
          ),
          executeCommand(
            create(DepositSchema, {
              transactionId: "D001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(TransferSchema, {
              transactionId: "T001",
              fromAccountId: "A001",
              toAccountId: "EXT001",
              amount: 100n,
              scheduledTime: "2001-02-03T00:00:00Z",
              toThirdPartyBank: true,
            }),
          ),
          toRecordEvent(
            create(ThirdPartyAccountCreditFailedSchema, {
              transactionId: "T001",
              accountId: "EXT001",
              amount: 100n,
            }),
          ),
        );
    });
  });
});
