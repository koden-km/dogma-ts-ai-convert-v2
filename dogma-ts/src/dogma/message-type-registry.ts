import { create } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";
import type {
  Command,
  CommandValidationScope,
  Deadline,
  DeadlineValidationScope,
  Event,
  EventValidationScope,
  Message,
  MessageValidationScope,
} from "./message.ts";
import { normalizeUUID } from "./uuid.ts";

export type MessageKind = "command" | "event" | "deadline";

// RegisteredMessageType contains information about an implementation of [Command],
// [Event], or [Deadline] that's in Dogma's message registry.
export type RegisteredMessageType<T extends Message = Message> = {
  readonly id: string;
  readonly name: string;
  readonly kind: MessageKind;
  readonly schema?: GenMessage<T>;
  validate?(msg: T, scope?: any): void;
  describe?(msg: T): string;
  create(): T;
};

export type MessageSchemaOrName<T extends Message = Message> =
  | GenMessage<T>
  | T["$typeName"]
  | string;

export type MessageTypeInput<T extends Message = Message> =
  | GenMessage<T>
  | RegisteredMessageType<T>
  | T["$typeName"]
  | string;

type MessageTypes = {
  byID: Map<string, RegisteredMessageType<any>>;
  byName: Map<string, RegisteredMessageType<any>>;
  slice: RegisteredMessageType<any>[];
};

let registry: MessageTypes = {
  byID: new Map(),
  byName: new Map(),
  slice: [],
};

// resetMessageRegistry clears the global message registry (used for testing).
export function resetMessageRegistry(): void {
  registry = {
    byID: new Map(),
    byName: new Map(),
    slice: [],
  };
}

function isGenMessage<T extends Message = Message>(
  v: unknown,
): v is GenMessage<T> {
  return (
    typeof v === "object" &&
    v !== null &&
    "typeName" in v &&
    typeof (v as GenMessage<T>).typeName === "string"
  );
}

