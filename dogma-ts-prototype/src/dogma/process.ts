import { HandlerConfigurer, HandlerScope } from "./handler.ts";
import { MessageRoute } from "./message-route.ts";
import { Command, Deadline, UnexpectedMessageError } from "./message.ts";

// A ProcessMessageHandler encapsulates an application's "workflow" logic -
// stateful decision-making that spans multiple [Command] messages.
//
// It handles [Event] messages and executes [Command] to enact further
// application state changes. It may also schedule [Deadline] messages to perform
// actions at specific times. For example, to send a reminder if a customer
// hasn't completed the checkout process within one hour.
//
// Each process message handler typically manages multiple instances, where each
// instance represents a distinct occurrence of the process. For example, a
// shopping cart checkout process might use one instance per customer.
//
// Process message handlers coordinate state changes that involve some
// combination of multiple aggregate instances, integrations with external
// systems, and time-based logic. As a general rule, they should implement only
// workflow logic. For example, a process might decide when to refund a
// customer's purchase, but shouldn't calculate the refund amount or interact
// directly with the payment processor.
//
// When a new event route is added to an existing process, the engine does not
// guarantee delivery of historical events of the new type. Some, all, or none
// of the historical events may be delivered, depending on the engine's
// consumption tracking. To ensure a process sees the complete event history for
// all of its routes, deploy it as a new handler with a new identity.
//
// The engine may call the handler's methods from multiple promises
// concurrently.
export type ProcessMessageHandler<RootT extends ProcessRoot = ProcessRoot> = {
  // configure() declares the handler's configuration by calling methods on c.
  //
  // The configuration includes the handler's identity and message routes.
  //
  // The engine calls this method at least once during startup. It must
  // produce the same configuration each time it's called.
  configure(c: ProcessConfigurer): void;

  // newRoot() returns a new [ProcessRoot] representing the initial state of a
  // process instance.
  //
  // The engine calls this method to get a "blank slate" when handling the
  // first [Event] for a new instance. Unlike aggregates, the engine doesn't
  // reconstruct process state from historical events.
  //
  // Not all processes maintain state. Embed [StatelessProcessBehavior] in the
  // handler implementation to indicate that the process is stateless.
  newRoot(): RootT;

  // routeEventToInstance() returns the ID of the process instance that e
  // targets.
  //
  // If ok is false, the handler ignores the event. Otherwise, the returned ID
  // must be a non-empty string that uniquely identifies the target instance.
  // For example, in a shopping cart checkout process, the instance ID might
  // be the customer's ID. RFC 9562 UUIDs are the recommended format.
  //
  // Events routed to the same instance operate on the same state. There's no
  // need to create an instance in advance - it "exists" once the handler
  // modifies its [ProcessRoot], executes a [Command], or schedules a
  // [Deadline] against it.
  //
  // The engine calls this method before handling the [Event]. The
  // implementation may query external data - such as the application's
  // projections - but this isn't recommended. Wherever possible, it should
  // derive the ID from information within e.
  //
  // If the process instance identified by the returned ID has ended, the
  // engine ignores the event.
  routeEventToInstance(r: RootT, e: Event): { id: string; ok: boolean };

  // handleEvent() begins or advances a process in response to an [Event]
  // message.
  //
  // r is the [ProcessRoot] for the instance that the event targets, as
  // determined by [ProcessMessageHandler].RouteEventToInstance. It reflects
  // the state of the targeted instance after handling any prior [Event] or
  // [Deadline] messages.
  //
  // The implementation may update r directly, execute [Command] messages,
  // schedule [Deadline] messages, or end the process. It may query external
  // data - such as the application's projections - but this isn't
  // recommended. Wherever possible, logic should depend solely on information
  // within r, s, and e.
  //
  // The engine atomically persists the state changes, events, and deadlines
  // produced by exactly one successful invocation of this method for each
  // event message. It doesn't guarantee the order, number, or concurrency of
  // those attempts. Generally, the implementation doesn't need to perform any
  // synchronization or idempotency checks.
  //
  // The engine delivers all [Event] messages recorded within a single scope
  // in the order they occurred. It also preserves the order of events from a
  // single aggregate instance, even across scopes. It doesn't guarantee the
  // relative delivery order of events from different handlers or aggregate
  // instances.
  //
  // The handler may retain or mutate e and the values within it.
  handleEvent(r: RootT, s: ProcessEventScope<RootT>, e: Event): void;

  // HandleDeadline advances a process in response to a [Deadline] message.
  //
  // r is the [ProcessRoot] for the instance that scheduled the deadline. It
  // reflects the state of the targeted instance after handling any prior
  // [Event] or [Deadline] messages.
  //
  // The implementation may change the instance's state, execute [Command]
  // messages, schedule [Deadline] messages, or end the process. It may query
  // external data - such as the application's projections - but this isn't
  // recommended. Wherever possible, logic should depend solely on information
  // within r, s, and d.
  //
  // The implementation must not modify r directly; use [ProcessScope].Mutate
  // instead. The callback passed to Mutate must not use r or s.
  //
  // The engine atomically persists the state changes, events, and deadlines
  // produced by exactly one successful invocation of this method for each
  // deadline message. It doesn't guarantee the order, number, or concurrency
  // of those attempts. Generally, the implementation doesn't need to perform
  // any synchronization or idempotency checks.
  //
  // The engine attempts to deliver deadline messages at their scheduled time.
  // It may deliver them later when recovering from downtime or retrying after
  // a failure. It doesn't guarantee the relative delivery order of deadline
  // messages with the same scheduled time.
  //
  // Not all processes use deadlines. Embed [NoDeadlineMessagesBehavior] in
  // the handler implementation to indicate that deadline messages aren't
  // used.
  //
  // The handler may retain or mutate d and the values within it.
  handleDeadline(r: RootT, s: ProcessDeadlineScope<RootT>, d: Deadline): void;
};

