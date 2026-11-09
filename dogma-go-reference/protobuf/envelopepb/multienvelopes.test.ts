import { clone, create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EnvelopeSchema,
  HeaderSchema,
  expandMultiEnvelope,
  asMultiEnvelopes,
  type Envelope,
  type Header,
} from "./index.js";

const cases: { name: string; headers: (string | null)[]; sizes: number[] }[] =
  JSON.parse(
    readFileSync(
      new URL("./testdata/multienvelopes.json", import.meta.url),
      "utf8",
    ),
  );

describe("asMultiEnvelopes", () => {
  it.each(cases)("$name", ({ headers, sizes }) => {
    const input = headers.map((key, index) =>
      create(EnvelopeSchema, {
        header:
          key === null
            ? undefined
            : key === ""
              ? {}
              : { source: { instanceId: key } },
        body: { idempotencyKey: String(index) },
      }),
    );
    const before = input.map((env) => toBinary(EnvelopeSchema, env));
    const groups = [...asMultiEnvelopes(input)];
    expect(groups.map((group) => group.bodies.length)).toEqual(sizes);
    const output = groups.flatMap(expandMultiEnvelope);
    expect(output.map((env) => toBinary(EnvelopeSchema, env))).toEqual(before);
    expect(input.map((env) => toBinary(EnvelopeSchema, env))).toEqual(before);
    output.forEach((env, index) => expect(env.body).toBe(input[index].body));
    let index = 0;
    for (const group of groups) {
      expect(group.header).toBe(input[index].header);
      index += group.bodies.length;
    }
  });

  it.each([
    [
      "causation",
      (h: Header) => {
        h.causationId = {
          $typeName: "dogma.protobuf.v1.UUID",
          upper: 1n,
          lower: 2n,
        };
      },
    ],
    [
      "correlation",
      (h: Header) => {
        h.correlationId = {
          $typeName: "dogma.protobuf.v1.UUID",
          upper: 1n,
          lower: 2n,
        };
      },
    ],
    [
      "source",
      (h: Header) => {
        h.source!.instanceId = "other";
      },
    ],
    [
      "extensions",
      (h: Header) => {
        h.extensions.push({
          $typeName: "google.protobuf.Any",
          typeUrl: "example.com/Unknown",
          value: new Uint8Array([1]),
        });
      },
    ],
    [
      "baggage",
      (h: Header) => {
        h.baggage.push({
          $typeName: "google.protobuf.Any",
          typeUrl: "example.com/Unknown",
          value: new Uint8Array([1]),
        });
      },
    ],
  ] as const)("keeps different %s separate", (_, change) => {
    const a = create(EnvelopeSchema, {
      header: { source: { instanceId: "a" } },
      body: {
        idempotencyKey: "body",
        extensions: [
          { typeUrl: "example.com/Unknown", value: new Uint8Array([2]) },
        ],
        baggage: [
          { typeUrl: "example.com/Baggage", value: new Uint8Array([3]) },
        ],
      },
    });
    const b = clone(EnvelopeSchema, a);
    change(b.header!);
    const input = [a, clone(EnvelopeSchema, a), b, clone(EnvelopeSchema, b)];
    const groups = [...asMultiEnvelopes(input)];
    expect(groups.map((group) => group.bodies.length)).toEqual([2, 2]);
    expect(groups.flatMap(expandMultiEnvelope)).toEqual(input);
  });

  it("includes unknown header fields in equivalence and preserves them", () => {
    const a = create(EnvelopeSchema, { header: {}, body: {} });
    const b = clone(EnvelopeSchema, a);
    b.header = fromBinary(HeaderSchema, new Uint8Array([0x98, 0x06, 1]));
    const input = [a, clone(EnvelopeSchema, a), b, clone(EnvelopeSchema, b)];
    const groups = [...asMultiEnvelopes(input)];
    expect(groups.map((group) => group.bodies.length)).toEqual([2, 2]);
    expect(
      groups
        .flatMap(expandMultiEnvelope)
        .map((env) => toBinary(EnvelopeSchema, env)),
    ).toEqual(input.map((env) => toBinary(EnvelopeSchema, env)));
  });

  it("is lazy and closes its source after early termination", () => {
    let reads = 0;
    let closed = false;
    function* source(): Generator<Envelope> {
      try {
        for (const id of ["a", "b", "c"]) {
          reads++;
          yield create(EnvelopeSchema, {
            header: { source: { instanceId: id } },
            body: {},
          });
        }
      } finally {
        closed = true;
      }
    }
    const groups = asMultiEnvelopes(source());
    expect(reads).toBe(0);
    for (const _group of groups) {
      break;
    }
    expect(reads).toBe(2);
    expect(closed).toBe(true);
  });

  it("does not mutate groups after yielding them", () => {
    const input = ["a", "a", "b"].map((id) =>
      create(EnvelopeSchema, {
        header: { source: { instanceId: id } },
        body: {},
      }),
    );
    const iterator = asMultiEnvelopes(input);
    const first = iterator.next().value!;
    const before = first.bodies.slice();
    iterator.next();
    iterator.next();
    expect(first.bodies).toEqual(before);
  });

  it("throws during iteration for an envelope without a body", () => {
    const iterator = asMultiEnvelopes([create(EnvelopeSchema, {})]);
    expect(() => iterator.next()).toThrow("envelope must have a body");
  });
});
