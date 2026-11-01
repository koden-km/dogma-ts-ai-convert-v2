import { HandlerConfigurer, HandlerScope } from "./handler.ts";
import { MessageRoute } from "./message-route.ts";
import { Command } from "./message.ts";
import { Context } from "./util.ts";

// An IntegrationMessageHandler connects a Dogma application to an external
// system.
//
// It handles [Command] messages, and may record [Event] messages to describe
// the outcome.
//
// Integration message handlers encapsulate integration logic such as sending an
// email, charging a credit card, or updating a third-party API. They should
// implement only the "glue code". For example, an integration with a payment
// gateway might debit a customer's credit card, but shouldn't apply discounts
// or calculate sales tax.
export type IntegrationMessageHandler = {
  // configure() declares the handler's configuration by calling methods on c.
  //
  // The configuration includes the handler's identity and message routes.
  //
  // The engine calls this method at least once during startup. It must
  // produce the same configuration each time it's called.
  configure(c: IntegrationConfigurer): void;

  // handleCommand() handles a [Command] message by performing an action outside
  // the Dogma application.
  //
  // It may cause side-effects in external systems, such as invoking a
  // third-party API. It may use s to record one or more [Event] messages that
  // describe the outcome.
  //
  // The engine atomically persists the events recorded by exactly one
  // successful invocation of this method for each command message. It doesn't
  // guarantee the order, number, or concurrency of those attempts. The
  // implementation must ensure that the command's external side-effects are
  // idempotent and safe for concurrent execution.
  handleCommand(ctx: Context, s: IntegrationCommandScope, c: Command): void;
};

// IntegrationConfigurer is the interface an [IntegrationMessageHandler] uses to
// declare its configuration.
//
// The engine provides the implementation to
// [IntegrationMessageHandler].Configure during startup.
export type IntegrationConfigurer = HandlerConfigurer & {
  // Routes declares the message types that the handler consumes and produces.
  //
  // It accepts routes created by [HandlesCommand] and [RecordsEvent].
  routes(...integrationRoute: IntegrationRoute[]): void;
};

// IntegrationCommandScope represents the context within which an
// [IntegrationMessageHandler] handles a [Command] message.
export type IntegrationCommandScope = HandlerScope & {
  // recordEvent() records an [Event] that results from handling the [Command].
  //
  // The engine persists all events recorded within this scope in a single
  // atomic operation after the [IntegrationMessageHandler] finishes handling
  // the inbound command. If the handler returns a non-nil error, the engine
  // discards the events.
  recordEvent(e: Event): void;
};

// IntegrationRoute is an interface for types that represent a relationship
// between an [IntegrationMessageHandler] and a message type.
//
// Use [HandlesCommand] or [RecordsEvent] to create an IntegrationRoute.
export type IntegrationRoute = MessageRoute & {
  isIntegrationRoute(): boolean;
};
