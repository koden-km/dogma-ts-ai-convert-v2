import type { ConcurrencyPreference } from "./concurrency.ts";
import { NotSupportedError } from "./error.ts";
import type { HandlerConfigurer, HandlerScope } from "./handler.ts";
import type { HandlesEventRoute } from "./message-route.ts";
import type { Event } from "./message.ts";
import type { Context } from "./util.ts";

// A ProjectionMessageHandler builds a denormalized view of the application's
// state that's optimized for querying.
export type ProjectionMessageHandler = {
  // configure() declares the handler's configuration by calling methods on c.
  configure(c: ProjectionConfigurer): void;

  // handleEvent() updates the projection to reflect the occurrence of an
  // [Event].
  //
  // Returns cp, the new checkpoint offset for this stream.
  handleEvent(
    ctx: Context,
    s: ProjectionEventScope,
    e: Event,
  ): Promise<bigint> | bigint;

  // checkpointOffset() returns the offset at which the handler expects to
  // resume handling events from a specific stream.
  checkpointOffset(ctx: Context, id: string): Promise<bigint> | bigint;

  // compact() reduces the projection's size by removing or consolidating data.
  compact(
    ctx: Context,
    s: ProjectionCompactScope,
  ): Promise<void> | void;

  // reset() clears all projection data and checkpoint offsets such that the
  // projection data is rebuilt by handling all historical events.
  reset(ctx: Context, s: ProjectionResetScope): Promise<void> | void;
};

// ProjectionConfigurer is the interface that a [ProjectionMessageHandler] uses
// to declare its configuration.
export type ProjectionConfigurer = HandlerConfigurer & {
  // routes() declares the message types that the handler consumes.
  //
  // It accepts routes created by [handlesEvent].
  routes(...routes: ProjectionRoute[]): void;

  // concurrencyPreference() provides a hint to the engine as to the best way to
  // handle concurrent messages for this handler.
  //
  // The default is [MaximizeConcurrency].
  concurrencyPreference(p: ConcurrencyPreference): void;
};

// ProjectionEventScope represents the context within which a
// [ProjectionMessageHandler] handles an [Event] message.
export type ProjectionEventScope = HandlerScope & {
  // recordedAt() returns the time at which the [Event] occurred.
  recordedAt(): Date;

  // streamID() returns the RFC 9562 UUID that identifies the event stream to
  // which the [Event] belongs.
  streamID(): string;

  // offset() returns the event's zero-based offset within the stream.
  offset(): bigint;

  // checkpointOffset() returns the offset from which the handler should resume
  // handling events from this stream, according to the engine.
  checkpointOffset(): bigint;
};

// ProjectionCompactScope represents the context within which a
// [ProjectionMessageHandler] compacts its data.
export type ProjectionCompactScope = HandlerScope;

// ProjectionResetScope represents the context within which a
// [ProjectionMessageHandler] resets its data.
export type ProjectionResetScope = HandlerScope;

// ProjectionRoute describes a message type that's routed to a
// [ProjectionMessageHandler].
export type ProjectionRoute = HandlesEventRoute;

// NoCompactBehavior is an embeddable object for [ProjectionMessageHandler]
// implementations that don't require compaction.
export const NoCompactBehavior = {
  compact(_ctx: Context, _s: ProjectionCompactScope): void {
    // no-op
  },
};

// NoResetBehavior is an embeddable object for [ProjectionMessageHandler]
// implementations that don't support resetting their state.
export const NoResetBehavior = {
  reset(_ctx: Context, _s: ProjectionResetScope): never {
    throw new NotSupportedError();
  },
};
