import { create } from "@bufbuild/protobuf";
import { createHash, randomBytes } from "node:crypto";
import { UUIDSchema, type UUID } from "./uuid_pb.js";

/**
 * Returns a new randomly generated (version 4) UUID.
 */
export function generateUUID(): UUID {
  const data = randomBytes(16);

  data[6] = (data[6] & 0x0f) | 0x40; // version 4
  data[8] = (data[8] & 0x3f) | 0x80; // variant is 10 (RFC 9562)

  return fromBytes(data);
}

/**
 * Returns a new SHA-1 derived (version 5) UUID from the given namespace and
 * names.
 *
 * Each name is hashed in turn, with the result of the previous name used as
 * the namespace for the next. If no names are given, the namespace itself is
 * returned.
 */
export function deriveUUID(
  namespace: UUID,
  ...names: (string | Uint8Array)[]
): UUID {
  let data = toBytes(namespace);

  for (const name of names) {
    data = createHash("sha1")
      .update(data)
      .update(name)
      .digest()
      .subarray(0, 16);

    data[6] = (data[6] & 0x0f) | 0x50; // version 5
    data[8] = (data[8] & 0x3f) | 0x80; // variant is 10 (RFC 9562)
  }

  return fromBytes(data);
}

/**
 * Returns true if a and b are the same UUID.
 */
export function uuidEquals(a: UUID, b: UUID): boolean {
  return a.upper === b.upper && a.lower === b.lower;
}

/**
 * Throws an error if x is not a valid version 4 (random) or version 5
 * (name-based) UUID.
 */
export function validateUUID(x: UUID): void {
  if (
    x.upper < 0n ||
    x.upper > MAX_UINT64 ||
    x.lower < 0n ||
    x.lower > MAX_UINT64
  ) {
    throw new Error("UUID components must be unsigned 64-bit integers");
  }

  const version = (x.upper >> 8n) & 0xf0n;
  if (version !== 0x40n && version !== 0x50n) {
    throw new Error("UUID must use version 4 or 5");
  }

  const variant = (x.lower >> 56n) & 0xc0n;
  if (variant !== 0x80n) {
    throw new Error("UUID must use RFC 9562 variant");
  }
}

/**
 * Returns the RFC 9562 "hex-and-dash" string representation of a UUID.
 */
export function uuidToString(x: UUID): string {
  const hex =
    x.upper.toString(16).padStart(16, "0") +
    x.lower.toString(16).padStart(16, "0");

  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20)
  );
}

/**
 * Parses an RFC 9562 "hex-and-dash" UUID string.
 *
 * @throws {Error} If the string is not a valid UUID.
 */
export function parseUUID(str: string): UUID {
  if (!PATTERN.test(str)) {
    throw new Error(`invalid UUID format: ${JSON.stringify(str)}`);
  }

  const hex = str.replaceAll("-", "");

  return create(UUIDSchema, {
    upper: BigInt("0x" + hex.slice(0, 16)),
    lower: BigInt("0x" + hex.slice(16)),
  });
}

const MAX_UINT64 = 0xffff_ffff_ffff_ffffn;

const PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// toBytes returns the 16-byte big-endian representation of a UUID.
function toBytes(x: UUID): Uint8Array {
  const data = new Uint8Array(16);
  const view = new DataView(data.buffer);

  view.setBigUint64(0, x.upper);
  view.setBigUint64(8, x.lower);

  return data;
}

// fromBytes returns the UUID represented by the first 16 bytes of data.
function fromBytes(data: Uint8Array): UUID {
  const view = new DataView(data.buffer, data.byteOffset, 16);

  return create(UUIDSchema, {
    upper: view.getBigUint64(0),
    lower: view.getBigUint64(8),
  });
}
