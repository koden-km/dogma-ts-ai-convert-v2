import { describe, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import {
  Deposit,
  DepositApproved,
  OpenAccount,
  Withdraw,
  WithdrawalApproved,
} from "@/example/messages/index.ts";
import { begin, executeCommand, toRecordEvent } from "@/testkit/index.ts";

describe("Deposit", () => {
  describe("when the deposit has not yet started", () => {
    it("it deposits the funds into the account", () => {
      begin(newApp())
        .prepare(
          executeCommand(
            create(OpenAccount, {
              customerId: "C001",
              accountId: "A001",
              accountName: "Anna Smith",
            }),
          ),
        )
        .expect(
          executeCommand(
            create(Deposit, {
              transactionId: "T001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
          toRecordEvent(
            create(DepositApproved, {
              transactionId: "T001",
              accountId: "A001",
              amount: 500n,
            }),
          ),
        )
        // verify that funds are available
        .expect(
          executeCommand(
            create(Withdraw, {
              transactionId: "W001",
              accountId: "A001",
              amount: 100n,
              scheduledTime: "2001-02-03T00:00:00Z",
            }),
          ),
          toRecordEvent(
            create(WithdrawalApproved, {
              transactionId: "W001",
              accountId: "A001",
              amount: 100n,
            }),
          ),
        );
    });
  });
});
