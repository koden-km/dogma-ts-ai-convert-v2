import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import { parseUUID } from "../uuidpb/uuid.js";
import { identityToString, validateIdentity } from "./identity.js";
import { IdentitySchema } from "./identity_pb.js";

const key = parseUUID("a967a8b9-3f9c-4918-9a41-19577be5fec5");

describe("validateIdentity", () => {
  it("accepts a valid identity", () => {
    const x = create(IdentitySchema, { name: "<name>", key });
    expect(() => validateIdentity(x)).not.toThrow();
  });

  it("accepts a name of exactly 255 bytes", () => {
    const x = create(IdentitySchema, { name: "x".repeat(255), key });
    expect(() => validateIdentity(x)).not.toThrow();
  });

  it.each([
    ["is empty", ""],
    ["is longer than 255 bytes", "x".repeat(256)],
    ["is longer than 255 bytes when encoded as UTF-8", "✓".repeat(86)],
  ])("rejects a name that %s", (_, name) => {
    const x = create(IdentitySchema, { name, key });
    expect(() => validateIdentity(x)).toThrow(
      "invalid name: must be between 1 and 255 bytes",
    );
  });

  it("rejects an identity without a key", () => {
    const x = create(IdentitySchema, { name: "<name>" });
    expect(() => validateIdentity(x)).toThrow(
      "invalid key: UUID must use version 4 or 5",
    );
  });
});

describe("identityToString", () => {
  it("returns the key and name", () => {
    const x = create(IdentitySchema, { name: "<name>", key });
    expect(identityToString(x)).toBe(
      "a967a8b9-3f9c-4918-9a41-19577be5fec5 <name>",
    );
  });

  it("uses a placeholder for an empty name", () => {
    expect(identityToString(create(IdentitySchema))).toBe(
      "00000000-0000-0000-0000-000000000000 ?",
    );
  });
});
