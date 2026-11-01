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
import {
  advanceTime,
  begin,
  executeCommand,
  noneOf,
  recordEvent,
  startTimeAt,
  type Test,
  type TestOption,
  toRecordEvent,
  toRecordEventOfType,
  toTime,
} from "@/testkit/index.ts";

const expectedDailyDebitLimit = maximumDailyDebitLimit;

describe("Transfer", () => {
  const cases = [
    {
      name: "it transfers to an in-house account",
      toAccountID: "A002",
      toThirdPartyBank: false,
    },
    {
      name: "it transfers to a third-party account",
      toAccountID: "100001",
      toThirdPartyBank: true,
    },
  ];

  for (const c of cases) {
    describe(c.name, () => {
      const app = (...opts: TestOption[]): Test => {
        const a = begin(newApp(), ...opts);
        if (c.toThirdPartyBank) {
          a.enableHandlers("third-party-bank");
        }
        return a;
      };

      it("when there are sufficient funds", () => {
        app()
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
                amount: 500n,
              }),
            ),
          )
          .expect(
            executeCommand(
              createCommand(CommandName.Transfer, {
                transactionID: "T001",
                fromAccountID: "A001",
                toAccountID: c.toAccountID,
                amount: 100n,
                scheduledTime: new Date("2001-02-03T00:00:00Z"),
                toThirdPartyBank: c.toThirdPartyBank,
              }),
            ),
            toRecordEvent(
              createEvent(EventName.TransferApproved, {
                transactionID: "T001",
                fromAccountID: "A001",
                toAccountID: c.toAccountID,
                amount: 100n,
              }),
            ),
          );
      });

      it("when the transfer does not exceed the daily debit limit", () => {
        app()
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
          )
          .expect(
            executeCommand(
              createCommand(CommandName.Transfer, {
                transactionID: "T002",
                fromAccountID: "A001",
                toAccountID: c.toAccountID,
                amount: 500n,
                scheduledTime: new Date("2001-02-03T00:00:00Z"),
                toThirdPartyBank: c.toThirdPartyBank,
              }),
            ),
            toRecordEvent(
              createEvent(EventName.TransferApproved, {
                transactionID: "T002",
                fromAccountID: "A001",
                toAccountID: c.toAccountID,
                amount: 500n,
              }),
            ),
          );
      });

      it("when the transfer is scheduled for a future date", () => {
        app(startTimeAt(new Date("2001-02-03T11:22:33Z")))
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
                amount: 500n,
              }),
            ),
          )
          .expect(
            executeCommand(
              createCommand(CommandName.Transfer, {
                transactionID: "T001",
                fromAccountID: "A001",
                toAccountID: c.toAccountID,
                amount: 100n,
                scheduledTime: new Date("2001-02-04T00:00:00Z"),
                toThirdPartyBank: c.toThirdPartyBank,
              }),
            ),
            noneOf(toRecordEventOfType(EventName.TransferApproved)),
          )
          .expect(
            advanceTime(toTime(new Date("2001-02-04T00:00:00Z"))),
            toRecordEvent(
              createEvent(EventName.TransferApproved, {
                transactionID: "T001",
                fromAccountID: "A001",
                toAccountID: c.toAccountID,
                amount: 100n,
              }),
            ),
          );
      });
    });
  }

  describe("when there are insufficient funds", () => {
    it("it does not transfer any funds from the account", () => {
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
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Transfer, {
              transactionID: "T001",
              fromAccountID: "A001",
              toAccountID: "A002",
              amount: 1000n,
              toThirdPartyBank: false,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.TransferDeclined, {
              transactionID: "T001",
              fromAccountID: "A001",
              toAccountID: "A002",
              amount: 1000n,
              reason: DebitFailureReason.InsufficientFunds,
            }),
          ),
        )
        // verify that funds are not available
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "W001",
              accountID: "A002",
              amount: 100n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalDeclined, {
              transactionID: "W001",
              accountID: "A002",
              amount: 100n,
              reason: DebitFailureReason.InsufficientFunds,
            }),
          ),
        );
    });
  });

  describe("when the transfer exceeds the daily debit limit", () => {
    it("it does not transfer any funds from the account", () => {
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
        )
        .expect(
          executeCommand(
            createCommand(CommandName.Transfer, {
              transactionID: "T001",
              fromAccountID: "A001",
              toAccountID: "A002",
              amount: expectedDailyDebitLimit + 1n,
              toThirdPartyBank: false,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.TransferDeclined, {
              transactionID: "T001",
              fromAccountID: "A001",
              toAccountID: "A002",
              amount: expectedDailyDebitLimit + 1n,
              reason: DebitFailureReason.DailyDebitLimitExceeded,
            }),
          ),
        )
        // verify that funds are not available
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "W001",
              accountID: "A002",
              amount: 100n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalDeclined, {
              transactionID: "W001",
              accountID: "A002",
              amount: 100n,
              reason: DebitFailureReason.InsufficientFunds,
            }),
          ),
        );
    });
  });

  describe("when the third-party credit fails", () => {
    it("it refunds the source account", () => {
      // Integration handler is intentionally not enabled so the
      // process stalls after issuing CreditThirdPartyAccount, allowing
      // us to inject ThirdPartyAccountCreditFailed directly.
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
              amount: 500n,
            }),
          ),
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
        )
        .expect(
          recordEvent(
            createEvent(EventName.ThirdPartyAccountCreditFailed, {
              transactionID: "T001",
              accountID: "100001",
              amount: 100n,
            }),
          ),
          toRecordEvent(
            createEvent(EventName.TransferFailed, {
              transactionID: "T001",
              fromAccountID: "A001",
              toAccountID: "100001",
              amount: 100n,
            }),
          ),
        )
        // verify that the funds were returned
        .expect(
          executeCommand(
            createCommand(CommandName.Withdraw, {
              transactionID: "W001",
              accountID: "A001",
              amount: 500n,
              scheduledTime: new Date("2001-02-03T00:00:00Z"),
            }),
          ),
          toRecordEvent(
            createEvent(EventName.WithdrawalApproved, {
              transactionID: "W001",
              accountID: "A001",
              amount: 500n,
            }),
          ),
        );
    });
  });
});