// A ProcessRoot is an interface for an application's representation of a
// process instance used within [ProcessMessageHandler] implementations.
//
// It encapsulates process logic and provides a way to inspect the current state
// when making decisions about which commands to execute and which deadlines to
// schedule.
export type ProcessRoot = {
  // processInstanceDescription() returns a human-readable description of the
  // process instance's current state, for use in logging and telemetry.
  //
  // The description should be clear and relevant to developers and
  // non-technical stakeholders familiar with the application's domain.
  // It's not intended for display to end users.
  //
  // The description should not include the instance's identity.
  //
  // ended is true if [ProcessScope].End has been called for this instance;
  // the description may reflect this, for example by using past tense to
  // indicate that the process has completed.
  //
  // Use lowercase with no trailing punctuation. Omit sensitive
  // information. For example: "awaiting seller response, offer placed".
  //
  // Return an empty string if the instance has no meaningful state to
  // describe.
  processInstanceDescription?(ended: boolean): string;

  // marshal() returns a binary representation of the process instance's
  // current state.
  marshal?(): string;

  // unmarshal() populates the process instance's state from its binary
  // representation.
  //
  // The implementation must clone the data if it is used after returning.
  unmarshal?(data: string): void;
};

// ProcessConfigurer is the interface that a [ProcessMessageHandler] uses to
// declare its configuration.
//
// The engine provides the implementation to [ProcessMessageHandler].Configure
// during startup.
export type ProcessConfigurer = HandlerConfigurer & {
  // routes() declares the message types that the handler consumes and produces.
  //
  // It accepts routes created by [HandlesEvent], [ExecutesCommand], and
  // [SchedulesDeadline].
  routes(...processRoute: ProcessRoute[]): void;
};

// ProcessScope represents the context within which a [ProcessMessageHandler]
// handles a message.
//
// Each kind of message handled by a process message handler has a corresponding
// scope type that extends this interface:
//
//   - [ProcessEventScope]
//   - [ProcessDeadlineScope]
export type ProcessScope<RootT extends ProcessRoot> = HandlerScope & {
  // instanceID() returns the ID of the process instance that the message
  // targets.
  //
  // When handling an [Event] message, it returns the ID produced by
  // [ProcessMessageHandler].RouteEventToInstance during routing.
  //
  // When handling a [Deadline] message, it returns the ID of the instance that
  // scheduled the deadline.
  instanceID(r: RootT): string;

  // end() signals the end of a process.
  //
  // The engine discards the instance's state, cancels any pending [Deadline]
  // messages. It ignores any future messages that target the ended instance.
  end(r: RootT): void;

  // executeCommand() submits a [Command] for execution.
  //
  // The engine persists all commands and deadlines produced within this scope
  // in a single atomic operation after the [ProcessMessageHandler] finishes
  // handling the inbound message. If the handler returns a non-nil error, the
  // engine discards the messages.
  //
  // This method panics if the process instance has ended.
  executeCommand(r: RootT, c: Command): void;

  // scheduleDeadline() schedules a [Deadline] message to occur at the specified
  // time.
  //
  // The engine persists all commands and deadlines produced within this scope
  // in a single atomic operation after the [ProcessMessageHandler] finishes
  // handling the inbound message. If the handler returns a non-nil error, the
  // engine discards the messages.
  //
  // This method panics if the process instance has ended.
  scheduleDeadline(r: RootT, d: Deadline, dt: Date): void;
};

// ProcessEventScope represents the context within which a
// [ProcessMessageHandler] handles an [Event] message.
export type ProcessEventScope<RootT extends ProcessRoot> =
  ProcessScope<RootT> & {
    // recordedAt() returns the time at which the inbound [Event] occurred.
    recordedAt(r: RootT): Date;
  };

