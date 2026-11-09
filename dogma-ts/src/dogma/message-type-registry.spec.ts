import { beforeEach, describe, expect, it } from "vitest";
import {
  registerCommand,
  registerDeadline,
  registeredMessageTypeByID,
  registeredMessageTypeFor,
  registeredMessageTypeOf,
  registeredMessageTypes,
  registerEvent,
  resetMessageRegistry,
} from "./message-type-registry.ts";
import type { Command, Deadline, Event, Message } from "./message.ts";

describe("message-type-registry", () => {
  beforeEach(() => {
    resetMessageRegistry();
  });

  describe("registeredMessageTypeFor", () => {
    it("returns the type that represents T", () => {
      type T = Command<"TestCommand">;
      registerCommand<T>("TestCommand", "2d8ce56f-1983-44e3-a55d-f74d8dcb0adc");

      const mt = registeredMessageTypeFor("TestCommand");
      expect(mt).toBeDefined();
      expect(mt?.name).toBe("TestCommand");
      expect(mt?.kind).toBe("command");
    });

    it("returns undefined when T is not in the registry", () => {
      const mt = registeredMessageTypeFor("UnregisteredCommand");
      expect(mt).toBeUndefined();
    });
  });

  describe("registeredMessageTypeOf", () => {
    it("returns the type that represents the message's type", () => {
      type T = Command<"TestCommand">;
      registerCommand<T>("TestCommand", "5e1c3f4a-2f4b-4c3e-8f7a-1c2d3e4f5a6b");

      const m: Message = { $typeName: "TestCommand" };
      const mt = registeredMessageTypeOf(m);
      expect(mt).toBeDefined();
      expect(mt?.name).toBe("TestCommand");
    });

    it("returns undefined when the message's type is not in the registry", () => {
      const m: Message = { $typeName: "Unknown" };
      const mt = registeredMessageTypeOf(m);
      expect(mt).toBeUndefined();
    });

    it("throws if the message is null or undefined", () => {
      expect(() => registeredMessageTypeOf(null)).toThrow(
        "message cannot be null or undefined",
      );
    });
  });

  describe("registeredMessageTypeByID", () => {
    it("returns the type associated with the normalized ID", () => {
      const id = "37264B0D-4342-4708-8263-60D82DE78AD1";
      type T = Event<"TestEvent">;
      registerEvent<T>("TestEvent", id);

      const mt = registeredMessageTypeByID(id);
      expect(mt).toBeDefined();
      expect(mt?.name).toBe("TestEvent");
    });

    it("returns undefined when ID is not registered", () => {
      const mt = registeredMessageTypeByID(
        "75285aae-f85a-435b-ad36-7471ab169348",
      );
      expect(mt).toBeUndefined();
    });

    it("throws when the ID is invalid", () => {
      expect(() => registeredMessageTypeByID("<non-uuid>")).toThrow(
        `"<non-uuid>" is not a canonical RFC 9562 UUID: expected 36 characters`,
      );
    });
  });

  describe("registeredMessageTypes", () => {
    it("yields the registered message types", () => {
      type T = Command<"CmdT">;
      type U = Event<"EvtU">;
      type V = Deadline<"DlnV">;

      registerCommand<T>("CmdT", "b3160ff8-f19a-4f79-b81c-0551c99aeac2");
      registerEvent<U>("EvtU", "c3f856ba-0519-4335-ad84-313aa0fedc5e");
      registerDeadline<V>("DlnV", "8ab13db4-33ff-4dde-862c-7c94a0477231");

      const yielded = new Set<string>();
      for (const mt of registeredMessageTypes()) {
        yielded.add(mt.name);
      }

      expect(yielded.has("CmdT")).toBe(true);
      expect(yielded.has("EvtU")).toBe(true);
      expect(yielded.has("DlnV")).toBe(true);
    });
  });

  describe("message type registration", () => {
    it("normalizes the UUID", () => {
      const id = "476497D0-2132-4EC5-90D4-21E2B6E6EB54";
      registerCommand("CmdNorm", id);

      const mt = registeredMessageTypeFor("CmdNorm");
      expect(mt?.id).toBe(id.toLowerCase());
    });

    it("fails on duplicate registration", () => {
      registerCommand("DupCmd", "658e7da4-ffa9-4d11-b796-29346ec6f586");
      expect(() =>
        registerCommand("DupCmd", "658e7da4-ffa9-4d11-b796-29346ec6f586"),
      ).toThrow("cannot register DupCmd: it is already registered");
    });

    it("fails on conflicting registration (same type)", () => {
      registerCommand("ConflictCmd", "f2a5c633-fbc1-4230-937d-057e3d141d4f");
      expect(() =>
        registerCommand("ConflictCmd", "6b529039-03fe-4fde-8986-42892f39d93e"),
      ).toThrow(
        `cannot register ConflictCmd: it is already registered as "f2a5c633-fbc1-4230-937d-057e3d141d4f"`,
      );
    });

    it("fails on conflicting registration (same ID)", () => {
      registerCommand("CmdA", "b8a9ee69-e6f4-41ae-8fba-524505a2aaba");
      expect(() =>
        registerCommand("CmdB", "b8a9ee69-e6f4-41ae-8fba-524505a2aaba"),
      ).toThrow(
        `cannot register CmdB: "b8a9ee69-e6f4-41ae-8fba-524505a2aaba" is already associated with CmdA`,
      );
    });

    it("fails on invalid UUID", () => {
      expect(() => registerCommand("InvalidCmd", "<non-uuid>")).toThrow(
        `cannot register InvalidCmd: "<non-uuid>" is not a canonical RFC 9562 UUID: expected 36 characters`,
      );
    });
  });
});
