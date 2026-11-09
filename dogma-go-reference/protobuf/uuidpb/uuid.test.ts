import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import {
  deriveUUID,
  generateUUID,
  parseUUID,
  uuidEquals,
  uuidToString,
  validateUUID,
} from "./uuid.js";
import { UUIDSchema } from "./uuid_pb.js";

describe("uuidToString", () => {
  it("returns the RFC 9562 representation", () => {
    const x = create(UUIDSchema, {
      upper: 0xa967a8b93f9c4918n,
      lower: 0x9a4119577be5fec5n,
    });

    expect(uuidToString(x)).toBe("a967a8b9-3f9c-4918-9a41-19577be5fec5");
  });

  it("pads components with leading zeroes", () => {
    const x = create(UUIDSchema, { upper: 0n, lower: 1n });

    expect(uuidToString(x)).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("supports the maximum uint64 values", () => {
    const x = create(UUIDSchema, {
      upper: 0xffffffffffffffffn,
      lower: 0xffffffffffffffffn,
    });

    expect(uuidToString(x)).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
  });
});

describe("parseUUID", () => {
  it("parses the RFC 9562 representation", () => {
    const x = parseUUID("a967a8b9-3f9c-4918-9a41-19577be5fec5");

    expect(x.upper).toBe(0xa967a8b93f9c4918n);
    expect(x.lower).toBe(0x9a4119577be5fec5n);
  });

  it("accepts upper-case hex digits", () => {
    const x = parseUUID("A967A8B9-3F9C-4918-9A41-19577BE5FEC5");

    expect(uuidToString(x)).toBe("a967a8b9-3f9c-4918-9a41-19577be5fec5");
  });

  it.each([
    ["empty", ""],
    ["too short", "a967a8b9-3f9c-4918-9a41-19577be5fec"],
    ["too long", "a967a8b9-3f9c-4918-9a41-19577be5fec5a"],
    ["missing hyphens", "a967a8b93f9c49189a4119577be5fec5"],
    ["misplaced hyphen", "a967a8b-93f9c-4918-9a41-19577be5fec5"],
    ["non-hex digit", "g967a8b9-3f9c-4918-9a41-19577be5fec5"],
  ])("throws if the string is %s", (_, str) => {
    expect(() => parseUUID(str)).toThrow("invalid UUID format");
  });
});

describe("generateUUID", () => {
  it("returns a version 4, RFC 9562 variant UUID", () => {
    const str = uuidToString(generateUUID());

    expect(str).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("returns a different UUID each time", () => {
    const seen = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      seen.add(uuidToString(generateUUID()));
    }

    expect(seen.size).toBe(1000);
  });
});

// The expected values are produced by the Go implementation, uuidpb.Derive().
describe("deriveUUID", () => {
  const ns = parseUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8"); // DNS namespace

  it.each([
    ["one name", ["www.example.com"], "2ed6657d-e927-568b-95e1-2665a8aea6a2"],
    ["several names", ["a", "b"], "7b89eb3e-aca4-5e91-91cb-140511db016d"],
    ["non-ASCII text", ["héllo ✓"], "4a45ac82-d56e-53f4-89dd-028be093a327"],
    [
      "binary data",
      [new Uint8Array([0xff, 0x00, 0x7f])],
      "430f806b-39fb-5ac9-a63f-c86c96041804",
    ],
  ])("derives the same UUID as Go from %s", (_, names, want) => {
    expect(uuidToString(deriveUUID(ns, ...names))).toBe(want);
  });

  it("returns the namespace if there are no names", () => {
    expect(uuidEquals(deriveUUID(ns), ns)).toBe(true);
  });
});

describe("uuidEquals", () => {
  const a = "a967a8b9-3f9c-4918-9a41-19577be5fec5";

  it("returns true for the same UUID", () => {
    expect(uuidEquals(parseUUID(a), parseUUID(a))).toBe(true);
  });

  it.each([
    ["the upper half", "b967a8b9-3f9c-4918-9a41-19577be5fec5"],
    ["the lower half", "a967a8b9-3f9c-4918-9a41-19577be5fec6"],
  ])("returns false if %s differs", (_, b) => {
    expect(uuidEquals(parseUUID(a), parseUUID(b))).toBe(false);
  });
});

describe("validateUUID", () => {
  it.each([
    ["negative upper half", "upper", -(1n << 64n)],
    ["overflowing upper half", "upper", 1n << 64n],
    ["negative lower half", "lower", -(1n << 64n)],
    ["overflowing lower half", "lower", 1n << 64n],
  ] as const)(
    "rejects a %s with otherwise valid version and variant bits",
    (_, half, delta) => {
      const id = parseUUID("a967a8b9-3f9c-4918-9a41-19577be5fec5");
      id[half] += delta;

      expect(() => validateUUID(id)).toThrow(
        "UUID components must be unsigned 64-bit integers",
      );
    },
  );

  it.each([
    [0x0000_0000_0000_4000n, 0x8000_0000_0000_0000n],
    [0xffff_ffff_ffff_5fffn, 0xbfff_ffff_ffff_ffffn],
  ])(
    "accepts valid components at the limits of the supported UUIDs",
    (upper, lower) => {
      const id = parseUUID("a967a8b9-3f9c-4918-9a41-19577be5fec5");
      id.upper = upper;
      id.lower = lower;

      expect(() => validateUUID(id)).not.toThrow();
    },
  );

  it.each([
    ["version 4", "a967a8b9-3f9c-4918-9a41-19577be5fec5"],
    ["version 5", "2ed6657d-e927-568b-95e1-2665a8aea6a2"],
  ])("accepts a %s UUID", (_, str) => {
    expect(() => validateUUID(parseUUID(str))).not.toThrow();
  });

  it.each([
    [
      "the nil UUID",
      "00000000-0000-0000-0000-000000000000",
      "UUID must use version 4 or 5",
    ],
    [
      "a version 7 UUID",
      "01890a5d-ac96-774b-bcce-b302099a8057",
      "UUID must use version 4 or 5",
    ],
    [
      "a non-RFC 9562 variant",
      "a967a8b9-3f9c-4918-da41-19577be5fec5",
      "UUID must use RFC 9562 variant",
    ],
  ])("rejects %s", (_, str, message) => {
    expect(() => validateUUID(parseUUID(str))).toThrow(message);
  });
});
