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
// Each message type implements either [Command], [Event], or [Deadline].
export type Message = {
  // The message type.
  readonly type: "command" | "event" | "deadline";

  // The message name.
  readonly name: string;

  // The message data, if any.
  readonly data?: object;
};

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
export type Command = Message & {
  type: "command";
};

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
export type Event = Message & {
  type: "event";
};

// EventValidationScope provides context during [Event] validation.
//
// The engine provides the implementation to [Event].Validate.
export type EventValidationScope = MessageValidationScope & {
  // recordedAt() returns the time at which the event occurred.
  recordedAt(): Date;
};

// A Deadline is a [Message] that notifies an [Application], specifically a
// [ProcessMessageHandler] that some domain-relevant period of time has elapsed.
export type Deadline = Message & {
  type: "deadline";
};

// DeadlineValidationScope provides context during [Deadline] validation.
//
// The engine provides the implementation to [Deadline].Validate.
export type DeadlineValidationScope = MessageValidationScope & {
  // scheduledAt() returns the time at which the handler scheduled the deadline.
  scheduledAt(): Date;

  // scheduledFor() returns the time at which the deadline occurs.
  scheduledFor(): Date;
};

// A type that maps each message name to a creator function that enforces the
// structure of the message type.
export type MessageCreators<MsgT extends Message> = {
  [K in MsgT["name"]]: (
    type: MsgT["type"],
    name: K,
    ...args: undefined extends Extract<MsgT, { name: K }>["data"]
      ? [data?: Extract<MsgT, { name: K }>["data"]]
      : [data: Extract<MsgT, { name: K }>["data"]]
  ) => Extract<MsgT, { name: K }>;
};

/**
 * createCommandMessage is a generic creator function for command messages.
 * It simplifies creating `messageCreators` objects by avoiding repetition.
 */
export const createCommandMessage = <N, D>(
  type: "command",
  name: N,
  data: D,
) => ({ type, name, data });

/**
 * createEventMessage is a generic creator function for event messages.
 * It simplifies creating `messageCreators` objects by avoiding repetition.
 */
export const createEventMessage = <N, D>(type: "event", name: N, data: D) => ({
  type,
  name,
  data,
});

/**
 * createDeadlineMessage is a generic creator function for deadline messages.
 * It simplifies creating `messageCreators` objects by avoiding repetition.
 */
export const createDeadlineMessage = <N, D>(
  type: "deadline",
  name: N,
  data: D,
) => ({ type, name, data });

// A type that maps each message name to a validator function that throws if
// there is a validation error.
export type MessageValidators<
  MsgT extends Message,
  ScopeT extends MessageValidationScope = MessageValidationScope,
> = {
  [K in MsgT["name"]]: (
    message: Extract<MsgT, { name: K }>,
    scope?: ScopeT,
  ) => void;
};

// A type that maps each message name to a describer function that returns a
// string description.
export type MessageDescribers<MsgT extends Message> = {
  [K in MsgT["name"]]: (message: Extract<MsgT, { name: K }>) => string;
};

export function createMessageCreator<MsgT extends Message>(
  messageCreators: MessageCreators<MsgT>,
  messageType: MsgT["type"],
) {
  return function createMessage<K extends MsgT["name"]>(
    name: K,
    ...args: undefined extends Extract<MsgT, { name: K }>["data"]
      ? [data?: Extract<MsgT, { name: K }>["data"]]
      : [data: Extract<MsgT, { name: K }>["data"]]
  ): Extract<MsgT, { name: K }> {
    const creator = messageCreators[name];
    if (creator) {
      type CreatorFn = (
        type: MsgT["type"],
        name: K,
        data?: Extract<MsgT, { name: K }>["data"],
      ) => Extract<MsgT, { name: K }>;
      return (creator as unknown as CreatorFn)(messageType, name, args[0]);
    } else {
      throw new Error(`Unhandled message: ${JSON.stringify(name)}`);
    }
  };
}

export function createMessageValidator<
  MsgT extends Message,
  ScopeT extends MessageValidationScope = MessageValidationScope,
>(messageValidators: MessageValidators<MsgT, ScopeT>) {
  return function validate<K extends MsgT["name"]>(
    msg: Extract<MsgT, { name: K }>,
    scope?: ScopeT,
  ): void {
    const validator = messageValidators[msg.name as K];
    if (validator) {
      type ValidatorFn = (
        message: Extract<MsgT, { name: K }>,
        scope?: ScopeT,
      ) => void;
      (validator as unknown as ValidatorFn)(msg, scope);
    } else {
      throw new Error(`Unhandled message: ${JSON.stringify(msg)}`);
    }
  };
}

