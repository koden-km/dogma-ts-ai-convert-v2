import { NotSupportedError } from "./error.ts";
import type { HandlerConfigurer, HandlerScope } from "./handler.ts";
import type {
  HandlesCommandRoute,
  RecordsEventRoute,
} from "./message-route.ts";
import type { Command, Event } from "./message.ts";

// An AggregateRoot is an application's working representation of an aggregate
// instance used within [AggregateMessageHandler] implementations.
//
// In idiomatic TypeScript, AggregateRoot is a pure data object, with
// `applyEvent` and optional `describeInstance` / `marshal` / `unmarshal`
// defined on the [AggregateMessageHandler].
export type AggregateRoot = Record<string, any>;

// An AggregateMessageHandler encapsulates an application's "invariant" logic -
// conditions that must always hold true.
//
// It handles [Command] messages and records [Event] messages that represent
// changes to application state.
export type AggregateMessageHandler<
  RootT extends AggregateRoot = AggregateRoot,
> = {
  // configure() declares the handler's configuration by calling methods on c.
  configure(c: AggregateConfigurer): void;

  // newRoot() returns a new [AggregateRoot] representing the initial state of
  // an aggregate instance.
  newRoot(): RootT;

  // routeCommandToInstance() returns the ID of the aggregate instance that c
  // targets.
  routeCommandToInstance(c: Command): string;

  // handleCommand() updates an aggregate instance's state by recording [Event]
  // messages that represent the effects of a [Command].
  handleCommand(r: RootT, s: AggregateCommandScope<RootT>, c: Command): void;

  // applyEvent() updates the aggregate instance to reflect the occurrence of an
  // event.
  applyEvent(r: RootT, e: Event): void;

  // describeInstance() returns a human-readable description of the aggregate
  // instance's current state, for use in logging and telemetry.
  describeInstance?(r: RootT): string;

  // marshal() returns a binary or string representation of the aggregate
  // instance's current state suitable for use as a snapshot.
  marshal?(r: RootT): Uint8Array | string;

  // unmarshal() populates the aggregate instance's state from its snapshot
  // representation.
  unmarshal?(r: RootT, data: Uint8Array | string): void;
};

// AggregateConfigurer is the interface an [AggregateMessageHandler] uses to
// declare its configuration.
export type AggregateConfigurer = HandlerConfigurer & {
  // routes() declares the message types that the handler consumes and produces.
  //
  // It accepts routes created by [handlesCommand] and [recordsEvent].
  routes(...routes: AggregateRoute[]): void;
};

// AggregateCommandScope represents the context within which an
// [AggregateMessageHandler] handles a [Command] message.
export type AggregateCommandScope<RootT extends AggregateRoot = AggregateRoot> =
  HandlerScope & {
    // instanceID() returns the ID of the aggregate instance that the [Command]
    // targets, as returned by [AggregateMessageHandler].routeCommandToInstance.
    instanceID(): string;

    // recordEvent() records an [Event] that results from handling the [Command].
    //
    // It applies the event to the aggregate root, making the state changes
    // visible to the handler immediately.
    recordEvent(e: Event): void;
  };

// AggregateRoute describes a message type that's routed to or from a
// [AggregateMessageHandler].
export type AggregateRoute = HandlesCommandRoute | RecordsEventRoute;

// NoSnapshotBehavior contains helpers for [AggregateMessageHandler]
// implementations that don't support snapshots.
export const NoSnapshotBehavior = {
  marshal(): never {
    throw new NotSupportedError();
  },
  unmarshal(_data: any): never {
    throw new NotSupportedError();
  },
};

// applyAggregateEvent applies an event to an aggregate root using the
// handler's `applyEvent` function.
export function applyAggregateEvent<RootT extends AggregateRoot>(
  handler: AggregateMessageHandler<RootT>,
  root: RootT,
  event: Event,
): void {
  handler.applyEvent(root, event);
}

// describeAggregateInstance returns a human-readable description of an
// aggregate root.
export function describeAggregateInstance<RootT extends AggregateRoot>(
  handler: AggregateMessageHandler<RootT>,
  root: RootT,
): string {
  return handler.describeInstance?.(root) ?? "";
}
