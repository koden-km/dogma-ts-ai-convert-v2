import { NotSupportedError } from "./error.ts";
import { HandlerConfigurer, HandlerScope } from "./handler.ts";
import { MessageRoute } from "./message-route.ts";
import { Command, Event } from "./message.ts";

// An AggregateMessageHandler encapsulates an application's "invariant" logic -
// conditions that must always hold true.
//
// It handles [Command] messages and records [Event] messages that represent
// changes to application state.
//
// An "aggregate" is a collection of related business entities that behave as a
// cohesive whole, such as a shopping cart and the items within it. The
// aggregate message handler manages the behavior and state of such aggregates.
// The term doesn't refer to data aggregation or summarization.
//
// Each aggregate message handler typically manages multiple instances, where
// each instance represents a distinct occurrence of the aggregate. For example,
// a shopping cart aggregate might use one instance per customer.
//
// Aggregates enforce business rules that must always hold true for a specific
// instance. For example, a shopping cart aggregate might prevent checkout if
// the cart is empty, or limit the number of items to 10.
export type AggregateMessageHandler<
  RootT extends AggregateRoot = AggregateRoot,
> = {
  // configure() declares the handler's configuration by calling methods on c.
  //
  // The configuration includes the handler's identity and message routes.
  //
  // The engine calls this method at least once during startup. It must
  // produce the same configuration each time it's called.
  configure(c: AggregateConfigurer): void;

  // newRoot() returns a new [AggregateRoot] representing the initial state of
  // an aggregate instance.
  //
  // The engine calls this method to get a "blank slate" when handling the
  // first [Command] for a new instance or when reconstructing an existing
  // instance from its historical [Event] messages.
  newRoot(): RootT;

  // routeCommandToInstance() returns the ID of the aggregate instance that c
  // targets.
  //
  // The return value must be a non-empty string that uniquely identifies the
  // target instance. For example, in a shopping cart aggregate, the instance
  // ID might be the customer's ID. RFC 9562 UUIDs are the recommended format.
  //
  // Commands routed to the same instance operate on the same state. There's
  // no need to create an instance in advance - it "exists" once the handler
  // records an [Event] against it.
  //
  // The engine calls this method before handling the [Command]. The
  // implementation must derive the ID from information within c.
  routeCommandToInstance(c: Command): string;

  // handleCommand() updates an aggregate instance's state by recording [Event]
  // messages that represent the effects of a [Command].
  //
  // r is the [AggregateRoot] for the instance that the command targets, as
  // determined by [AggregateMessageHandler].RouteCommandToInstance. It
  // reflects the state of the targeted instance after applying its historical
  // events.
  //
  // The implementation must not cause external side-effects or modify r
  // directly. Logic must depend only on information within r, s, and c.
  //
  // The engine atomically persists the events recorded by exactly one
  // successful invocation of this method for each command message. It doesn't
  // guarantee the order, number, or concurrency of those attempts. The
  // implementation doesn't need to perform any synchronization or idempotency
  // checks.
  handleCommand(r: RootT, s: AggregateCommandScope<RootT>, c: Command): void;
};

// An AggregateRoot is an interface for an application's working representation
// of an aggregate instance used within [AggregateMessageHandler]
// implementations.
//
// It encapsulates business logic and provides a way to inspect the current
// state when making decisions about which events to record. The recorded events
// are the authoritative source of truth, not the AggregateRoot.
export type AggregateRoot = {
  // aggregateInstanceDescription() returns a human-readable description of the
  // aggregate instance's current state, for use in logging and telemetry.
  //
  // The description should be clear and relevant to developers and
  // non-technical stakeholders familiar with the application's domain. It's
  // not intended for display to end users.
  //
  // The description should not include the instance's identity.
  //
  // Use lowercase with no trailing punctuation. Omit sensitive information. For
  // example: "3 items, awaiting payment".
  //
  // Return an empty string if the instance has no meaningful state to describe.
  aggregateInstanceDescription?(): string;

  // applyEvent() updates the aggregate instance to reflect the occurrence of an
  // event.
  //
  // The engine calls this method when loading the instance from historical
  // events or recording a new event. It must handle all historical event
  // types, including those no longer routed to this aggregate.
  applyEvent(e: Event): void;

  // marshal() returns a serialized representation of the aggregate instance's
  // current state suitable for use as a snapshot.
  //
  // Snapshots are an optimization that reduces the number of events applied
  // when loading an aggregate instance from its event history. Aggregates
  // that produce few events over their instances' lifetime may omit snapshot
  // support by embedding [NoSnapshotBehavior] or returning [ErrNotSupported].
  marshal?(): string;

  // unmarshal() populates the aggregate instance's state from its serial
  // representation.
  //
  // The implementation must clone the data if it is used after returning.
  unmarshal?(data: string): void;
};

// AggregateConfigurer is the interface an [AggregateMessageHandler] uses to
// declare its configuration.
//
// The engine provides the implementation to
// [AggregateMessageHandler].Configure during startup.
export type AggregateConfigurer = HandlerConfigurer & {
  // routes() declares the message types that the handler consumes and produces.
  //
  // It accepts routes created by [handlesCommand] and [recordsEvent].
  routes(...routes: AggregateRoute[]): void;
};

// AggregateCommandScope represents the context within which an
// [AggregateMessageHandler] handles a [Command] message.
export type AggregateCommandScope<RootT extends AggregateRoot> =
  HandlerScope & {
    // instanceID() returns the ID of the aggregate instance that the [Command]
    // targets, as returned by [AggregateMessageHandler].RouteCommandToInstance.
    instanceID(): string;

    // recordEvent() records an [Event] that results from handling the [Command].
    //
    // It applies the event to the aggregate root by calling
    // [AggregateRoot].applyEvent(), making the state changes visible to the
    // handler immediately.
    //
    // The engine persists all events recorded within this scope in a single
    // atomic operation after the [AggregateMessageHandler] finishes handling
    // the inbound command.
    recordEvent(e: Event): void;
  };

// AggregateRoute describes a message type that's routed to or from a
// [AggregateMessageHandler].
export type AggregateRoute = MessageRoute & {
  isAggregateRoute(): void;
};

// NoSnapshotBehavior contains some helpers for [AggregateRoot] implementations
// that don't support snapshots.
export const NoSnapshotBehavior = {
  // marshal() always throws NotSupportedError.
  marshal(): string {
    throw new NotSupportedError();
  },

  // unmarshal() always throws NotSupportedError.
  unmarshal(data: string): void {
    throw new NotSupportedError();
  },
};
