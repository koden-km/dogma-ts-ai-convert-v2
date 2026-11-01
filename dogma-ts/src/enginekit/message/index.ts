import {
  type Message,
  registeredMessageTypeFor,
  registeredMessageTypeOf,
  type RegisteredMessageType,
} from "@/dogma/index.ts";

// Kind is an enumeration of the different kinds of messages.
export type Kind =
  | typeof CommandKind
  | typeof EventKind
  | typeof DeadlineKind;

export const CommandKind = "command" as const;
export const EventKind = "event" as const;
export const DeadlineKind = "deadline" as const;

export function kinds(): Kind[] {
  return [CommandKind, EventKind, DeadlineKind];
}

export function kindSymbol(k: Kind): string {
  return mapByKind(k, "?", "!", "@");
}

export function mapByKind<T>(
  k: Kind,
  command: T,
  event: T,
  deadline: T,
): T {
  switch (k) {
    case CommandKind:
      return command;
    case EventKind:
      return event;
    case DeadlineKind:
      return deadline;
    default:
      throw new Error(`unexpected message kind: ${String(k)}`);
  }
}

export function switchByKind(
  k: Kind,
  command?: () => void,
  event?: () => void,
  deadline?: () => void,
): void {
  switch (k) {
    case CommandKind:
      if (!command) throw new Error("no case function for command");
      command();
      break;
    case EventKind:
      if (!event) throw new Error("no case function for event");
      event();
      break;
    case DeadlineKind:
      if (!deadline) throw new Error("no case function for deadline");
      deadline();
      break;
    default:
      throw new Error(`unexpected message kind: ${String(k)}`);
  }
}

export function kindOf(m: Message): Kind {
  if (!m || typeof m !== "object") {
    throw new Error("message cannot be null or undefined");
  }
  switch (m.type) {
    case "command":
      return CommandKind;
    case "event":
      return EventKind;
    case "deadline":
      return DeadlineKind;
    default:
      throw new Error(
        `${JSON.stringify(m)} does not implement Command, Event or Deadline`,
      );
  }
}

export type Name = string;

export function nameOf(m: Message): Name {
  kindOf(m);
  return m.name;
}

// Type represents a Dogma message type.
export type Type = {
  readonly name: Name;
  readonly kind: Kind;
  readonly id?: string;
  nameValue(): Name;
  kindValue(): Kind;
  toString(): string;
};

const typeCache = new Map<string, Type>();

function getOrCreateType(name: string, kind: Kind, id?: string): Type {
  const key = `${kind}:${name}`;
  const existing = typeCache.get(key);
  if (existing && (existing.id === id || !id)) {
    return existing;
  }
  const t: Type = {
    name,
    kind,
    id,
    nameValue() {
      return name;
    },
    kindValue() {
      return kind;
    },
    toString() {
      return name;
    },
  };
  typeCache.set(key, t);
  return t;
}

export function typeFromRegistered(mt: RegisteredMessageType): Type {
  return getOrCreateType(mt.name, mt.kind, mt.id);
}

export function typeFor(
  nameOrType: string | RegisteredMessageType | Type,
  fallbackKind?: Kind,
): Type {
  if (typeof nameOrType === "object" && "kindValue" in nameOrType) {
    return nameOrType;
  }
  if (typeof nameOrType === "object") {
    return typeFromRegistered(nameOrType);
  }
  const reg = registeredMessageTypeFor(nameOrType);
  if (reg) {
    return typeFromRegistered(reg);
  }
  if (fallbackKind) {
    return getOrCreateType(nameOrType, fallbackKind);
  }
  throw new Error(`${nameOrType} is not in the message type registry`);
}

export function typeOf(m: Message): Type {
  const k = kindOf(m);
  const reg = registeredMessageTypeOf(m);
  if (reg) {
    return typeFromRegistered(reg);
  }
  return getOrCreateType(m.name, k);
}
