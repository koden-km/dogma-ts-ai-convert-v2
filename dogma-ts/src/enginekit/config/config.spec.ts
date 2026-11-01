import { beforeEach, describe, expect, it } from "vitest";
import {
  executesCommand,
  handlesCommand,
  handlesEvent,
  recordsEvent,
  viaAggregate,
  viaProcess,
} from "@/dogma/index.ts";
import {
  createAggregateMessageHandlerStub,
  createApplicationStub,
  createProcessMessageHandlerStub,
  registerStubMessages,
} from "../enginetest/stubs/index.ts";
import { fromApplication, validate } from "./index.ts";

describe("enginekit/config", () => {
  beforeEach(() => {
    registerStubMessages();
  });

  it("validates a well-formed application configuration", () => {
    const agg = createAggregateMessageHandlerStub({
      configureFunc(c) {
        c.identity("agg", "11111111-1111-4111-8111-111111111111");
        c.routes(
          handlesCommand("CommandStub[A]"),
          recordsEvent("EventStub[A]"),
        );
      },
    });
    const proc = createProcessMessageHandlerStub({
      configureFunc(c) {
        c.identity("proc", "22222222-2222-4222-8222-222222222222");
        c.routes(
          handlesEvent("EventStub[A]"),
          executesCommand("CommandStub[A]"),
        );
      },
    });
    const app = createApplicationStub({
      configureFunc(c) {
        c.identity("app", "00000000-0000-4000-8000-000000000001");
        c.routes(viaAggregate(agg), viaProcess(proc));
      },
    });

    const cfg = fromApplication(app);
    expect(() => validate(cfg)).not.toThrow();
    expect(cfg.identity().name).toBe("app");
    expect(cfg.handlers().length).toBe(2);
    expect(cfg.handlerByName("agg")?.identity().name).toBe("agg");
    expect(cfg.routeSet().byMessageType.size).toBe(2);
  });

  it("throws when two handlers share the same identity name", () => {
    const agg1 = createAggregateMessageHandlerStub({
      configureFunc(c) {
        c.identity("dup", "11111111-1111-4111-8111-111111111111");
        c.routes(
          handlesCommand("CommandStub[A]"),
          recordsEvent("EventStub[A]"),
        );
      },
    });
    const agg2 = createAggregateMessageHandlerStub({
      configureFunc(c) {
        c.identity("dup", "22222222-2222-4222-8222-222222222222");
        c.routes(
          handlesCommand("CommandStub[B]"),
          recordsEvent("EventStub[B]"),
        );
      },
    });
    const app = createApplicationStub({
      configureFunc(c) {
        c.identity("app", "00000000-0000-4000-8000-000000000001");
        c.routes(viaAggregate(agg1), viaAggregate(agg2));
      },
    });

    const cfg = fromApplication(app);
    expect(() => validate(cfg)).toThrow(
      `identity name "dup" is shared by 2 entities`,
    );
  });

  it("throws when two handlers handle the same command", () => {
    const agg1 = createAggregateMessageHandlerStub({
      configureFunc(c) {
        c.identity("agg1", "11111111-1111-4111-8111-111111111111");
        c.routes(
          handlesCommand("CommandStub[A]"),
          recordsEvent("EventStub[A]"),
        );
      },
    });
    const agg2 = createAggregateMessageHandlerStub({
      configureFunc(c) {
        c.identity("agg2", "22222222-2222-4222-8222-222222222222");
        c.routes(
          handlesCommand("CommandStub[A]"),
          recordsEvent("EventStub[B]"),
        );
      },
    });
    const app = createApplicationStub({
      configureFunc(c) {
        c.identity("app", "00000000-0000-4000-8000-000000000001");
        c.routes(viaAggregate(agg1), viaAggregate(agg2));
      },
    });

    const cfg = fromApplication(app);
    expect(() => validate(cfg)).toThrow(
      `handles-command route for CommandStub[A] is shared by 2 handlers`,
    );
  });
});
