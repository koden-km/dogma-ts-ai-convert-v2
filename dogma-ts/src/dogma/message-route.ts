import {
  mustRegisteredMessageTypeFor,
  type RegisteredMessageType,
} from "./message-type-registry.ts";
import type { Command, Deadline, Event } from "./message.ts";
import type { AggregateRoute } from "./aggregate.ts";
import type { IntegrationRoute } from "./integration.ts";
import type { ProcessRoute } from "./process.ts";
import type { ProjectionRoute } from "./projection.ts";

export type MessageRouteKind =
  | "HandlesCommand"
  | "ExecutesCommand"
  | "RecordsEvent"
  | "HandlesEvent"
  | "SchedulesDeadline";

// MessageRoute is an interface for types that describe a relationship between a
// message handler and a specific message type.
export type MessageRoute = {
  readonly kind: MessageRouteKind;
  readonly typ: RegisteredMessageType;
  isMessageRoute(): void;
  type(): RegisteredMessageType;
};

// HandlesCommandRoute is a [MessageRoute] that represents a handler's
// ability to handle [Command] messages of a specific type.
export type HandlesCommandRoute = MessageRoute &
  AggregateRoute &
  IntegrationRoute & {
    readonly kind: "HandlesCommand";
  };

// ExecutesCommandRoute is a [MessageRoute] that represents a handler's
// ability to execute [Command] messages of a specific type.
export type ExecutesCommandRoute = MessageRoute &
  ProcessRoute & {
    readonly kind: "ExecutesCommand";
  };

// HandlesEventRoute is a [MessageRoute] that represents a handler's
// ability to handle [Event] messages of a specific type.
export type HandlesEventRoute = MessageRoute &
  ProcessRoute &
  ProjectionRoute & {
    readonly kind: "HandlesEvent";
  };

// RecordsEventRoute is a [MessageRoute] that represents a handler's
// ability to record [Event] messages of a specific type.
export type RecordsEventRoute = MessageRoute &
  AggregateRoute &
  IntegrationRoute & {
    readonly kind: "RecordsEvent";
  };

// SchedulesDeadlineRoute is a [MessageRoute] that represents a handler's
// ability to schedule [Deadline] messages of a specific type.
export type SchedulesDeadlineRoute = MessageRoute &
  ProcessRoute & {
    readonly kind: "SchedulesDeadline";
  };

export type HandlesCommandOption = {
  readonly _futureHandlesCommandOption?: "HandlesCommandOption";
};

export type ExecutesCommandOption = {
  readonly _futureExecutesCommandOption?: "ExecutesCommandOption";
};

export type HandlesEventOption = {
  readonly _futureHandlesEventOption?: "HandlesEventOption";
};

export type RecordsEventOption = {
  readonly _futureRecordsEventOption?: "RecordsEventOption";
};

export type SchedulesDeadlineOption = {
  readonly _futureSchedulesDeadlineOption?: "SchedulesDeadlineOption";
};

// handlesCommand configures an [AggregateMessageHandler] or
// [IntegrationMessageHandler] as a consumer of [Command] messages of type T.
export function handlesCommand<T extends Command = Command>(
  nameOrType: T["name"] | RegisteredMessageType,
  ..._options: HandlesCommandOption[]
): HandlesCommandRoute {
  const typ = mustRegisteredMessageTypeFor(nameOrType);
  return {
    kind: "HandlesCommand",
    typ,
    isMessageRoute() {},
    isAggregateRoute() {},
    isIntegrationRoute() {
      return true;
    },
    type() {
      return typ;
    },
  };
}

// executesCommand configures a [ProcessMessageHandler] as a producer of
// [Command] messages of type T.
export function executesCommand<T extends Command = Command>(
  nameOrType: T["name"] | RegisteredMessageType,
  ..._options: ExecutesCommandOption[]
): ExecutesCommandRoute {
  const typ = mustRegisteredMessageTypeFor(nameOrType);
  return {
    kind: "ExecutesCommand",
    typ,
    isMessageRoute() {},
    isProcessRoute() {
      return true;
    },
    type() {
      return typ;
    },
  };
}

// recordsEvent configures an [AggregateMessageHandler] or
// [IntegrationMessageHandler] as a producer of [Event] messages of type T.
export function recordsEvent<T extends Event = Event>(
  nameOrType: T["name"] | RegisteredMessageType,
  ..._options: RecordsEventOption[]
): RecordsEventRoute {
  const typ = mustRegisteredMessageTypeFor(nameOrType);
  return {
    kind: "RecordsEvent",
    typ,
    isMessageRoute() {},
    isAggregateRoute() {},
    isIntegrationRoute() {
      return true;
    },
    type() {
      return typ;
    },
  };
}

// handlesEvent configures a [ProcessMessageHandler] or [ProjectionMessageHandler] as a
// consumer of [Event] messages of type T.
export function handlesEvent<T extends Event = Event>(
  nameOrType: T["name"] | RegisteredMessageType,
  ..._options: HandlesEventOption[]
): HandlesEventRoute {
  const typ = mustRegisteredMessageTypeFor(nameOrType);
  return {
    kind: "HandlesEvent",
    typ,
    isMessageRoute() {},
    isProcessRoute() {
      return true;
    },
    isProjectionRoute() {
      return true;
    },
    type() {
      return typ;
    },
  };
}

// schedulesDeadline configures a [ProcessMessageHandler] as a scheduler of
// [Deadline] messages of type T.
export function schedulesDeadline<T extends Deadline = Deadline>(
  nameOrType: T["name"] | RegisteredMessageType,
  ..._options: SchedulesDeadlineOption[]
): SchedulesDeadlineRoute {
  const typ = mustRegisteredMessageTypeFor(nameOrType);
  return {
    kind: "SchedulesDeadline",
    typ,
    isMessageRoute() {},
    isProcessRoute() {
      return true;
    },
    type() {
      return typ;
    },
  };
}
