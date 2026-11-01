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
};

export type ProcessHandlerRoute = {
  readonly kind: "Process";
  readonly handler: ProcessMessageHandler<any>;
};

export type IntegrationHandlerRoute = {
  readonly kind: "Integration";
  readonly handler: IntegrationMessageHandler;
};

export type ProjectionHandlerRoute = {
  readonly kind: "Projection";
  readonly handler: ProjectionMessageHandler;
};

// HandlerRoute represents a relationship between the [Application] and a
// message handler.
export type HandlerRoute =
  | AggregateHandlerRoute
  | ProcessHandlerRoute
  | IntegrationHandlerRoute
  | ProjectionHandlerRoute;

// viaAggregate configures the [Application] to route messages to and from an
// [AggregateMessageHandler].
export function viaAggregate<RootT extends AggregateRoot>(
  handler: AggregateMessageHandler<RootT>,
): AggregateHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Aggregate",
    handler,
  };
}

// viaProcess configures the [Application] to route messages to and from a
// [ProcessMessageHandler].
export function viaProcess<RootT extends ProcessRoot>(
  handler: ProcessMessageHandler<RootT>,
): ProcessHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Process",
    handler,
  };
}

// viaIntegration configures the [Application] to route messages to and from an
// [IntegrationMessageHandler].
export function viaIntegration(
  handler: IntegrationMessageHandler,
): IntegrationHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Integration",
    handler,
  };
}

// viaProjection configures the [Application] to route messages to a
// [ProjectionMessageHandler].
export function viaProjection(
  handler: ProjectionMessageHandler,
): ProjectionHandlerRoute {
  if (!handler) {
    throw new Error("handler cannot be null or undefined");
  }
  return {
    kind: "Projection",
    handler,
  };
}
