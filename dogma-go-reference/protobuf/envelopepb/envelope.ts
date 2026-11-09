import { create, createRegistry, equals } from "@bufbuild/protobuf";
import type { Any, Timestamp } from "@bufbuild/protobuf/wkt";
import { IdentitySchema, type Identity } from "../identitypb/identity_pb.js";
import { identityToString, validateIdentity } from "../identitypb/identity.js";
import { UUIDSchema, type UUID } from "../uuidpb/uuid_pb.js";
import { uuidToString, validateUUID } from "../uuidpb/uuid.js";
import {
  EnvelopeSchema,
  HeaderSchema,
  MultiEnvelopeSchema,
  type Body,
  type Envelope,
  type Header,
  type Message,
  type MultiEnvelope,
  type Source,
} from "./envelope_pb.js";

/**
 * Returns each message in a {@link MultiEnvelope} as a standalone
 * {@link Envelope}.
 *
 * The returned envelopes share the multi-envelope's header.
 */
export function expandMultiEnvelope(x: MultiEnvelope): Envelope[] {
  return x.bodies.map((body) =>
    create(EnvelopeSchema, { header: x.header, body }),
  );
}

/**
 * Returns a {@link MultiEnvelope} that contains the same header and body as
 * env.
 *
 * The multi-envelope shares the envelope's header and body.
 *
 * @throws {Error} If env has no body.
 */
export function asMultiEnvelope(env: Envelope): MultiEnvelope {
  if (!env.body) {
    throw new Error("envelope must have a body");
  }

  return create(MultiEnvelopeSchema, {
    header: env.header,
    bodies: [env.body],
  });
}

/**
 * Appends the body of env to x if they have equivalent headers.
 *
 * It returns false, and does not modify x, if the headers differ.
 *
 * @throws {Error} If env has no body.
 */
export function tryAppendEnvelope(x: MultiEnvelope, env: Envelope): boolean {
  if (!env.body) {
    throw new Error("envelope must have a body");
  }

  const a = x.header;
  const b = env.header;
  const same = a && b ? headersEqual(a, b) : a === b;

  if (!same) {
    return false;
  }

  x.bodies.push(env.body);

  return true;
}

/**
 * Throws an error if env is not well-formed.
 *
 * Well-formedness means that all compulsory fields are populated and that no
 * incompatible fields are populated. It is intentionally fairly permissive, so
 * that message metadata can be obtained even if the message is unable to be
 * handled.
 *
 * It does not perform "deep" validation, such as ensuring that the message
 * data can be decoded.
 */
export function validateEnvelope(env: Envelope): void {
  check("invalid header", () => validateHeader(env.header));
  check("invalid body", () => validateBody(env.body, env.header));
}

/**
 * Throws an error if x is not well-formed.
 *
 * See {@link validateEnvelope} for what well-formedness means.
 */
export function validateMultiEnvelope(x: MultiEnvelope): void {
  check("invalid header", () => validateHeader(x.header));

  x.bodies.forEach((body, i) =>
    check(`invalid body at index ${i}`, () => validateBody(body, x.header)),
  );
}

/**
 * Throws an error if x is not well-formed.
 *
 * See {@link validateEnvelope} for what well-formedness means.
 */
export function validateHeader(x: Header | undefined): void {
  if (!x) {
    throw new Error("must be set");
  }

  checkUUID("invalid causation ID", x.causationId);
  checkUUID("invalid correlation ID", x.correlationId);
  check("invalid source", () => validateSource(x.source));
  validateAnyValues("extensions", x.extensions);
  validateAnyValues("baggage", x.baggage);
}

function validateSource(x: Source | undefined): void {
  if (!x) {
    throw new Error("must be set");
  }

  if (x.site) {
    checkIdentity("invalid site", x.site);
  }

  checkIdentity("invalid application", x.application);

  if (x.handler) {
    checkIdentity("invalid handler", x.handler);
  } else if (x.instanceId !== "") {
    throw new Error(
      "invalid instance ID: must not be specified without a handler",
    );
  }
}

