import crypto from "node:crypto";
import type { Command, Deadline, Event, Message } from "@/dogma/index.ts";
import type { Handler, HandlerType } from "@/enginekit/index.ts";

// Origin describes the handler that produced a message in an envelope.
export type Origin = {
  readonly handler: Handler;
  readonly handlerType: HandlerType;
  readonly instanceID: string;
};

// Envelope is a container for a message that is handled by the test engine.
export type Envelope = {
  readonly messageID: string;
  readonly causationID: string;
  readonly correlationID: string;
  readonly message: Message;
  readonly createdAt: Date;
  readonly scheduledFor?: Date;
  readonly origin?: Origin;
  readonly eventStreamID: string;
  readonly eventStreamOffset: bigint;
  newCommand(id: string, m: Command, t: Date, o: Origin): Envelope;
  newEvent(
    id: string,
    m: Event,
    t: Date,
    o: Origin,
    streamID: string,
    offset: bigint,
  ): Envelope;
  newDeadline(id: string, m: Deadline, t: Date, s: Date, o: Origin): Envelope;
};

export function deriveUUID(namespace: string, name: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${namespace}:${name}`)
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const EVENT_STREAM_NAMESPACE = "8c1f42ee-d693-4e21-837e-54662b1c9ba3";

function makeEnvelope(props: {
  messageID: string;
  causationID: string;
  correlationID: string;
  message: Message;
  createdAt: Date;
  scheduledFor?: Date;
  origin?: Origin;
  eventStreamID?: string;
  eventStreamOffset?: bigint;
}): Envelope {
  return {
    messageID: props.messageID,
    causationID: props.causationID,
    correlationID: props.correlationID,
    message: props.message,
    createdAt: props.createdAt,
    scheduledFor: props.scheduledFor,
    origin: props.origin,
    eventStreamID: props.eventStreamID ?? "",
    eventStreamOffset: props.eventStreamOffset ?? 0n,
    newCommand(id: string, m: Command, t: Date, o: Origin): Envelope {
      return makeEnvelope({
        messageID: id,
        causationID: props.messageID,
        correlationID: props.correlationID,
        message: m,
        createdAt: t,
        origin: o,
      });
    },
    newEvent(
      id: string,
      m: Event,
      t: Date,
      o: Origin,
      streamID: string,
      offset: bigint,
    ): Envelope {
      return makeEnvelope({
        messageID: id,
        causationID: props.messageID,
        correlationID: props.correlationID,
        message: m,
        createdAt: t,
        origin: o,
        eventStreamID: streamID,
        eventStreamOffset: offset,
      });
    },
    newDeadline(
      id: string,
      m: Deadline,
      t: Date,
      s: Date,
      o: Origin,
    ): Envelope {
      return makeEnvelope({
        messageID: id,
        causationID: props.messageID,
        correlationID: props.correlationID,
        message: m,
        createdAt: t,
        scheduledFor: s,
        origin: o,
      });
    },
  };
}

export function newCommandEnvelope(
  id: string,
  m: Command,
  t: Date,
): Envelope {
  if (!id) {
    throw new Error("message ID must not be empty");
  }
  return makeEnvelope({
    messageID: id,
    causationID: id,
    correlationID: id,
    message: m,
    createdAt: t,
  });
}

export function newEventEnvelope(id: string, m: Event, t: Date): Envelope {
  if (!id) {
    throw new Error("message ID must not be empty");
  }
  return makeEnvelope({
    messageID: id,
    causationID: id,
    correlationID: id,
    message: m,
    createdAt: t,
    eventStreamID: deriveUUID(EVENT_STREAM_NAMESPACE, id),
    eventStreamOffset: 0n,
  });
}

export type MessageIDGenerator = {
  next(): string;
  reset(): void;
};

export function createMessageIDGenerator(): MessageIDGenerator {
  let current = 0;
  return {
    next(): string {
      current++;
      return String(current);
    },
    reset(): void {
      current = 0;
    },
  };
}