export function createMessageDescriber<MsgT extends Message>(
  messageDescribers: MessageDescribers<MsgT>,
) {
  return function describe<K extends MsgT["name"]>(
    msg: Extract<MsgT, { name: K }>,
  ): string {
    const describer = messageDescribers[msg.name as K];
    if (describer) {
      type DescriberFn = (message: Extract<MsgT, { name: K }>) => string;
      return (describer as unknown as DescriberFn)(msg);
    } else {
      throw new Error(`Unhandled message: ${JSON.stringify(msg)}`);
    }
  };
}

// Type for a single message definition entry in the array.
// Supports both 4-tuple [name, id, validator, describer] (recommended, registers UUID)
// and 3-tuple [name, validator, describer].
export type MessageDefinitionTuple<
  MsgT extends Message,
  K extends MsgT["name"],
  ScopeT extends MessageValidationScope = MessageValidationScope,
> =
  | [
      K,
      string,
      (message: Extract<MsgT, { name: K }>, scope?: ScopeT) => void,
      (message: Extract<MsgT, { name: K }>) => string,
    ]
  | [
      K,
      (message: Extract<MsgT, { name: K }>, scope?: ScopeT) => void,
      (message: Extract<MsgT, { name: K }>) => string,
    ];

export function defineMessages<
  MsgT extends Message,
  ScopeT extends MessageValidationScope = MessageValidationScope,
>(
  kind: MsgT["type"],
  createMessage: (type: MsgT["type"], name: MsgT["name"], data: any) => MsgT,
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<MsgT, K, ScopeT>;
  }[MsgT["name"]][],
): {
  messageCreators: MessageCreators<MsgT>;
  messageValidators: MessageValidators<MsgT, ScopeT>;
  messageDescribers: MessageDescribers<MsgT>;
} {
  const messageCreators = {} as MessageCreators<MsgT>;
  const messageValidators = {} as MessageValidators<MsgT, ScopeT>;
  const messageDescribers = {} as MessageDescribers<MsgT>;

  for (const def of definitions) {
    let name: MsgT["name"];
    let id: string | undefined;
    let validator: any;
    let describer: any;

    if (def.length === 4) {
      [name, id, validator, describer] = def;
    } else {
      [name, validator, describer] = def;
    }

    messageCreators[name] = createMessage as MessageCreators<MsgT>[typeof name];
    messageValidators[name] = validator as MessageValidators<
      MsgT,
      ScopeT
    >[typeof name];
    messageDescribers[name] = describer as MessageDescribers<MsgT>[typeof name];

    if (id !== undefined) {
      if (kind === "command") {
        registerCommand(name, id, {
          validate: validator,
          describe: describer,
          allowIdempotent: true,
        });
      } else if (kind === "event") {
        registerEvent(name, id, {
          validate: validator,
          describe: describer,
          allowIdempotent: true,
        });
      } else if (kind === "deadline") {
        registerDeadline(name, id, {
          validate: validator,
          describe: describer,
          allowIdempotent: true,
        });
      }
    }
  }

  return { messageCreators, messageValidators, messageDescribers };
}

// defineCommands() is a specialized helper for defining command messages.
export function defineCommands<MsgT extends Command>(
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<
      MsgT,
      K,
      CommandValidationScope
    >;
  }[MsgT["name"]][],
) {
  return defineMessages<MsgT, CommandValidationScope>(
    "command",
    createCommandMessage as any,
    definitions,
  );
}

// defineEvents() is a specialized helper for defining event messages.
export function defineEvents<MsgT extends Event>(
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<MsgT, K, EventValidationScope>;
  }[MsgT["name"]][],
) {
  return defineMessages<MsgT, EventValidationScope>(
    "event",
    createEventMessage as any,
    definitions,
  );
}

// defineDeadlines() is a specialized helper for defining deadline messages.
export function defineDeadlines<MsgT extends Deadline>(
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<
      MsgT,
      K,
      DeadlineValidationScope
    >;
  }[MsgT["name"]][],
) {
  return defineMessages<MsgT, DeadlineValidationScope>(
    "deadline",
    createDeadlineMessage as any,
    definitions,
  );
}

export { validateMessage, describeMessage };