/**
 * Throws an error if x is not well-formed.
 *
 * header is the header of the envelope that contains x. It is needed because a
 * body may only have a scheduled-for time if the header's source has a handler
 * and instance ID. It is not itself validated.
 *
 * See {@link validateEnvelope} for what well-formedness means.
 */
export function validateBody(
  x: Body | undefined,
  header: Header | undefined,
): void {
  if (!x) {
    throw new Error("must be set");
  }

  checkUUID("invalid message ID", x.messageId);
  check("invalid created-at time", () => validateTimestamp(x.createdAt));

  if (x.scheduledFor) {
    check("invalid scheduled-for time", () =>
      validateTimestamp(x.scheduledFor),
    );

    const source = header?.source;
    if (!source?.handler || source.instanceId === "") {
      throw new Error(
        "invalid scheduled-for time: must not be specified without a source handler and instance ID",
      );
    }
  }

  check("invalid message", () => validateMessage(x.message));
  validateAnyValues("extensions", x.extensions);
  validateAnyValues("baggage", x.baggage);
}

/**
 * Throws an error if x is not well-formed.
 *
 * See {@link validateEnvelope} for what well-formedness means.
 */
export function validateMessage(x: Message | undefined): void {
  if (!x) {
    throw new Error("must be set");
  }

  checkUUID("invalid type ID", x.typeId);

  if (x.description === "") {
    throw new Error("invalid description: must not be empty");
  }

  // Note, x.data may be empty. A specific application's marshaling logic could
  // conceivably have a message with no data where the message type is
  // sufficient information.
}

// The range of valid google.protobuf.Timestamp values, from
// 0001-01-01T00:00:00Z to 9999-12-31T23:59:59.999999999Z.
const MIN_SECONDS = -62135596800n;
const MAX_SECONDS = 253402300799n;

function validateTimestamp(x: Timestamp | undefined): void {
  if (!x) {
    throw new Error("must be set");
  }

  if (x.seconds < MIN_SECONDS || x.seconds > MAX_SECONDS) {
    throw new Error("must be between 0001-01-01 and 9999-12-31");
  }

  if (x.nanos < 0 || x.nanos > 999_999_999) {
    throw new Error("nanos must be between 0 and 999,999,999");
  }
}

function validateAnyValues(name: string, values: Any[]): void {
  values.forEach((v, i) => {
    if (v.typeUrl === "") {
      throw new Error(
        `invalid ${name} at index ${i}: type URL must not be empty`,
      );
    }
  });
}

function checkUUID(prefix: string, x: UUID | undefined): void {
  const id = x ?? create(UUIDSchema);

  try {
    validateUUID(id);
  } catch (cause) {
    throw new Error(
      `${prefix} (${uuidToString(id)}): ${(cause as Error).message}`,
      { cause },
    );
  }
}

function checkIdentity(prefix: string, x: Identity | undefined): void {
  const id = x ?? create(IdentitySchema);

  try {
    validateIdentity(id);
  } catch (cause) {
    throw new Error(
      `${prefix} (${identityToString(id)}): ${(cause as Error).message}`,
      { cause },
    );
  }
}

// check calls fn, and prefixes the message of any error it throws.
function check(prefix: string, fn: () => void): void {
  try {
    fn();
  } catch (cause) {
    throw new Error(`${prefix}: ${(cause as Error).message}`, { cause });
  }
}

// headersEqual returns true if a and b are equivalent, including any unknown
// fields, as Go's proto.Equal() does. The equals() function from protobuf-es
// ignores unknown fields unless the "unknown" option is set.
//
// Unlike proto.Equal(), it compares unknown fields in the order they were
// decoded, rather than grouped by field number, so headers whose unknown fields
// arrived in a different order are not equal.
//
// The "unknown" option is marked as experimental by protobuf-es, so it may
// change in a later release. A test covers it, so that such a change is
// noticed.
function headersEqual(a: Header, b: Header): boolean {
  return equals(HeaderSchema, a, b, { registry: REGISTRY, unknown: true });
}

// REGISTRY is the registry passed to equals(). It's empty because Header has no
// extensions, so every unknown field is genuinely unknown.
const REGISTRY = createRegistry();
