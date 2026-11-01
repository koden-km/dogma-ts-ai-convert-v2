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

describe("OpenAccount", () => {
  describe("when the account does not exist", () => {
    it("the new account is opened", () => {
      begin(newApp()).expect(
        executeCommand(
          createCommand(CommandName.OpenAccount, {
            customerID: "C001",
            accountID: "A001",
            accountName: "Anna Smith",
          }),
        ),
        toRecordEvent(
          createEvent(EventName.AccountOpened, {
            customerID: "C001",
            accountID: "A001",
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
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
        )
        .expect(
          executeCommand(
            createCommand(CommandName.OpenAccount, {
              customerID: "C001",
              accountID: "A001",
              accountName: "Anna Smith",
            }),
          ),
          noneOf(toRecordEventOfType(EventName.AccountOpened)),
        );
    });
  });
});
