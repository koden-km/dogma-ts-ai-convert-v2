import {
  mustRegisteredMessageTypeFor,
  type RegisteredMessageType,
} from "./message-type-registry.ts";
import type { Command, Deadline, Event } from "./message.ts";

export type MessageRouteKind =
  | "HandlesCommand"
  | "ExecutesCommand"
  | "RecordsEvent"
  | "HandlesEvent"
  | "SchedulesDeadline";

// HandlesCommandRoute is a [MessageRoute] that represents a handler's
// ability to handle [Command] messages of a specific type.
export type HandlesCommandRoute = {
  readonly kind: "HandlesCommand";
  readonly typ: RegisteredMessageType;
};

// ExecutesCommandRoute is a [MessageRoute] that represents a handler's
// ability to execute [Command] messages of a specific type.
export type ExecutesCommandRoute = {
  readonly kind: "ExecutesCommand";
  readonly typ: RegisteredMessageType;
};

// HandlesEventRoute is a [MessageRoute] that represents a handler's
// ability to handle [Event] messages of a specific type.
export type HandlesEventRoute = {
  readonly kind: "HandlesEvent";
  readonly typ: RegisteredMessageType;
};

// RecordsEventRoute is a [MessageRoute] that represents a handler's
// ability to record [Event] messages of a specific type.
export type RecordsEventRoute = {
  readonly kind: "RecordsEvent";
  readonly typ: RegisteredMessageType;
};

// SchedulesDeadlineRoute is a [MessageRoute] that represents a handler's
// ability to schedule [Deadline] messages of a specific type.
export type SchedulesDeadlineRoute = {
  readonly kind: "SchedulesDeadline";
  readonly typ: RegisteredMessageType;
};

// MessageRoute describes a relationship between a message handler and a
// specific message type.
export type MessageRoute =
  | HandlesCommandRoute
  | ExecutesCommandRoute
  | HandlesEventRoute
  | RecordsEventRoute
  | SchedulesDeadlineRoute;

// handlesCommand configures an [AggregateMessageHandler] or
// [IntegrationMessageHandler] as a consumer of [Command] messages of type T.
export function handlesCommand<T extends Command = Command>(
  nameOrType: T["name"] | RegisteredMessageType,
): HandlesCommandRoute {
  return {
    kind: "HandlesCommand",
    typ: mustRegisteredMessageTypeFor(nameOrType),
  };
}

// executesCommand configures a [ProcessMessageHandler] as a producer of
// [Command] messages of type T.
export function executesCommand<T extends Command = Command>(
  nameOrType: T["name"] | RegisteredMessageType,
): ExecutesCommandRoute {
  return {
    kind: "ExecutesCommand",
    typ: mustRegisteredMessageTypeFor(nameOrType),
  };
}

// recordsEvent configures an [AggregateMessageHandler] or
// [IntegrationMessageHandler] as a producer of [Event] messages of type T.
export function recordsEvent<T extends Event = Event>(
  nameOrType: T["name"] | RegisteredMessageType,
): RecordsEventRoute {
  return {
    kind: "RecordsEvent",
    typ: mustRegisteredMessageTypeFor(nameOrType),
  };
}

// handlesEvent configures a [ProcessMessageHandler] or [ProjectionMessageHandler] as a
// consumer of [Event] messages of type T.
export function handlesEvent<T extends Event = Event>(
  nameOrType: T["name"] | RegisteredMessageType,
): HandlesEventRoute {
  return {
    kind: "HandlesEvent",
    typ: mustRegisteredMessageTypeFor(nameOrType),
  };
}

// schedulesDeadline configures a [ProcessMessageHandler] as a scheduler of
// [Deadline] messages of type T.
export function schedulesDeadline<T extends Deadline = Deadline>(
  nameOrType: T["name"] | RegisteredMessageType,
): SchedulesDeadlineRoute {
  return {
    kind: "SchedulesDeadline",
    typ: mustRegisteredMessageTypeFor(nameOrType),
  };
}
