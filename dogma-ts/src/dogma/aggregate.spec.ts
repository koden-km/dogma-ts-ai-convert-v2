import { describe, expect, it } from "vitest";
import {
  type AggregateCommandScope,
  type AggregateConfigurer,
  type AggregateMessageHandler,
  NoSnapshotBehavior,
  untypedAggregateMessageHandler,
} from "./aggregate.ts";
import { NotSupportedError } from "./error.ts";
import { unwrapHandler } from "./handler.ts";
import type { Command } from "./message.ts";

describe("NoSnapshotBehavior", () => {
  it("marshal throws NotSupportedError", () => {
    expect(() => NoSnapshotBehavior.marshal()).toThrow(NotSupportedError);
  });

  it("unmarshal throws NotSupportedError", () => {
    expect(() => NoSnapshotBehavior.unmarshal(new Uint8Array([1, 2, 3]))).toThrow(
      NotSupportedError,
    );
  });
});

describe("untypedAggregateMessageHandler", () => {
  type StubRoot = { value: string };

  const makeStub = (routeID = "instance-001") => {
    const state = {
      configured: false,
      handleCalled: false,
    };
    const handler: AggregateMessageHandler<StubRoot> = {
      configure(_c: AggregateConfigurer) {
        state.configured = true;
      },
      newRoot() {
        return { value: "" };
      },
      routeCommandToInstance(_c: Command) {
        return routeID;
      },
      handleCommand(
        _r: StubRoot,
        _s: AggregateCommandScope<StubRoot>,
        _c: Command,
      ) {
        state.handleCalled = true;
      },
    };
    return { handler, state };
  };

  it("returns an adaptor that wraps the handler", () => {
    const { handler } = makeStub();
    const adaptor = untypedAggregateMessageHandler(handler);
    expect(unwrapHandler(adaptor)).toBe(handler);
  });

  it("returns the handler unchanged if already untyped", () => {
    const { handler } = makeStub();
    const adaptor = untypedAggregateMessageHandler(handler);
    const again = untypedAggregateMessageHandler(adaptor);
    expect(again).toBe(adaptor);
  });

  it("throws if the handler is null", () => {
    expect(() => untypedAggregateMessageHandler(null as any)).toThrow(
      "handler cannot be null or undefined",
    );
  });

  it("delegates configure, newRoot, routeCommandToInstance, and handleCommand", () => {
    const { handler, state } = makeStub("instance-001");
    const adaptor = untypedAggregateMessageHandler(handler);

    adaptor.configure(null as any);
    expect(state.configured).toBe(true);

    const root = adaptor.newRoot();
    expect(root).toEqual({ value: "" });

    expect(adaptor.routeCommandToInstance(null as any)).toBe("instance-001");

    adaptor.handleCommand(root, null as any, null as any);
    expect(state.handleCalled).toBe(true);

    expect(() => adaptor.handleCommand(null as any, null as any, null as any)).toThrow();
  });
});