// ProcessDeadlineScope represents the context within which a
// [ProcessMessageHandler] handles a [Deadline] message.
export type ProcessDeadlineScope<RootT extends ProcessRoot> =
  ProcessScope<RootT> & {
    // scheduledFor() returns the time at which the deadline occurred.
    //
    // Even though the engine attempts to deliver deadlines at their scheduled
    // time, it may deliver them later when recovering from downtime or retrying
    // after a failure.
    scheduledFor(r: RootT): Date;
  };

// ProcessRoute describes a message type that's routed to or from a
// [ProcessMessageHandler].
export type ProcessRoute = MessageRoute & {
  isProcessRoute(): boolean;
};

// --------------------------------------------------------------------------------

// // NoDeadlineMessagesBehavior is an embeddable type for [ProcessMessageHandler]
// // implementations that don't use [Deadline] messages.
// //
// // Embed this type in a [ProcessMessageHandler] to signal that the handler
// // doesn't schedule deadlines and to avoid boilerplate code that's never
// // used.
// export type NoDeadlineMessagesBehavior = {};

// // HandleDeadline panics with the [UnexpectedMessageError] value.
// func (NoDeadlineMessagesBehavior) HandleDeadline(
// 	context.Context,
// 	ProcessRoot,
// 	ProcessDeadlineScope,
// 	Deadline,
// ) error {
// 	throw new UnexpectedMessageError();
// }

// NOTE(KM): V2 New attempt at above
// // handleDeadlineNoDeadlineMessagesBehavior throws with the [UnexpectedMessageError] value.
// export function handleDeadlineNoDeadlineMessagesBehavior<
//   RootT extends ProcessRoot<RootT>,
// >(_: ProcessRoot<RootT>, s: ProcessDeadlineScope<RootT>, d: Deadline): void {
//   throw new UnexpectedMessageError();
// }

// // NOTE(KM): V3 New attempt at above
// // NoDeadlineMessagesBehavior is an embeddable type for [ProcessMessageHandler]
// // implementations that don't use [Deadline] messages.
// //
// // Embed this type in a [ProcessMessageHandler] to signal that the handler
// // doesn't schedule deadlines and to avoid boilerplate code that's never
// // used.
// export const NoDeadlineMessagesBehavior = {
//   handleDeadline<RootT extends ProcessRoot<RootT>>(
//     _r: ProcessRoot<RootT>,
//     _s: ProcessDeadlineScope<RootT>,
//     _d: Deadline,
//   ) {
//     throw new UnexpectedMessageError();
//   },
// };

// --------------------------------------------------------------------------------

// // StatelessProcessBehavior is an embeddable type for [ProcessMessageHandler]
// // implementations that don't maintain any state.
// //
// // Embed this type in a [ProcessMessageHandler] to signal that the handler is
// // stateless and to avoid boilerplate code that's never used.
// export type StatelessProcessBehavior = {};

// // New returns [StatelessProcessRoot].
// func (StatelessProcessBehavior) New() ProcessRoot {
// 	return StatelessProcessRoot
// }

// // StatelessProcessRoot is an empty [ProcessRoot] for processes that don't
// // maintain any state.
// //
// // Embed [StatelessProcessBehavior] in a [ProcessMessageHandler] to use this
// // type as its [ProcessRoot] implementation.
// //
// // The engine may provide optimized persistence for stateless processes that use
// // this type.
// const StatelessProcessRoot: ProcessRoot = statelessProcessRoot{}

// type statelessProcessRoot = {};

// --------------------------------------------------------------------------------

// NOTE(KM): V2 attempt at above...

// // StatelessProcessRoot is an empty [ProcessRoot] for processes that don't
// // maintain any state.
// //
// // Embed [StatelessProcessBehavior] in a [ProcessMessageHandler] to use this
// // type as its [ProcessRoot] implementation.
// //
// // The engine may provide optimized persistence for stateless processes that use
// // this type.
// const StatelessProcessRoot = {};

// // StatelessProcessBehavior is an embeddable type for [ProcessMessageHandler]
// // implementations that don't maintain any state.
// //
// // Embed this type in a [ProcessMessageHandler] to signal that the handler is
// // stateless and to avoid boilerplate code that's never used.
// export type StatelessProcessBehavior<RootT extends ProcessRoot<RootT>> = {
//   // New returns [StatelessProcessRoot].
//   // newRoot<RootT extends ProcessRoot<RootT>>(): ProcessRoot<RootT> {
//   // newRoot<RootT>(): ProcessRoot<RootT> {
//   newRoot(): ProcessRoot<RootT> {
//     // return StatelessProcessRoot;
//     return {};
//   },
// };
