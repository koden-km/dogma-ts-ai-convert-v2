import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { anyPack, anyUnpack, StringValueSchema } from "@bufbuild/protobuf/wkt";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tryGetBaggage, setBaggage } from "./baggage.js";
import {
  asMultiEnvelope,
  expandMultiEnvelope,
  tryAppendEnvelope,
} from "./envelope.js";
import {
  BodySchema,
  EnvelopeSchema,
  HeaderSchema,
  MultiEnvelopeSchema,
} from "./envelope_pb.js";
import { tryGetExtension, setExtension } from "./extensions.js";
import { EventStreamPositionSchema } from "./extensions_pb.js";

describe("expandMultiEnvelope", () => {
  it("returns an envelope for each body", () => {
    const header = create(HeaderSchema, {});
    const a = create(BodySchema, { idempotencyKey: "a" });
    const b = create(BodySchema, { idempotencyKey: "b" });

    const envelopes = expandMultiEnvelope(
      create(MultiEnvelopeSchema, { header, bodies: [a, b] }),
    );

    expect(envelopes).toHaveLength(2);
    expect(envelopes[0].header).toBe(header);
    expect(envelopes[0].body).toBe(a);
    expect(envelopes[1].header).toBe(header);
    expect(envelopes[1].body).toBe(b);
  });

  it("returns an empty array if there are no bodies", () => {
    const envelopes = expandMultiEnvelope(create(MultiEnvelopeSchema, {}));

    expect(envelopes).toEqual([]);
  });
});

describe("asMultiEnvelope", () => {
  it("returns a multi-envelope with the envelope's header and body", () => {
    const header = create(HeaderSchema, {});
    const body = create(BodySchema, {});

    const multi = asMultiEnvelope(create(EnvelopeSchema, { header, body }));

    expect(multi.header).toBe(header);
    expect(multi.bodies).toEqual([body]);
  });

  it("throws if the envelope has no body", () => {
    expect(() => asMultiEnvelope(create(EnvelopeSchema, {}))).toThrow(
      "envelope must have a body",
    );
  });
});

describe("tryAppendEnvelope", () => {
  it("appends the body if the headers are equivalent", () => {
    const multi = create(MultiEnvelopeSchema, {
      header: { correlationId: { upper: 1n, lower: 2n } },
      bodies: [create(BodySchema, { idempotencyKey: "a" })],
    });
    const body = create(BodySchema, { idempotencyKey: "b" });
    const env = create(EnvelopeSchema, {
      header: { correlationId: { upper: 1n, lower: 2n } },
      body,
    });

    expect(tryAppendEnvelope(multi, env)).toBe(true);
    expect(multi.bodies).toHaveLength(2);
    expect(multi.bodies[1]).toBe(body);
  });

  it("throws if the envelope has no body", () => {
    const multi = create(MultiEnvelopeSchema, {});
    const env = create(EnvelopeSchema, {});

    expect(() => tryAppendEnvelope(multi, env)).toThrow(
      "envelope must have a body",
    );
    expect(multi.bodies).toEqual([]);
  });

  it("returns false if the headers differ only in unknown fields", () => {
    const header = create(HeaderSchema, {
      correlationId: { upper: 1n, lower: 2n },
    });

    // Field 99 is unknown to this schema. Encoded as varint 1, its tag is
    // (99 << 3) | 0 = 792, which is 0x98 0x06.
    const bytes = toBinary(HeaderSchema, header);
    const withUnknown = fromBinary(
      HeaderSchema,
      new Uint8Array([...bytes, 0x98, 0x06, 0x01]),
    );

    const multi = create(MultiEnvelopeSchema, { header });
    const env = create(EnvelopeSchema, { header: withUnknown, body: {} });

    expect(tryAppendEnvelope(multi, env)).toBe(false);
    expect(multi.bodies).toEqual([]);
  });

  it("does not throw if a header contains values that can't be encoded", () => {
    // -1 is outside the range of a uint64, so encoding it would fail.
    const header = () =>
      create(HeaderSchema, { correlationId: { upper: -1n, lower: 2n } });

    const multi = create(MultiEnvelopeSchema, { header: header() });
    const env = create(EnvelopeSchema, { header: header(), body: {} });

    expect(tryAppendEnvelope(multi, env)).toBe(true);
    expect(multi.bodies).toHaveLength(1);
  });

  it("returns false without modifying the multi-envelope if the headers differ", () => {
    const multi = create(MultiEnvelopeSchema, {
      header: { correlationId: { upper: 1n, lower: 2n } },
    });
    const env = create(EnvelopeSchema, {
      header: { correlationId: { upper: 1n, lower: 3n } },
      body: {},
    });

    expect(tryAppendEnvelope(multi, env)).toBe(false);
    expect(multi.bodies).toEqual([]);
  });
});

