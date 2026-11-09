import {
  create,
  type Message as ProtobufMessage,
} from "@bufbuild/protobuf";
import {
  describeMessage,
  registerCommand,
  registerDeadline,
  registerEvent,
  validateMessage,
} from "./message-type-registry.ts";

// A Message is an application-defined unit of data that describes a [Command],
// [Event], or [Deadline] within a message-based application.
// A Message describes something an [Application] can do or has done.
//
// Each message type implements either [Command], [Event], or [Deadline] as a
// Protocol Buffers message with a `$typeName` discriminator.
export type Message<TypeName extends string = string> =
  ProtobufMessage<TypeName>;

export { create };

// UnexpectedMessageError is an error used by a message handler when it receives
// a message of a type that it didn't expect.
export class UnexpectedMessageError extends Error {
  constructor(message: string = "unexpected message") {
    super(message);
    this.name = "UnexpectedMessageError";
  }
}

// InvalidMessageError is an error used by a message validation when a message
// has invalid data.
export class InvalidMessageError extends Error {
  constructor(message: string = "invalid message") {
    super(message);
    this.name = "InvalidMessageError";
  }
}

// MessageValidationScope provides context during [Message] validation.
//
// Each message type has a corresponding scope type that
// extends this interface:
//
//   - [CommandValidationScope]
//   - [EventValidationScope]
//   - [DeadlineValidationScope]
export type MessageValidationScope = {
  // isNew() returns true when a handler or [CommandExecutor] is creating a new
  // message, or false when the engine is re-validating a message that it has
  // already accepted.
  //
  // Use the distinction to apply different validation rules for new messages
  // versus existing messages while keeping all validation logic in one
  // location.
  isNew(): boolean;
};

// A Command is a [Message] that instructs an [Application] to perform a specific
// action immediately.
export type Command<TypeName extends string = string> = Message<TypeName>;

// CommandValidationScope provides context during [Command] validation.
//
// The engine provides the implementation to [Command].Validate.
export type CommandValidationScope = MessageValidationScope & {
  // executedAt() returns the time at which the application submitted the
  // command for execution by calling executeCommand() on a [CommandExecutor]
  // or [ProcessScope].
  executedAt(): Date;
};

// An Event is a [Message] that represents an action that an [Application] has
// performed.
//
// Events capture facts about what has happened within the application and serve
// as a permanent record of past activity.
export type Event<TypeName extends string = string> = Message<TypeName>;

// EventValidationScope provides context during [Event] validation.
//
// The engine provides the implementation to [Event].Validate.
export type EventValidationScope = MessageValidationScope & {
  // recordedAt() returns the time at which the event occurred.
  recordedAt(): Date;
};

// A Deadline is a [Message] that notifies an [Application], specifically a
// [ProcessMessageHandler] that some domain-relevant period of time has elapsed.
export type Deadline<TypeName extends string = string> = Message<TypeName>;

// DeadlineValidationScope provides context during [Deadline] validation.
//
// The engine provides the implementation to [Deadline].Validate.
export type DeadlineValidationScope = MessageValidationScope & {
  // scheduledAt() returns the time at which the handler scheduled the deadline.
  scheduledAt(): Date;

  // scheduledFor() returns the time at which the deadline occurs.
  scheduledFor(): Date;
};

export {
  validateMessage,
  describeMessage,
  registerCommand,
  registerEvent,
  registerDeadline,
};
