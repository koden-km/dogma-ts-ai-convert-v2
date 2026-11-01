import { AggregateRoot, AggregateMessageHandler } from "./aggregate.ts";
import { IntegrationMessageHandler } from "./integration.ts";
import { ProcessRoot, ProcessMessageHandler } from "./process.ts";
import { ProjectionMessageHandler } from "./projection.ts";

// viaAggregate() configures the [Application] to route messages to and from an
// [AggregateMessageHandler].
//
// Pass the returned [HandlerRoute] to [ApplicationConfigurer].Routes.
export function viaAggregate<RootT extends AggregateRoot>(
  handler: AggregateMessageHandler<RootT>,
  ...viaAggregateOption: ViaAggregateOption[]
): HandlerRoute {
  if (handler === null) {
    throw new Error("handler cannot be null");
  }
  return { handler } as AggregateHandlerRoute<RootT>;
}

// viaProcess() configures the [Application] to route messages to and from a
// [ProcessMessageHandler].
//
// Pass the returned [HandlerRoute] to [ApplicationConfigurer].Routes.
export function viaProcess<RootT extends ProcessRoot>(
  handler: ProcessMessageHandler<RootT>,
  ...viaProcessOption: ViaProcessOption[]
): HandlerRoute {
  if (handler === null) {
    throw new Error("handler cannot be null");
  }
  return { handler } as ProcessHandlerRoute<RootT>;
}

// viaIntegration() configures the [Application] to route messages to and from an
// [IntegrationMessageHandler].
//
// Pass the returned [HandlerRoute] to [ApplicationConfigurer].Routes.
export function viaIntegration(
  handler: IntegrationMessageHandler,
  ...viaIntegrationOption: ViaIntegrationOption[]
): HandlerRoute {
  if (handler === null) {
    throw new Error("handler cannot be null");
  }
  return { handler } as IntegrationHandlerRoute;
}

// viaProjection() configures the [Application] to route messages to a
// [ProjectionMessageHandler].
//
// Pass the returned [HandlerRoute] to [ApplicationConfigurer].Routes.
export function viaProjection(
  handler: ProjectionMessageHandler,
  ...viaProjectionOption: ViaProjectionOption[]
): HandlerRoute {
  if (handler === null) {
    throw new Error("handler cannot be null");
  }
  return { handler } as ProjectionHandlerRoute;
}

// HandlerRoute is an interface for types that represent a relationship
// between the [Application] and a message handler.
//
// Use [ViaAggregate], [ViaProcess], [ViaIntegration], or [ViaProjection]
// to create a HandlerRoute.
export type HandlerRoute = {
  handler:
    | AggregateMessageHandler
    | ProcessMessageHandler
    | IntegrationMessageHandler
    | ProjectionMessageHandler;
};

// AggregateHandlerRoute is a [HandlerRoute] that represents a relationship
// between the [Application] and an [AggregateMessageHandler].
//
// Use [ViaAggregate] to construct values of this type.
export type AggregateHandlerRoute<RootT extends AggregateRoot> = {
  handler: AggregateMessageHandler<RootT>;
};

// ProcessHandlerRoute is a [HandlerRoute] that represents a relationship
// between the [Application] and a [ProcessMessageHandler].
//
// See [ViaProcess] to construct values of this type.
export type ProcessHandlerRoute<RootT extends ProcessRoot> = {
  handler: ProcessMessageHandler<RootT>;
};

// IntegrationHandlerRoute is a [HandlerRoute] that represents a
// relationship between the [Application] and an
// [IntegrationMessageHandler].
//
// Use [ViaIntegration] to construct values of this type.
export type IntegrationHandlerRoute = {
  handler: IntegrationMessageHandler;
};

// ProjectionHandlerRoute is a [HandlerRoute] that represents a relationship
// between the [Application] and a [ProjectionMessageHandler].
//
// Use [ViaProjection] to construct values of this type.
export type ProjectionHandlerRoute = {
  handler: ProjectionMessageHandler;
};

// ViaAggregateOption is an option that modifies the behavior of
// [ViaAggregate].
//
// This type exists for forward compatibility.
export type ViaAggregateOption = {
  // futureViaAggregateOption(): void;
};

// ViaProcessOption is an option that modifies the behavior of
// [ViaProcess].
//
// This type exists for forward compatibility.
export type ViaProcessOption = {
  // futureViaProcessOption(): void;
};

// ViaIntegrationOption is an option that modifies the behavior of
// [ViaIntegration].
//
// This type exists for forward compatibility.
export type ViaIntegrationOption = {
  // futureViaIntegrationOption(): void;
};

// ViaProjectionOption is an option that modifies the behavior of
// [ViaProjection].
//
// This type exists for forward compatibility.
export type ViaProjectionOption = {
  // futureViaProjectionOption(): void;
};

// // Handler returns the [AggregateMessageHandler] for r.
// export function (r AggregateHandlerRoute) Handler(): AggregateMessageHandler {
// 	return r.handler
// }

// // Handler returns the [ProcessMessageHandler] for r.
// func (r ProcessHandlerRoute) Handler() ProcessMessageHandler {
// 	return r.handler
// }

// // Handler returns the [IntegrationMessageHandler] for r.
// func (r IntegrationHandlerRoute) Handler() IntegrationMessageHandler {
// 	return r.handler
// }

// // Handler returns the [ProjectionMessageHandler] for r.
// func (r ProjectionHandlerRoute) Handler() ProjectionMessageHandler {
// 	return r.handler
// }
