import { describe, expect, it } from "vitest";
import {
  backgroundContext,
  type Event,
  type ProjectionCompactScope,
  type ProjectionConfigurer,
  type ProjectionEventScope,
} from "@/dogma/index.ts";
import {
  createProjectionCompactScopeStub,
  createProjectionEventScopeStub,
  createProjectionResetScopeStub,
  EventA1,
} from "@/enginekit/index.ts";
import {
  type MessageHandler,
  newProjection,
  NoCompactBehavior,
  query,
} from "./index.ts";

describe("memoryprojection", () => {
  const setup = () => {
    const handler: MessageHandler<number> & {
      handleEventFunc?: (
        v: number,
        s: ProjectionEventScope,
        m: Event,
      ) => number;
      compactFunc?: (v: number, s: ProjectionCompactScope) => number;
    } = {
      configure(c: ProjectionConfigurer) {
        c.identity("<projection>", "6d1e805f-1760-409f-b1eb-e14983ec3f68");
      },
      handleEvent(v: number, s: ProjectionEventScope, m: Event): number {
        if (this.handleEventFunc) {
          return this.handleEventFunc(v, s, m);
        }
        return v;
      },
      compact(v: number, s: ProjectionCompactScope): number {
        if (this.compactFunc) {
          return this.compactFunc(v, s);
        }
        return NoCompactBehavior.compact(v, s);
      },
    };
    const adaptor = newProjection(handler, () => 0);
    return { handler, adaptor };
  };

  describe("when there is no state", () => {
    it("forwards initial value to handleEvent", async () => {
      const { handler, adaptor } = setup();
      let called = false;
      handler.handleEventFunc = (v, _s, m) => {
        called = true;
        expect(v).toBe(0);
        expect(m).toBe(EventA1);
        return v;
      };

      const got = await adaptor.handleEvent(
        backgroundContext(),
        createProjectionEventScopeStub(),
        EventA1,
      );
      expect(got).toBe(1n);
      expect(called).toBe(true);
    });

    it("does not forward compact to the handler", async () => {
      const { handler, adaptor } = setup();
      handler.compactFunc = () => {
        throw new Error("unexpected call");
      };

      expect(
        await adaptor.compact(
          backgroundContext(),
          createProjectionCompactScopeStub(),
        ),
      ).toBeUndefined();
    });

    it("calls query with initial value", () => {
      const { adaptor } = setup();
      expect(query(adaptor, (v) => v * 2)).toBe(0);
    });
  });

  describe("when there is existing state", () => {
    const setupExisting = async () => {
      const deps = setup();
      deps.handler.handleEventFunc = () => 321;
      await deps.adaptor.handleEvent(
        backgroundContext(),
        createProjectionEventScopeStub(),
        EventA1,
      );
      return deps;
    };

    it("forwards the existing value to handleEvent", async () => {
      const { handler, adaptor } = await setupExisting();
      let called = false;
      handler.handleEventFunc = (v) => {
        called = true;
        expect(v).toBe(321);
        return v;
      };

      const got = await adaptor.handleEvent(
        backgroundContext(),
        createProjectionEventScopeStub({
          offsetFunc: () => 1n,
          checkpointOffsetFunc: () => 1n,
        }),
        EventA1,
      );
      expect(got).toBe(2n);
      expect(called).toBe(true);
    });

    it("returns current checkpoint offset on OCC conflict", async () => {
      const { adaptor } = await setupExisting();
      const got = await adaptor.handleEvent(
        backgroundContext(),
        createProjectionEventScopeStub({
          offsetFunc: () => 5n,
          checkpointOffsetFunc: () => 0n,
        }),
        EventA1,
      );
      expect(got).toBe(1n);
    });

    it("forwards compact to the handler", async () => {
      const { handler, adaptor } = await setupExisting();
      let called = false;
      handler.compactFunc = (v) => {
        called = true;
        expect(v).toBe(321);
        return v;
      };

      await adaptor.compact(
        backgroundContext(),
        createProjectionCompactScopeStub(),
      );
      expect(called).toBe(true);
    });

    it("calls query with existing value and resets state on reset", async () => {
      const { adaptor } = await setupExisting();
      expect(query(adaptor, (v) => v * 2)).toBe(642);

      await adaptor.reset(
        backgroundContext(),
        createProjectionResetScopeStub(),
      );
      expect(query(adaptor, (v) => v)).toBe(0);
      expect(
        await adaptor.checkpointOffset(
          backgroundContext(),
          "6d1e805f-1760-409f-b1eb-e14983ec3f68",
        ),
      ).toBe(0n);
    });
  });
});
