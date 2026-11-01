import { beforeEach, describe, expect, it } from "vitest";
import {
  executesCommand,
  handlesCommand,
  handlesEvent,
  recordsEvent,
  schedulesDeadline,
} from "./message-route.ts";
import {
  registerCommand,
  registerDeadline,
  registerEvent,
  resetMessageRegistry,
} from "./message-type-registry.ts";

describe("message-route", () => {
  beforeEach(() => {
    resetMessageRegistry();
  });

  describe("handlesCommand", () => {
    it("returns a route containing the registered message type", () => {
      registerCommand("Cmd1", "83c4a2d9-a728-49e6-83a3-6c670b99a173");
      const r = handlesCommand("Cmd1");
      expect(r.kind).toBe("HandlesCommand");
      expect(r.typ.name).toBe("Cmd1");
    });

    it("throws if the type is not in the registry", () => {
      expect(() => handlesCommand("Unregistered")).toThrow(
        "Unregistered is not in the message type registry",
      );
    });
  });

  describe("executesCommand", () => {
    it("returns a route containing the registered message type", () => {
      registerCommand("Cmd2", "7b8cf1fd-722e-4337-bc5c-9ce4f32ab9d4");
      const r = executesCommand("Cmd2");
      expect(r.kind).toBe("ExecutesCommand");
      expect(r.typ.name).toBe("Cmd2");
    });

    it("throws if the type is not in the registry", () => {
      expect(() => executesCommand("Unregistered")).toThrow(
        "Unregistered is not in the message type registry",
      );
    });
  });

  describe("handlesEvent", () => {
    it("returns a route containing the registered message type", () => {
      registerEvent("Evt1", "bef3014a-fca1-4cb3-90a3-ee83f5ca56c8");
      const r = handlesEvent("Evt1");
      expect(r.kind).toBe("HandlesEvent");
      expect(r.typ.name).toBe("Evt1");
    });

    it("throws if the type is not in the registry", () => {
      expect(() => handlesEvent("Unregistered")).toThrow(
        "Unregistered is not in the message type registry",
      );
    });
  });

  describe("recordsEvent", () => {
    it("returns a route containing the registered message type", () => {
      registerEvent("Evt2", "19d21601-7d10-4aaa-85b5-248cf873b3d3");
      const r = recordsEvent("Evt2");
      expect(r.kind).toBe("RecordsEvent");
      expect(r.typ.name).toBe("Evt2");
    });

    it("throws if the type is not in the registry", () => {
      expect(() => recordsEvent("Unregistered")).toThrow(
        "Unregistered is not in the message type registry",
      );
    });
  });

  describe("schedulesDeadline", () => {
    it("returns a route containing the registered message type", () => {
      registerDeadline("Dln1", "e11b5a92-e1ab-4a16-841a-9286b4e4d12f");
      const r = schedulesDeadline("Dln1");
      expect(r.kind).toBe("SchedulesDeadline");
      expect(r.typ.name).toBe("Dln1");
    });

    it("throws if the type is not in the registry", () => {
      expect(() => schedulesDeadline("Unregistered")).toThrow(
        "Unregistered is not in the message type registry",
      );
    });
  });
});
