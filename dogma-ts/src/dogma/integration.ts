import type { ConcurrencyPreference } from "./concurrency.ts";
import type { HandlerConfigurer, HandlerScope } from "./handler.ts";
import type { MessageRoute } from "./message-route.ts";
import type { Command, Event } from "./message.ts";
import type { Context } from "./util.ts";

// An IntegrationMessageHandler connects a Dogma application to an external
// system.
//
// It handles [Command] messages, and may record [Event] messages to describe
// the outcome.
export type IntegrationMessageHandler = {
  // configure() declares the handler's configuration by calling methods on c.
  configure(c: IntegrationConfigurer): void;

  // handleCommand() handles a [Command] message by performing an action outside
  // the Dogma application.
  handleCommand(
    ctx: Context,
    s: IntegrationCommandScope,
    c: Command,
  ): Promise<void> | void;
};

// IntegrationConfigurer is the interface an [IntegrationMessageHandler] uses to
// declare its configuration.
export type IntegrationConfigurer = HandlerConfigurer & {
  // routes() declares the message types that the handler consumes and produces.
  //
  // It accepts routes created by [handlesCommand] and [recordsEvent].
  routes(...routes: IntegrationRoute[]): void;

  // concurrencyPreference() provides a hint to the engine as to the best way to
  // handle concurrent messages for this handler.
  //
  // The default is [MaximizeConcurrency].
  concurrencyPreference(p: ConcurrencyPreference): void;
};

// IntegrationCommandScope represents the context within which an
// [IntegrationMessageHandler] handles a [Command] message.
export type IntegrationCommandScope = HandlerScope & {
  // recordEvent() records an [Event] that results from handling the [Command].
  recordEvent(e: Event): void;
};

// IntegrationRoute is an interface for types that represent a relationship
// between an [IntegrationMessageHandler] and a message type.
export type IntegrationRoute = MessageRoute & {
  isIntegrationRoute(): boolean;
};
