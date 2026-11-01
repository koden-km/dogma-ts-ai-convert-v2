import { describe, it } from "vitest";
import { newApp } from "@/example/app.ts";
import { maximumDailyDebitLimit } from "@/example/domain/daily-debit-limit.ts";
import {
  CommandName,
  createCommand,
  createEvent,
  DebitFailureReason,
  EventName,
} from "@/example/messages/index.ts";
import { begin, executeCommand, toRecordEvent } from "@/testkit/index.ts";

const expectedDailyDebitLimit = maximumDailyDebitLimit;

describe("Withdraw", () => {
  describe("when there are sufficient funds", () => {
    it("it withdraws the funds from the account", () => {
      begin(newApp())
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
              transactionID: "T001",
              accountID: "A001",
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T002",
              accountID: "A001",
              amount: 500n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalApproved, {
              transactionID: "T002",
              accountID: "A001",
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
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T001",
              accountID: "A001",
              amount: 500n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalDeclined, {
              transactionID: "T001",
              accountID: "A001",
              amount: 500n,
              reason: DebitFailureReason.InsufficientFunds,
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
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
          executeCommand(
            createCommand(CommandName.Deposit, {
              transactionID: "T001",
              accountID: "A001",
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T002",
              accountID: "A001",
              amount: 500n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalApproved, {
              transactionID: "T002",
              accountID: "A001",
              amount: 500n,
            }),
          ),
        );
    });

    it("it enforces the daily debit limit per account", () => {
      begin(newApp())
        .prepare(
          executeCommand(
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
          executeCommand(
            createCommand(CommandName.OpenAccount, {
              customerID: "C002",
              accountID: "A002",
              accountName: "Bob Jones",
            }),
          ),
          executeCommand(
            createCommand(CommandName.Deposit, {
              transactionID: "D001",
              accountID: "A001",
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
          executeCommand(
            createCommand(CommandName.Deposit, {
              transactionID: "D002",
              accountID: "A002",
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T001",
              accountID: "A001",
              amount: expectedDailyDebitLimit,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalApproved, {
              transactionID: "T001",
              accountID: "A001",
              amount: expectedDailyDebitLimit,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T002",
              accountID: "A002",
              amount: expectedDailyDebitLimit,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalApproved, {
              transactionID: "T002",
              accountID: "A002",
              amount: expectedDailyDebitLimit,
            }),
          ),
        );
    });

    it("it enforces the daily debit limit per day", () => {
      begin(newApp())
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
              amount: expectedDailyDebitLimit * 2n,
            }),
          ),
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T001",
              accountID: "A001",
              amount: expectedDailyDebitLimit,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T002",
              accountID: "A001",
              amount: 500n,
              scheduledTime: new Date("2001-02-04T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalApproved, {
              transactionID: "T002",
              accountID: "A001",
              amount: 500n,
            }),
          ),
        );
    });

    it("it declines a second withdrawal that cumulatively exceeds the daily limit", () => {
      begin(newApp())
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
              amount: expectedDailyDebitLimit + 1n,
            }),
          ),
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T001",
              accountID: "A001",
              amount: expectedDailyDebitLimit / 2n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T002",
              accountID: "A001",
              amount: expectedDailyDebitLimit / 2n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T003",
              accountID: "A001",
              amount: 1n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalDeclined, {
              transactionID: "T003",
              accountID: "A001",
              amount: 1n,
              reason: DebitFailureReason.DailyDebitLimitExceeded,
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
              amount: expectedDailyDebitLimit + 10000n,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "T001",
              accountID: "A001",
              amount: expectedDailyDebitLimit + 1n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalDeclined, {
              transactionID: "T001",
              accountID: "A001",
              amount: expectedDailyDebitLimit + 1n,
              reason: DebitFailureReason.DailyDebitLimitExceeded,
            }),
          ),
        );
    });
  });
});
