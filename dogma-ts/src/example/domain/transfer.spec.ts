import { describe, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import { maximumDailyDebitLimit } from "@/example/domain/daily-debit-limit.ts";
import {
  DebitFailureReason,
  DepositSchema,
  OpenAccountSchema,
  ThirdPartyAccountCreditFailedSchema,
  TransferApprovedSchema,
  TransferDeclinedSchema,
  TransferFailedSchema,
  TransferSchema,
  WithdrawalApprovedSchema,
  WithdrawalDeclinedSchema,
  WithdrawSchema,
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
                amount: 500n,
              }),
            ),
          )
          .expect(
            executeCommand(
              create(TransferSchema, {
                transactionId: "T001",
                fromAccountId: "A001",
                toAccountId: c.toAccountID,
                amount: 100n,
                scheduledTime: "2001-02-03T00:00:00Z",
                toThirdPartyBank: c.toThirdPartyBank,
              }),
            ),
            toRecordEvent(
              create(TransferApprovedSchema, {
                transactionId: "T001",
                fromAccountId: "A001",
                toAccountId: c.toAccountID,
                amount: 100n,
              }),
            ),
          );
      });

      it("when the transfer does not exceed the daily debit limit", () => {
        app()
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
          )
          .expect(
            executeCommand(
              create(TransferSchema, {
                transactionId: "T002",
                fromAccountId: "A001",
                toAccountId: c.toAccountID,
                amount: 500n,
                scheduledTime: "2001-02-03T00:00:00Z",
                toThirdPartyBank: c.toThirdPartyBank,
              }),
            ),
            toRecordEvent(
              create(TransferApprovedSchema, {
                transactionId: "T002",
                fromAccountId: "A001",
                toAccountId: c.toAccountID,
                amount: 500n,
              }),
            ),
          );
      });

      it("when the transfer is scheduled for a future date", () => {
        app(startTimeAt(new Date("2001-02-03T11:22:33Z")))
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
                amount: 500n,
              }),
            ),
          )
          .expect(
            executeCommand(
              create(TransferSchema, {
                transactionId: "T001",
                fromAccountId: "A001",
                toAccountId: c.toAccountID,
                amount: 100n,
                scheduledTime: "2001-02-04T00:00:00Z",
                toThirdPartyBank: c.toThirdPartyBank,
              }),
            ),
            noneOf(toRecordEventOfType(TransferApprovedSchema)),
          )
          .expect(
            advanceTime(toTime(new Date("2001-02-04T00:00:00Z"))),
            toRecordEvent(
              create(TransferApprovedSchema, {
                transactionId: "T001",
                fromAccountId: "A001",
                toAccountId: c.toAccountID,
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
              amount: 500n,
            }),
          ),
        )
        .expect(
          executeCommand(
            create(TransferSchema, {
              transactionId: "T001",
              fromAccountId: "A001",
              toAccountId: "A002",
              amount: 1000n,
              toThirdPartyBank: false,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(TransferDeclinedSchema, {
              transactionId: "T001",
              fromAccountId: "A001",
              toAccountId: "A002",
              amount: 1000n,
              reason: DebitFailureReason.INSUFFICIENT_FUNDS,
            }),
          ),
        )
        // verify that funds are not available
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "W001",
              accountId: "A002",
              amount: 100n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalDeclinedSchema, {
              transactionId: "W001",
              accountId: "A002",
              amount: 100n,
              reason: DebitFailureReason.INSUFFICIENT_FUNDS,
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
        )
        .expect(
          executeCommand(
            create(TransferSchema, {
              transactionId: "T001",
              fromAccountId: "A001",
              toAccountId: "A002",
              amount: expectedDailyDebitLimit + 1n,
              toThirdPartyBank: false,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(TransferDeclinedSchema, {
              transactionId: "T001",
              fromAccountId: "A001",
              toAccountId: "A002",
              amount: expectedDailyDebitLimit + 1n,
              reason: DebitFailureReason.DAILY_DEBIT_LIMIT_EXCEEDED,
            }),
          ),
        )
        // verify that funds are not available
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "W001",
              accountId: "A002",
              amount: 100n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalDeclinedSchema, {
              transactionId: "W001",
              accountId: "A002",
              amount: 100n,
              reason: DebitFailureReason.INSUFFICIENT_FUNDS,
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
        )
        .expect(
          recordEvent(
            create(ThirdPartyAccountCreditFailedSchema, {
              transactionId: "T001",
              accountId: "100001",
              amount: 100n,
            }),
          ),
          toRecordEvent(
            create(TransferFailedSchema, {
              transactionId: "T001",
              fromAccountId: "A001",
              toAccountId: "100001",
              amount: 100n,
            }),
          ),
        )
        // verify that the funds were returned
        .expect(
          executeCommand(
            create(WithdrawSchema, {
              transactionId: "W001",
              accountId: "A001",
              amount: 500n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalApprovedSchema, {
              transactionId: "W001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        );
    });
  });
});