describe.each([
  ["setExtension", setExtension, "extensions"] as const,
  ["setBaggage", setBaggage, "baggage"] as const,
])("%s", (_, set, field) => {
  it("adds the value", () => {
    const body = create(BodySchema, {});

    set(body, StringValueSchema, create(StringValueSchema, { value: "a" }));

    expect(body[field]).toHaveLength(1);
    expect(anyUnpack(body[field][0], StringValueSchema)?.value).toBe("a");
  });

  it("adds the value to a header", () => {
    const header = create(HeaderSchema, {});

    set(header, StringValueSchema, create(StringValueSchema, { value: "a" }));

    expect(header[field]).toHaveLength(1);
    expect(anyUnpack(header[field][0], StringValueSchema)?.value).toBe("a");
  });

  it("replaces an existing value of the same message type", () => {
    const body = create(BodySchema, {});
    const other = anyPack(
      EventStreamPositionSchema,
      create(EventStreamPositionSchema, {}),
    );
    body[field].push(other);

    set(body, StringValueSchema, create(StringValueSchema, { value: "a" }));
    set(body, StringValueSchema, create(StringValueSchema, { value: "b" }));

    expect(body[field]).toHaveLength(2);
    expect(body[field][0]).toBe(other);
    expect(anyUnpack(body[field][1], StringValueSchema)?.value).toBe("b");
  });

  it("ignores values whose type URL has no message name", () => {
    const body = create(BodySchema, {});
    const malformed = anyPack(StringValueSchema, create(StringValueSchema, {}));
    malformed.typeUrl = "example.com/";
    body[field].push(malformed);

    set(body, StringValueSchema, create(StringValueSchema, { value: "a" }));

    expect(body[field]).toHaveLength(2);
    expect(body[field][0]).toBe(malformed);
  });

  it("replaces an existing value of the same type with a different type URL prefix", () => {
    const body = create(BodySchema, {});
    const first = anyPack(
      StringValueSchema,
      create(StringValueSchema, { value: "a" }),
    );
    first.typeUrl = "example.com/google.protobuf.StringValue";
    body[field].push(first);

    set(body, StringValueSchema, create(StringValueSchema, { value: "b" }));

    expect(body[field]).toHaveLength(1);
    expect(body[field][0].typeUrl).toBe(
      "type.googleapis.com/google.protobuf.StringValue",
    );
  });
});

describe("tryGetExtension", () => {
  it("skips values whose type URL has no message name", () => {
    const position = create(EventStreamPositionSchema, { offset: 42n });
    const malformed = anyPack(StringValueSchema, create(StringValueSchema, {}));
    malformed.typeUrl = "example.com/";

    const env = create(EnvelopeSchema, {
      body: {
        extensions: [malformed, anyPack(EventStreamPositionSchema, position)],
      },
    });

    expect(tryGetExtension(env, EventStreamPositionSchema)?.offset).toBe(42n);
  });
});

// The golden fixtures are shared with the Go tests, to ensure that both
// languages find the same extension and baggage values.
describe("golden MultiEnvelope fixtures", () => {
  const dir = new URL("./testdata/", import.meta.url);

  const cases: {
    file: string;
    description: string;
    bodies: {
      extensionOffset: number | null;
      baggageOffset: number | null;
    }[];
  }[] = JSON.parse(readFileSync(new URL("expectations.json", dir), "utf-8"));

  it.each(cases)("$description", ({ file, bodies }) => {
    const multi = fromBinary(
      MultiEnvelopeSchema,
      readFileSync(new URL(file, dir)),
    );

    const got = expandMultiEnvelope(multi).map((env) => ({
      extensionOffset: offset(tryGetExtension(env, EventStreamPositionSchema)),
      baggageOffset: offset(tryGetBaggage(env, EventStreamPositionSchema)),
    }));

    expect(got).toEqual(bodies);
  });

  function offset(x: { offset: bigint } | undefined): number | null {
    return x === undefined ? null : Number(x.offset);
  }
});
