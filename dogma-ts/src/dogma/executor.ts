import {
  mustRegisteredMessageTypeFor,
  type RegisteredMessageType,
} from "./message-type-registry.ts";
import type { Command, Event } from "./message.ts";
import type { Context } from "./util.ts";

// A CommandExecutor submits [Command] messages for execution.
export type CommandExecutor = {
  // executeCommand() submits a [Command] for execution.
  executeCommand(
    ctx: Context,
    c: Command,
    ...options: ExecuteCommandOption[]
  ): Promise<void> | void;
  executeCommand(
    c: Command,
    ...options: ExecuteCommandOption[]
  ): Promise<void> | void;
};

// IdempotencyKeyOption is an [ExecuteCommandOption] that sets a unique
// identifier for a [Command].
export type IdempotencyKeyOption = {
  readonly kind: "IdempotencyKey";
  readonly key: string;
  keyValue(): string;
};

// EventObserver is a callback invoked by the engine for each event of type T
// recorded as a result of executing a command with
// [CommandExecutor].executeCommand.
export type EventObserver<T extends Event = Event> = (
  ctx: Context,
  e: T,
) => Promise<boolean> | boolean;

// EventObserverOption is an [ExecuteCommandOption] that observes events of a
// specific type recorded during command execution.
export type EventObserverOption = {
  readonly kind: "EventObserver";
  readonly eventType: RegisteredMessageType;
  readonly observer: (ctx: Context, e: Event) => Promise<boolean> | boolean;
  eventTypeValue(): RegisteredMessageType;
  observerValue(): (ctx: Context, e: Event) => Promise<boolean> | boolean;
};

// ExecuteCommandOption is an option that modifies the behavior of
// [CommandExecutor].executeCommand.
export type ExecuteCommandOption = IdempotencyKeyOption | EventObserverOption;

// withIdempotencyKey returns an [ExecuteCommandOption] that sets a stable
// identifier for the [Command].
export function withIdempotencyKey(key: string): IdempotencyKeyOption {
  if (key === "") {
    throw new Error("idempotency key cannot be empty");
  }
  return {
    kind: "IdempotencyKey",
    key,
    keyValue() {
      return key;
    },
  };
}

// withEventObserver returns an [ExecuteCommandOption] that observes events of
// type T recorded while executing a command.
export function withEventObserver<T extends Event = Event>(
  nameOrType: T["name"] | RegisteredMessageType,
  fn: EventObserver<T>,
): EventObserverOption {
  if (!fn) {
    throw new Error("event observer cannot be null or undefined");
  }
  const typ = mustRegisteredMessageTypeFor(nameOrType);
  const observer = (ctx: Context, e: Event): Promise<boolean> | boolean => {
    if (e.name === typ.name) {
      return fn(ctx, e as T);
    }
    return false;
  };
  return {
    kind: "EventObserver",
    eventType: typ,
    observer,
    eventTypeValue() {
      return typ;
    },
    observerValue() {
      return observer;
    },
  };
}
