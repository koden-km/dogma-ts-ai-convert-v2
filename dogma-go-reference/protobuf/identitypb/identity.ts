import { create } from "@bufbuild/protobuf";
import { UUIDSchema } from "../uuidpb/uuid_pb.js";
import { uuidToString, validateUUID } from "../uuidpb/uuid.js";
import type { Identity } from "./identity_pb.js";

/**
 * Throws an error if x is invalid.
 *
 * The name must be between 1 and 255 bytes when encoded as UTF-8, and the key
 * must be a valid version 4 or 5 UUID.
 */
export function validateIdentity(x: Identity): void {
  const size = new TextEncoder().encode(x.name).length;
  if (size === 0 || size > 255) {
    throw new Error("invalid name: must be between 1 and 255 bytes");
  }

  try {
    validateUUID(x.key ?? create(UUIDSchema));
  } catch (cause) {
    throw new Error(`invalid key: ${(cause as Error).message}`, { cause });
  }
}

/**
 * Returns a human-readable representation of an identity, in the form
 * "<key> <name>".
 */
export function identityToString(x: Identity): string {
  return `${uuidToString(x.key ?? create(UUIDSchema))} ${x.name || "?"}`;
}
