import { describe, expect, it } from "vitest";
import type { AggregateMessageHandler } from "./aggregate.ts";
import {
  viaAggregate,
  viaIntegration,
  viaProcess,
  viaProjection,
} from "./handler-route.ts";
import { unwrapHandler } from "./handler.ts";
import type { IntegrationMessageHandler } from "./integration.ts";
import type { ProcessMessageHandler } from "./process.ts";
import type { ProjectionMessageHandler } from "./projection.ts";

describe("handler-route", () => {
  describe("viaAggregate", () => {
    it("returns a route with the specified handler", () => {
      const h: AggregateMessageHandler = {
        configure() {},
        newRoot: () => ({}),
        routeCommandToInstance: () => "id",
        handleCommand() {},
      };
      const r = viaAggregate(h);
      expect(r.kind).toBe("Aggregate");
      expect(unwrapHandler(r.handler)).toBe(h);
    });

    it("throws if the handler is null", () => {
      expect(() => viaAggregate(null as any)).toThrow(
        "handler cannot be null or undefined",
      );
    });
  });

  describe("viaProcess", () => {
    it("returns a route with the specified handler", () => {
      const h: ProcessMessageHandler = {
        configure() {},
        newRoot: () => ({}),
        routeEventToInstance: () => ({ id: "id", ok: true }),
        handleEvent() {},
        handleDeadline() {},
      };
      const r = viaProcess(h);
      expect(r.kind).toBe("Process");
      expect(unwrapHandler(r.handler)).toBe(h);
    });

    it("throws if the handler is null", () => {
      expect(() => viaProcess(null as any)).toThrow(
        "handler cannot be null or undefined",
      );
    });
  });

  describe("viaIntegration", () => {
    it("returns a route with the specified handler", () => {
      const h: IntegrationMessageHandler = {
        configure() {},
        handleCommand() {},
      };
      const r = viaIntegration(h);
      expect(r.kind).toBe("Integration");
      expect(r.handler).toBe(h);
    });

    it("throws if the handler is null", () => {
      expect(() => viaIntegration(null as any)).toThrow(
        "handler cannot be null or undefined",
      );
    });
  });

  describe("viaProjection", () => {
    it("returns a route with the specified handler", () => {
      const h: ProjectionMessageHandler = {
        configure() {},
        handleEvent: () => 0n,
        checkpointOffset: () => 0n,
        compact() {},
        reset() {},
      };
      const r = viaProjection(h);
      expect(r.kind).toBe("Projection");
      expect(r.handler).toBe(h);
    });

    it("throws if the handler is null", () => {
      expect(() => viaProjection(null as any)).toThrow(
        "handler cannot be null or undefined",
      );
    });
  });
});
