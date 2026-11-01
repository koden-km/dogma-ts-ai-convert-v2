import { beforeEach, describe, expect, it } from "vitest";
import { withEventObserver, withIdempotencyKey } from "./executor.ts";
import {
  registerEvent,
  resetMessageRegistry,
} from "./message-type-registry.ts";
import type { Event } from "./message.ts";
import { backgroundContext } from "./util.ts";

describe("executor", () => {
  beforeEach(() => {
    resetMessageRegistry();
  });

  describe("withIdempotencyKey", () => {
    it("returns an option with the specified idempotency key", () => {
      const o = withIdempotencyKey("<key>");
      expect(o.key).toBe("<key>");
    });

    it("throws if the key is empty", () => {
      expect(() => withIdempotencyKey("")).toThrow(
        "idempotency key cannot be empty",
      );
    });
  });

  describe("withEventObserver", () => {
    it("returns an option with the registered event type", () => {
      registerEvent("EvtT", "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");
      const o = withEventObserver("EvtT", () => true);
      expect(o.eventType.name).toBe("EvtT");
    });

    it("throws if the event type is not in the registry", () => {
      expect(() => withEventObserver("UnregisteredEvt", () => true)).toThrow(
        "UnregisteredEvt is not in the message type registry",
      );
    });

    it("throws if the observer is null", () => {
      registerEvent("EvtT", "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c");
      expect(() => withEventObserver("EvtT", null as any)).toThrow(
        "event observer cannot be null or undefined",
      );
    });

    it("invokes the callback for matching events and ignores non-matching events", async () => {
      registerEvent("EvtT", "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f");
      registerEvent("Other", "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b");

      let called = false;
      const o = withEventObserver("EvtT", () => {
        called = true;
        return true;
      });

      const matchEvt: Event = { type: "event", name: "EvtT" };
      const otherEvt: Event = { type: "event", name: "Other" };

      expect(await o.observer(backgroundContext(), otherEvt)).toBe(false);
      expect(called).toBe(false);

      expect(await o.observer(backgroundContext(), matchEvt)).toBe(true);
      expect(called).toBe(true);
    });
  });
});
