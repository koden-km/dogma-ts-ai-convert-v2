import type { AggregateMessageHandler, AggregateRoot } from "./aggregate.ts";
import type { IntegrationMessageHandler } from "./integration.ts";
import type { ProcessMessageHandler, ProcessRoot } from "./process.ts";
import type { ProjectionMessageHandler } from "./projection.ts";

export type HandlerRouteKind =
  | "Aggregate"
  | "Process"
  | "Integration"
  | "Projection";

export type AggregateHandlerRoute = {
  readonly kind: "Aggregate";
  readonly handler: AggregateMessageHandler<any>;
  handlerValue(): AggregateMessageHandler<any>;
};

export type ProcessHandlerRoute = {
  readonly kind: "Process";
  readonly handler: ProcessMessageHandler<any>;
  handlerValue(): ProcessMessageHandler<any>;
};

export type IntegrationHandlerRoute = {
  readonly kind: "Integration";
  readonly handler: IntegrationMessageHandler;
  handlerValue(): IntegrationMessageHandler;
};

export type ProjectionHandlerRoute = {
  readonly kind: "Projection";
  readonly handler: ProjectionMessageHandler;
  handlerValue(): ProjectionMessageHandler;
};

// HandlerRoute represents a relationship between the [Application] and a
// message handler.
export type HandlerRoute =
  | AggregateHandlerRoute
  | ProcessHandlerRoute
  | IntegrationHandlerRoute
  | ProjectionHandlerRoute;

export type ViaAggregateOption = {
  readonly _futureViaAggregateOption?: "ViaAggregateOption";
};

export type ViaProcessOption = {
  readonly _futureViaProcessOption?: "ViaProcessOption";
};

export type ViaIntegrationOption = {
  readonly _futureViaIntegrationOption?: "ViaIntegrationOption";
};

export type ViaProjectionOption = {
  readonly _futureViaProjectionOption?: "ViaProjectionOption";
};

// viaAggregate configures the [Application] to route messages to and from an
// [AggregateMessageHandler].
export function viaAggregate<RootT extends AggregateRoot>(
  handler: AggregateMessageHandler<RootT>,
  ..._options: ViaAggregateOption[]
): AggregateHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Aggregate",
    handler,
    handlerValue() {
      return handler;
    },
  };
}

// viaProcess configures the [Application] to route messages to and from a
// [ProcessMessageHandler].
export function viaProcess<RootT extends ProcessRoot>(
  handler: ProcessMessageHandler<RootT>,
  ..._options: ViaProcessOption[]
): ProcessHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Process",
    handler,
    handlerValue() {
      return handler;
    },
  };
}

// viaIntegration configures the [Application] to route messages to and from an
// [IntegrationMessageHandler].
export function viaIntegration(
  handler: IntegrationMessageHandler,
  ..._options: ViaIntegrationOption[]
): IntegrationHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Integration",
    handler,
    handlerValue() {
      return handler;
    },
  };
}

// viaProjection configures the [Application] to route messages to a
// [ProjectionMessageHandler].
export function viaProjection(
  handler: ProjectionMessageHandler,
  ..._options: ViaProjectionOption[]
): ProjectionHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Projection",
    handler,
    handlerValue() {
      return handler;
    },
  };
}
