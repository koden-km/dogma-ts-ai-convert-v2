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
  constructor(message: string = "Unexpected message") {
    super(message);
  }
}

// InvalidMessageError is an error used by a message validation when a message
// has invalid data.
export class InvalidMessageError extends Error {
  constructor(message: string = "Invalid message") {
    super(message);
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
export interface MessageValidationScope {
  // isNew() returns true when a handler or [CommandExecutor] is creating a new
  // message, or false when the engine is re-validating a message that it has
  // already accepted.
  //
  // Use the distinction to apply different validation rules for new messages
  // versus existing messages while keeping all validation logic in one
  // location.
  isNew(): boolean;
}

// A Command is a [Message] that instructs an [Application] to perform a specific
// action immediately.
export type Command = Message & {
  // validate() returns a non-nil error if the message isn't well-formed.
  //
  // A command is well-formed if all required information is present and
  // correctly encoded such that it represents a valid action that the
  // application can perform, if current state permits.
  //
  // The [CommandValidationScope] argument exists for forward-compatibility;
  // the interface is currently empty.
  // validate(s: CommandValidationScope): void;

  // The message type.
  type: "command";
};

// CommandValidationScope provides context during [Command] validation.
//
// The engine provides the implementation to [Command].Validate.
//
// This type exists for forward-compatibility.
export type CommandValidationScope = MessageValidationScope & {
  // executedAt() returns the time at which the application submitted the
  // command for execution by calling ExecuteCommand() on a [CommandExecutor]
  // or [ProcessScope].
  executedAt(): Date;
};

// An Event is a [Message] that represents an action that an [Application] has
// performed.
//
// Events capture facts about what has happened within the application and serve
// as a permanent record of past activity.
export type Event = Message & {
  // validate() returns a non-nil error if the message isn't well-formed.
  //
  // An event is well-formed if all required information is present and
  // correctly encoded such that it accurately represents an action that can
  // occur within the application.
  //
  // Validation requirements may change over time. Use the
  // [EventValidationScope] to access context that may affect the strictness
  // or criteria of the validation logic.
  // validate(s: EventValidationScope): void;

  // The message type.
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
  // validate() returns a non-nil error if the message isn't well-formed.
  //
  // A deadline is well-formed if all required information is present and
  // correctly encoded such that it accurately represents an action that can
  // occur within the process, if current state permits.
  //
  // Validation requirements may change over time. Use the
  // [DeadlineValidationScope] to access context that may affect the strictness
  // or criteria of the validation logic.
  // validate(s: DeadlineValidationScope): void;

  // The message type.
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
//
// Usage, where `DomainCommand` is a union of command types in your domain:
//
// const messageCreators: MessageCreators<DomainCommand> = {
//   [CMD.OpenAccountForNewCustomer]: (type, name, data) => ({ type, name, data })
//   [CMD.CreditAccount]: (type, name, data) => ({ type, name, data })
// };
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
//
// Usage, where `DomainCommand` is a union of command types in your domain:
//
// const messageValidators: MessageValidators<DomainCommand> = {
//   [CMD.OpenAccountForNewCustomer]: ({ data: m }) => {
//     if (m.customerID == "") {
//       throw new Error("OpenAccountForNewCustomer must not have an empty customer ID");
//     }
//   },
//   [CMD.CreditAccount]: ({ data: m }) => {
//     if (m.transactionID == "") {
//       throw new Error("CreditAccount must not have an empty transaction ID");
//     }
//   },
// };
export type MessageValidators<MsgT extends Message> = {
  [K in MsgT["name"]]: (message: Extract<MsgT, { name: K }>) => void;
};

// A type that maps each message name to a describer function that returns a
// string description.
//
// Usage, where `DomainCommand` is a union of command types in your domain:
//
// const messageDescribers: MessageDescribers<DomainCommand> = {
//   [CMD.OpenAccountForNewCustomer]: ({ data: m }) => {
//     return `customer ${m.customerID} ${m.customerName} is opening their first account ${m.accountID} ${m.accountName}`;
//   },
//
//   [CMD.OpenAccount]: ({ data: m }) => {
//     return `opening account ${m.accountID} ${m.accountName} for customer ${m.customerID}`;
//   },
// };
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

export function createMessageValidator<MsgT extends Message>(
  messageValidators: MessageValidators<MsgT>,
) {
  return function validateMessage<K extends MsgT["name"]>(
    msg: Extract<MsgT, { name: K }>,
  ): void {
    // validator() throws an error if the message is invalid.
    const validator = messageValidators[msg.name as K];
    if (validator) {
      type ValidatorFn = (message: Extract<MsgT, { name: K }>) => void;
      (validator as unknown as ValidatorFn)(msg);
    } else {
      throw new Error(`Unhandled message: ${JSON.stringify(msg)}`);
    }
  };
}

export function createMessageDescriber<MsgT extends Message>(
  messageDescribers: MessageDescribers<MsgT>,
) {
  // describeMessage() returns a concise human-readable explanation of the
  // message's meaning for use in contexts such as logging and telemetry.
  //
  // The description should be clear and relevant to developers and
  // non-technical stakeholders familiar with the application's domain. It's
  // not intended for display to end users.
  //
  // Use lowercase sentences with no trailing punctuation. Omit sensitive
  // information and overly specific details that don't alter the message's
  // intent.
  //
  // Descriptions of [Command] messages should use present-continuous tense.
  // For example: "adding 10 widgets to Alex's shopping cart".
  //
  // Descriptions of [Event] messages should use past tense. For example:
  // "added 10 widgets to Alex's shopping cart".
  //
  // Descriptions of [Deadline] messages should read as though the deadline has
  // just been reached. For example: "Alex's cart is now inactive" or "24 hours
  // elapsed since first item added to Alex's cart".
  //
  // Be wary of assuming a specific actor if the message doesn't explicitly
  // encode that information. For example, prefer "Alex's purchase completed"
  // over "Alex completed their purchase". This guidance is especially
  // relevant to [Event] messages, where each type should represent a specific
  // state change regardless of who initiated it.
  return function describeMessage<K extends MsgT["name"]>(
    msg: Extract<MsgT, { name: K }>,
  ): string {
    // describer() returns a human-readable description of the message.
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
// This ensures that for a given message name `K`, the validator and describer
// functions are correctly typed for `Extract<MsgT, { name: K }>`.
type MessageDefinitionTuple<MsgT extends Message, K extends MsgT["name"]> = [
  K,
  (message: Extract<MsgT, { name: K }>) => void,
  (message: Extract<MsgT, { name: K }>) => string,
];

// defineMessages() is a helper function to simplify the creation of
// messageCreators, messageValidators, and messageDescribers for messages. It
// takes an array of message definitions, where each definition is a tuple
// containing the message name, its validator function, and its describer
// function.
export function defineMessages<MsgT extends Message>(
  createMessage: (type: MsgT["type"], name: MsgT["name"], data: any) => MsgT,
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<MsgT, K>;
  }[MsgT["name"]][],
): {
  messageCreators: MessageCreators<MsgT>;
  messageValidators: MessageValidators<MsgT>;
  messageDescribers: MessageDescribers<MsgT>;
} {
  // Create an empty objects for the creators, validators, describers
  const messageCreators = {} as MessageCreators<MsgT>;
  const messageValidators = {} as MessageValidators<MsgT>;
  const messageDescribers = {} as MessageDescribers<MsgT>;

  for (const [name, validator, describer] of definitions) {
    // The `as` casts are necessary due to TypeScript's limitations in inferring
    // precise types when iterating over a union of literal types.
    messageCreators[name] = createMessage as MessageCreators<MsgT>[typeof name];
    messageValidators[name] = validator as MessageValidators<MsgT>[typeof name];
    messageDescribers[name] = describer as MessageDescribers<MsgT>[typeof name];
  }

  return { messageCreators, messageValidators, messageDescribers };
}

// defineCommands() is a specialized helper for defining command messages.
export function defineCommands<MsgT extends Command>(
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<MsgT, K>;
  }[MsgT["name"]][],
) {
  return defineMessages<MsgT>(
    createCommandMessage as any, // Cast needed due to generic complexity
    definitions,
  );
}

// defineEvents() is a specialized helper for defining event messages.
export function defineEvents<MsgT extends Event>(
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<MsgT, K>;
  }[MsgT["name"]][],
) {
  return defineMessages<MsgT>(
    createEventMessage as any, // Cast needed due to generic complexity
    definitions,
  );
}

// defineDeadlines() is a specialized helper for defining deadline messages.
export function defineDeadlines<MsgT extends Deadline>(
  definitions: {
    [K in MsgT["name"]]: MessageDefinitionTuple<MsgT, K>;
  }[MsgT["name"]][],
) {
  return defineMessages<MsgT>(
    createDeadlineMessage as any, // Cast needed due to generic complexity
    definitions,
  );
}
