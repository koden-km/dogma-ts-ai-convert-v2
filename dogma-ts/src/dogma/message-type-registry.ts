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

// RegisterCommandOption is an option that modifies the behavior of
// [registerCommand].
//
// This type exists for forward-compatibility.
export type RegisterCommandOption = {
  readonly _futureRegisterCommandOption?: "RegisterCommandOption";
};

// RegisterEventOption is an option that modifies the behavior of
// [registerEvent].
//
// This type exists for forward-compatibility.
export type RegisterEventOption = {
  readonly _futureRegisterEventOption?: "RegisterEventOption";
};

// RegisterDeadlineOption is an option that modifies the behavior of
// [registerDeadline].
//
// This type exists for forward-compatibility.
export type RegisterDeadlineOption = {
  readonly _futureRegisterDeadlineOption?: "RegisterDeadlineOption";
};

// RegisteredMessageType contains information about an implementation of [Command],
// [Event], or [Deadline] that's in Dogma's message registry.
export type RegisteredMessageType = {
  readonly id: string;
  readonly name: string;
  readonly kind: MessageKind;
  readonly validate?: (msg: any, scope?: any) => void;
  readonly describe?: (msg: any) => string;
  idValue(): string;
  create(): Message;
};

type MessageTypes = {
  byID: Map<string, RegisteredMessageType>;
  byName: Map<string, RegisteredMessageType>;
  slice: RegisteredMessageType[];
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

function registerMessageType(
  kind: MessageKind,
  name: string,
  id: string,
  options?: {
    validate?: (msg: any, scope?: any) => void;
    describe?: (msg: any) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType {
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
        return existingByName;
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

  const entry: RegisteredMessageType = {
    id: normalizedID,
    name,
    kind,
    validate: options?.validate,
    describe: options?.describe,
    idValue() {
      return normalizedID;
    },
    create() {
      return {
        type: kind,
        name,
        data: {},
      };
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
  name: T["name"],
  id: string,
  options?: {
    validate?: (msg: T, scope?: CommandValidationScope) => void;
    describe?: (msg: T) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType {
  return registerMessageType("command", name, id, options);
}

// registerEvent adds an [Event] message type to the Dogma message registry,
// making it eligible for use with [handlesEvent] and [recordsEvent].
export function registerEvent<T extends Event = Event>(
  name: T["name"],
  id: string,
  options?: {
    validate?: (msg: T, scope?: EventValidationScope) => void;
    describe?: (msg: T) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType {
  return registerMessageType("event", name, id, options);
}

// registerDeadline adds a [Deadline] message type to the Dogma message
// registry, making it eligible for use with [schedulesDeadline].
export function registerDeadline<T extends Deadline = Deadline>(
  name: T["name"],
  id: string,
  options?: {
    validate?: (msg: T, scope?: DeadlineValidationScope) => void;
    describe?: (msg: T) => string;
    allowIdempotent?: boolean;
  },
): RegisteredMessageType {
  return registerMessageType("deadline", name, id, options);
}

// registeredMessageTypeFor returns the [RegisteredMessageType] for the given
// message name or [RegisteredMessageType], or undefined if not registered.
export function registeredMessageTypeFor(
  nameOrType: string | RegisteredMessageType,
): RegisteredMessageType | undefined {
  if (typeof nameOrType !== "string") {
    return registry.byName.get(nameOrType.name) ?? nameOrType;
  }
  return registry.byName.get(nameOrType);
}

// mustRegisteredMessageTypeFor returns the [RegisteredMessageType] for the given
// message name or throws an error if it isn't in the message type registry.
export function mustRegisteredMessageTypeFor(
  nameOrType: string | RegisteredMessageType,
): RegisteredMessageType {
  const mt = registeredMessageTypeFor(nameOrType);
  if (!mt) {
    const name =
      typeof nameOrType === "string" ? nameOrType : nameOrType.name;
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
  return registry.byName.get(m.name);
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
  const mt = registry.byName.get(m.name);
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
  const mt = registry.byName.get(m.name);
  if (mt?.describe) {
    return mt.describe(m);
  }
  return m.name;
}
