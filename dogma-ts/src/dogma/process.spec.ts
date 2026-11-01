import { describe, expect, it } from "vitest";
import { unwrapHandler } from "./handler.ts";
import {
  type Deadline,
  type Event,
  UnexpectedMessageError,
} from "./message.ts";
import {
  NoDeadlineMessagesBehavior,
  type ProcessConfigurer,
  type ProcessDeadlineScope,
  type ProcessEventScope,
  type ProcessMessageHandler,
  StatelessProcessBehavior,
  untypedProcessMessageHandler,
} from "./process.ts";
import { backgroundContext, type Context } from "./util.ts";

describe("StatelessProcessBehavior", () => {
  const root = StatelessProcessBehavior.newRoot() as any;

  it("returns a non-null root", () => {
    expect(root).toBeDefined();
  });

  it("processInstanceDescription returns an empty string", () => {
    expect(root.processInstanceDescription(false)).toBe("");
    expect(root.processInstanceDescription(true)).toBe("");
  });

  it("marshalBinary returns an empty slice", () => {
    const data = root.marshalBinary();
    expect(data.length).toBe(0);
  });

  it("unmarshalBinary succeeds on empty data and throws on non-empty data", () => {
    expect(() => root.unmarshalBinary(null)).not.toThrow();
    expect(() => root.unmarshalBinary(new Uint8Array(0))).not.toThrow();
    expect(() => root.unmarshalBinary(new Uint8Array([1, 2, 3]))).toThrow();
  });
});

describe("NoDeadlineMessagesBehavior", () => {
  it("throws UnexpectedMessageError", () => {
    expect(() =>
      NoDeadlineMessagesBehavior.handleDeadline(
        backgroundContext(),
        {},
        null as any,
        null as any,
      ),
    ).toThrow(UnexpectedMessageError);
  });
});

describe("untypedProcessMessageHandler", () => {
  type StubRoot = { count: number };

  const makeStub = () => {
    const state = {
      configured: false,
      handleEventCalled: false,
      handleDeadlineCalled: false,
    };
    const handler: ProcessMessageHandler<StubRoot> = {
      configure(_c: ProcessConfigurer) {
        state.configured = true;
      },
      newRoot() {
        return { count: 0 };
      },
      routeEventToInstance(_ctx: Context, _e: Event) {
        return { id: "instance-001", ok: true };
      },
      handleEvent(
        _ctx: Context,
        _r: StubRoot,
        _s: ProcessEventScope<StubRoot>,
        _e: Event,
      ) {
        state.handleEventCalled = true;
      },
      handleDeadline(
        _ctx: Context,
        _r: StubRoot,
        _s: ProcessDeadlineScope<StubRoot>,
        _d: Deadline,
      ) {
        state.handleDeadlineCalled = true;
      },
    };
    return { handler, state };
  };

  it("returns an adaptor that wraps the handler", () => {
    const { handler } = makeStub();
    const adaptor = untypedProcessMessageHandler(handler);
    expect(unwrapHandler(adaptor)).toBe(handler);
  });

  it("returns the handler unchanged if already untyped", () => {
    const { handler } = makeStub();
    const adaptor = untypedProcessMessageHandler(handler);
    const again = untypedProcessMessageHandler(adaptor);
    expect(again).toBe(adaptor);
  });

  it("throws if the handler is null", () => {
    expect(() => untypedProcessMessageHandler(null as any)).toThrow(
      "handler cannot be null or undefined",
    );
  });

  it("delegates methods and narrows mutate callback", async () => {
    const { handler, state } = makeStub();
    const adaptor = untypedProcessMessageHandler(handler);

    adaptor.configure(null as any);
    expect(state.configured).toBe(true);

    const root = adaptor.newRoot();
    expect(root).toEqual({ count: 0 });

    const routeRes = await adaptor.routeEventToInstance(
      backgroundContext(),
      null as any,
    );
    expect(routeRes).toEqual({ id: "instance-001", ok: true });

    await adaptor.handleEvent(
      backgroundContext(),
      root,
      null as any,
      null as any,
    );
    expect(state.handleEventCalled).toBe(true);

    await adaptor.handleDeadline(
      backgroundContext(),
      root,
      null as any,
      null as any,
    );
    expect(state.handleDeadlineCalled).toBe(true);

    expect(() =>
      adaptor.handleEvent(
        backgroundContext(),
        null as any,
        null as any,
        null as any,
      ),
    ).toThrow();
    expect(() =>
      adaptor.handleDeadline(
        backgroundContext(),
        null as any,
        null as any,
        null as any,
      ),
    ).toThrow();
  });
});
