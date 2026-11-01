import type { HandlerConfigurer, HandlerScope } from "./handler.ts";
import type { MessageRoute } from "./message-route.ts";
import {
  type Command,
  type Deadline,
  type Event,
  UnexpectedMessageError,
} from "./message.ts";
import type { Context } from "./util.ts";

// A ProcessRoot is an application's representation of a process instance used
// within [ProcessMessageHandler] implementations.
//
// In idiomatic TypeScript, ProcessRoot can be a pure data object, with
// optional `describeInstance` / `marshal` / `unmarshal` defined on the
// [ProcessMessageHandler] (or on the root itself).
export type ProcessRoot = Record<string, any>;

// StatelessProcessRoot is an empty [ProcessRoot] for processes that don't
// maintain any state.
export type StatelessProcessRoot = {
  readonly __stateless?: true;
};

export const statelessProcessRoot: StatelessProcessRoot = Object.freeze({
  __stateless: true as const,
  processInstanceDescription(_ended: boolean): string {
    return "";
  },
  marshalBinary(): Uint8Array {
    return new Uint8Array(0);
  },
  unmarshalBinary(data?: Uint8Array | null): void {
    if (data && data.length > 0) {
      throw new Error("cannot unmarshal non-empty data into stateless process");
    }
  },
});

export function isStatelessProcessRoot(r: unknown): r is StatelessProcessRoot {
  return (
    r === statelessProcessRoot ||
    Boolean(r && typeof r === "object" && (r as any).__stateless === true)
  );
}

export type ProcessEventRouteResult =
  | { id: string; ok: boolean }
  | [string, boolean];

// A ProcessMessageHandler encapsulates an application's "workflow" logic -
// stateful decision-making that spans multiple [Command] messages.
export type ProcessMessageHandler<RootT extends ProcessRoot = ProcessRoot> = {
  // configure() declares the handler's configuration by calling methods on c.
  configure(c: ProcessConfigurer): void;

  // newRoot() returns a new [ProcessRoot] representing the initial state of a
  // process instance.
  newRoot(): RootT;

  // routeEventToInstance() returns the ID of the process instance that e
  // targets.
  routeEventToInstance(
    ctx: Context,
    e: Event,
  ): Promise<ProcessEventRouteResult> | ProcessEventRouteResult;

  // handleEvent() begins or advances a process in response to an [Event]
  // message.
  handleEvent(
    ctx: Context,
    r: RootT,
    s: ProcessEventScope<RootT>,
    e: Event,
  ): Promise<void> | void;

  // handleDeadline() advances a process in response to a [Deadline] message.
  handleDeadline(
    ctx: Context,
    r: RootT,
    s: ProcessDeadlineScope<RootT>,
    d: Deadline,
  ): Promise<void> | void;

  // describeInstance() returns a human-readable description of the process
  // instance's current state, for use in logging and telemetry.
  describeInstance?(r: RootT, ended: boolean): string;

  // marshal() returns a serialized representation of the process instance's
  // current state.
  marshal?(r: RootT): Uint8Array | string;

  // unmarshal() populates the process instance's state from its serialized
  // representation.
  unmarshal?(r: RootT, data: Uint8Array | string): void;
};

// ProcessConfigurer is the interface that a [ProcessMessageHandler] uses to
// declare its configuration.
export type ProcessConfigurer = HandlerConfigurer & {
  // routes() declares the message types that the handler consumes and produces.
  //
  // It accepts routes created by [handlesEvent], [executesCommand], and
  // [schedulesDeadline].
  routes(...routes: ProcessRoute[]): void;
};

// ProcessScope represents the context within which a [ProcessMessageHandler]
// handles a message.
export type ProcessScope<RootT extends ProcessRoot = ProcessRoot> =
  HandlerScope & {
    // instanceID() returns the ID of the process instance that the message
    // targets.
    instanceID(): string;

    // mutate() changes the process instance's state by calling fn with the
    // current root, making the state changes visible to the handler
    // immediately.
    mutate(fn: (r: RootT) => void): void;

    // end() signals the end of a process.
    end(): void;

    // executeCommand() submits a [Command] for execution.
    executeCommand(c: Command): void;

    // scheduleDeadline() schedules a [Deadline] message for the specified time.
    scheduleDeadline(d: Deadline, t: Date): void;
  };

// ProcessEventScope represents the context within which a
// [ProcessMessageHandler] handles an [Event] message.
export type ProcessEventScope<RootT extends ProcessRoot = ProcessRoot> =
  ProcessScope<RootT> & {
    // recordedAt() returns the time at which the inbound [Event] occurred.
    recordedAt(): Date;
  };

// ProcessDeadlineScope represents the context within which a
// [ProcessMessageHandler] handles a [Deadline] message.
export type ProcessDeadlineScope<RootT extends ProcessRoot = ProcessRoot> =
  ProcessScope<RootT> & {
    // scheduledFor() returns the time at which the deadline message is to be
    // delivered.
    scheduledFor(): Date;
  };

// ProcessRoute describes a message type that's routed to or from a
// [ProcessMessageHandler].
export type ProcessRoute = MessageRoute & {
  isProcessRoute(): boolean;
};

// NoDeadlineMessagesBehavior is an embeddable object for [ProcessMessageHandler]
// implementations that don't use [Deadline] messages.
export const NoDeadlineMessagesBehavior = {
  handleDeadline(
    _ctx: Context,
    _r: any,
    _s: ProcessDeadlineScope<any>,
    _d: Deadline,
  ): never {
    throw new UnexpectedMessageError();
  },
};

// StatelessProcessBehavior is an embeddable object for [ProcessMessageHandler]
// implementations that don't maintain any state.
export const StatelessProcessBehavior = {
  newRoot(): StatelessProcessRoot {
    return statelessProcessRoot;
  },
};

export function describeProcessInstance<RootT extends ProcessRoot>(
  handler: ProcessMessageHandler<RootT>,
  root: RootT,
  ended: boolean,
): string {
  if (typeof handler.describeInstance === "function") {
    return handler.describeInstance(root, ended);
  }
  if (typeof (root as any).processInstanceDescription === "function") {
    return (root as any).processInstanceDescription(ended);
  }
  return "";
}
