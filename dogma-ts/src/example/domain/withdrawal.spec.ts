import { describe, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import { maximumDailyDebitLimit } from "@/example/domain/daily-debit-limit.ts";
import {
  DebitFailureReason,
  DepositSchema,
  OpenAccountSchema,
  WithdrawalApprovedSchema,
  WithdrawalDeclinedSchema,
  WithdrawSchema,
} from "@/example/messages/index.ts";
import { begin, executeCommand, toRecordEvent } from "@/testkit/index.ts";

const expectedDailyDebitLimit = maximumDailyDebitLimit;

describe("Withdraw", () => {
  describe("when there are sufficient funds", () => {
    it("it withdraws the funds from the account", () => {
      begin(newApp())
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
              transactionId: "T001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T002",
              accountId: "A001",
              amount: 500n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalApprovedSchema, {
              transactionId: "T002",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        );
    });
  });

  describe("when there are insufficient funds", () => {
    it("it does not withdraw funds from the account", () => {
      begin(newApp())
        .prepare(
          executeCommand(
            create(OpenAccountSchema, {
              customerId: "C001",
              accountId: "A001",
              accountName: "Anna Smith",
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: 500n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalDeclinedSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: 500n,
              reason: DebitFailureReason.INSUFFICIENT_FUNDS,
            }),
          ),
        );
    });
  });

  describe("when the withdrawal does not exceed the daily debit limit", () => {
    it("it withdraws the funds from the account", () => {
      begin(newApp())
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
              transactionId: "T001",
              accountId: "A001",
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T002",
              accountId: "A001",
              amount: 500n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalApprovedSchema, {
              transactionId: "T002",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        );
    });

    it("it enforces the daily debit limit per account", () => {
      begin(newApp())
        .prepare(
          executeCommand(
            create(OpenAccountSchema, {
              customerId: "C001",
              accountId: "A001",
              accountName: "Anna Smith",
            }),
          ),
          executeCommand(
            create(OpenAccountSchema, {
              customerId: "C002",
              accountId: "A002",
              accountName: "Bob Jones",
            }),
          ),
          executeCommand(
            create(DepositSchema, {
              transactionId: "D001",
              accountId: "A001",
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
          executeCommand(
            create(DepositSchema, {
              transactionId: "D002",
              accountId: "A002",
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: expectedDailyDebitLimit,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalApprovedSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: expectedDailyDebitLimit,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T002",
              accountId: "A002",
              amount: expectedDailyDebitLimit,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalApprovedSchema, {
              transactionId: "T002",
              accountId: "A002",
              amount: expectedDailyDebitLimit,
            }),
          ),
        );
    });

    it("it enforces the daily debit limit per day", () => {
      begin(newApp())
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
              amount: expectedDailyDebitLimit * 2n,
            }),
          ),
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: expectedDailyDebitLimit,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T002",
              accountId: "A001",
              amount: 500n,
              scheduledTime: "2001-02-04T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalApprovedSchema, {
              transactionId: "T002",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        );
    });

    it("it declines a second withdrawal that cumulatively exceeds the daily limit", () => {
      begin(newApp())
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
              amount: expectedDailyDebitLimit + 1n,
            }),
          ),
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: expectedDailyDebitLimit / 2n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T002",
              accountId: "A001",
              amount: expectedDailyDebitLimit / 2n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T003",
              accountId: "A001",
              amount: 1n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalDeclinedSchema, {
              transactionId: "T003",
              accountId: "A001",
              amount: 1n,
              reason: DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED,
            }),
          ),
        );
    });
  });

  describe("when the withdrawal exceeds the daily debit limit", () => {
    it("it does not withdraw any funds from the account", () => {
      begin(newApp())
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
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: expectedDailyDebitLimit + 1n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalDeclinedSchema, {
              transactionId: "T001",
              accountId: "A001",
              amount: expectedDailyDebitLimit + 1n,
              reason: DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED,
            }),
          ),
        );
    });
  });
});