function registerMessageType<T extends Message = Message>(
  kind: MessageKind,
  schemaOrName: MessageSchemaOrName<T>,
  id: string,
  options?: {
    validate?: (msg: T, scope?: any) => void;
    describe?: (msg: T) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType<T> {
  const schema = isGenMessage<T>(schemaOrName) ? schemaOrName : undefined;
  const name = schema ? schema.typeName : (schemaOrName as string);

  let normalizedID: string;
  try {
    normalizedID = normalizeUUID(id);
  } catch (err) {
    throw new Error(
      `cannot register ${name}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const existingByName = registry.byName.get(name);
  if (existingByName) {
    if (existingByName.id === normalizedID) {
      if (options?.allowIdempotent) {
        return existingByName as RegisteredMessageType<T>;
      }
      throw new Error(`cannot register ${name}: it is already registered`);
    }
    throw new Error(
      `cannot register ${name}: it is already registered as ${JSON.stringify(existingByName.id)}`,
    );
  }

  const existingByID = registry.byID.get(normalizedID);
  if (existingByID) {
    throw new Error(
      `cannot register ${name}: ${JSON.stringify(normalizedID)} is already associated with ${existingByID.name}`,
    );
  }

  const entry: RegisteredMessageType<T> = {
    id: normalizedID,
    name,
    kind,
    schema,
    validate: options?.validate,
    describe: options?.describe,
    create(): T {
      if (schema) {
        return create(schema);
      }
      return {
        $typeName: name,
      } as T;
    },
  };

  registry.byID.set(normalizedID, entry);
  registry.byName.set(name, entry);
  registry.slice.push(entry);

  return entry;
}

// registerCommand adds a [Command] message type to the Dogma message registry,
// making it eligible for use with [handlesCommand] and [executesCommand].
export function registerCommand<T extends Command = Command>(
  schemaOrName: MessageSchemaOrName<T>,
  id: string,
  options?: {
    validate?: (msg: T, scope?: CommandValidationScope) => void;
    describe?: (msg: T) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType<T> {
  return registerMessageType("command", schemaOrName, id, options);
}

// registerEvent adds an [Event] message type to the Dogma message registry,
// making it eligible for use with [handlesEvent] and [recordsEvent].
export function registerEvent<T extends Event = Event>(
  schemaOrName: MessageSchemaOrName<T>,
  id: string,
  options?: {
    validate?: (msg: T, scope?: EventValidationScope) => void;
    describe?: (msg: T) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType<T> {
  return registerMessageType("event", schemaOrName, id, options);
}

// registerDeadline adds a [Deadline] message type to the Dogma message
// registry, making it eligible for use with [schedulesDeadline].
export function registerDeadline<T extends Deadline = Deadline>(
  schemaOrName: MessageSchemaOrName<T>,
  id: string,
  options?: {
    validate?: (msg: T, scope?: DeadlineValidationScope) => void;
    describe?: (msg: T) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType<T> {
  return registerMessageType("deadline", schemaOrName, id, options);
}

// registeredMessageTypeFor returns the [RegisteredMessageType] for the given
// message schema, name, or [RegisteredMessageType], or undefined if not registered.
export function registeredMessageTypeFor<T extends Message = Message>(
  nameOrType: MessageTypeInput<T>,
): RegisteredMessageType<T> | undefined {
  if (typeof nameOrType === "string") {
    return registry.byName.get(nameOrType) as
      | RegisteredMessageType<T>
      | undefined;
  }
  if (isGenMessage<T>(nameOrType)) {
    return registry.byName.get(nameOrType.typeName) as
      | RegisteredMessageType<T>
      | undefined;
  }
  return (registry.byName.get(nameOrType.name) ??
    nameOrType) as RegisteredMessageType<T>;
}

// mustRegisteredMessageTypeFor returns the [RegisteredMessageType] for the given
// message schema, name, or [RegisteredMessageType], or throws an error if it
// isn't in the message type registry.
export function mustRegisteredMessageTypeFor<T extends Message = Message>(
  nameOrType: MessageTypeInput<T>,
): RegisteredMessageType<T> {
  const mt = registeredMessageTypeFor(nameOrType);
  if (!mt) {
    const name =
      typeof nameOrType === "string"
        ? nameOrType
        : isGenMessage(nameOrType)
          ? nameOrType.typeName
          : nameOrType.name;
    throw new Error(`${name} is not in the message type registry`);
  }
  return mt;
}

// registeredMessageTypeOf returns the [RegisteredMessageType] for the given
// message instance, or undefined if not registered.
export function registeredMessageTypeOf(
  m: Message | null | undefined,
): RegisteredMessageType | undefined {
  if (!m) {
    throw new Error("message cannot be null or undefined");
  }
  return registry.byName.get(m.$typeName);
}

// registeredMessageTypeByID returns the [RegisteredMessageType] with the given
// ID, or undefined if there is no such message type in the registry.
export function registeredMessageTypeByID(
  id: string,
): RegisteredMessageType | undefined {
  const normalized = normalizeUUID(id);
  return registry.byID.get(normalized);
}

// registeredMessageTypes returns an iterable of all [RegisteredMessageType]s
// in the Dogma message registry.
export function* registeredMessageTypes(): IterableIterator<RegisteredMessageType> {
  const snapshot = [...registry.slice];
  for (const mt of snapshot) {
    yield mt;
  }
}

// validateMessage validates a message using either its own `validate` method or
// the validator registered in the message type registry.
export function validateMessage(
  m: Message,
  scope?: MessageValidationScope,
): void {
  const anyMsg = m as any;
  if (typeof anyMsg.validate === "function") {
    anyMsg.validate(scope);
    return;
  }
  const mt = registry.byName.get(m.$typeName);
  if (mt?.validate) {
    mt.validate(m, scope);
  }
}

// describeMessage returns the human-readable description of a message using
// either its `messageDescription` method or the describer registered in the
// message type registry.
export function describeMessage(m: Message): string {
  const anyMsg = m as any;
  if (typeof anyMsg.messageDescription === "function") {
    return anyMsg.messageDescription();
  }
  const mt = registry.byName.get(m.$typeName);
  if (mt?.describe) {
    return mt.describe(m);
  }
  return m.$typeName;
}
