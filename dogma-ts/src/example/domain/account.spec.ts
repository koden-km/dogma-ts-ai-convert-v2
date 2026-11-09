import { describe, it } from "vitest";
import { create } from "@/dogma/index.ts";
import { newApp } from "@/example/app.ts";
import {
  AccountOpenedSchema,
  OpenAccountSchema,
} from "@/example/messages/index.ts";
import {
  begin,
  executeCommand,
  noneOf,
  toRecordEvent,
  toRecordEventOfType,
} from "@/testkit/index.ts";

describe("OpenAccount", () => {
  describe("when the account does not exist", () => {
    it("the new account is opened", () => {
      begin(newApp()).expect(
        executeCommand(
          create(OpenAccountSchema, {
            customerId: "C001",
            accountId: "A001",
            accountName: "Anna Smith",
          }),
        ),
        toRecordEvent(
          create(AccountOpenedSchema, {
            customerId: "C001",
            accountId: "A001",
            accountName: "Anna Smith",
          }),
        ),
      );
    });
  });

  describe("when the account already exists", () => {
    it("nothing happens to the existing account", () => {
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
            create(OpenAccountSchema, {
              customerId: "C001",
              accountId: "A001",
              accountName: "Anna Smith",
            }),
          ),
          noneOf(toRecordEventOfType(AccountOpenedSchema)),
        );
    });
  });
});
