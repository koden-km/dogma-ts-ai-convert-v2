import { create, toBinary } from "@bufbuild/protobuf";
import { AnySchema } from "@bufbuild/protobuf/wkt";
import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  EnvelopeSchema,
  EventStreamPositionSchema,
  getBaggage,
  getExtension,
  setBaggage,
  setExtension,
  tryGetBaggage,
  tryGetExtension,
  type EventStreamPosition,
} from "./index.js";

type Value = { typeUrl: string; data: string };
const cases: {
  name: string;
  header: Value[] | null;
  body: Value[] | null;
  offset: number | null;
  error: boolean;
}[] = JSON.parse(
  readFileSync(new URL("./testdata/lookup.json", import.meta.url), "utf8"),
);

function values(input: Value[]) {
  return input.map(({ typeUrl, data }) =>
    create(AnySchema, { typeUrl, value: Buffer.from(data, "hex") }),
  );
}

describe.each([
  ["extensions", tryGetExtension, getExtension, setExtension],
  ["baggage", tryGetBaggage, getBaggage, setBaggage],
] as const)("%s lookup", (field, optional, required, set) => {
  it.each(cases)("$name", ({ header, body, offset, error }) => {
    const env = create(EnvelopeSchema, {
      header: header === null ? undefined : { [field]: values(header) },
      body: body === null ? undefined : { [field]: values(body) },
    });
    const before = toBinary(EnvelopeSchema, env);

    if (error) {
      expect(() => optional(env, EventStreamPositionSchema)).toThrow();
      expect(() => required(env, EventStreamPositionSchema)).toThrow();
    } else {
      const result = optional(env, EventStreamPositionSchema);
      expect(result?.offset ?? null).toBe(
        offset === null ? null : BigInt(offset),
      );
      if (offset === null) {
        expect(() => required(env, EventStreamPositionSchema)).toThrow(
          "is not present",
        );
      } else {
        expect(required(env, EventStreamPositionSchema)).toEqual(result);
      }
    }
    expect(toBinary(EnvelopeSchema, env)).toEqual(before);
  });

  it.each(["header", "body"] as const)(
    "replaces the first matching duplicate on the %s",
    (location) => {
      const env = create(EnvelopeSchema, { header: {}, body: {} });
      const target = env[location]!;
      const typeName = EventStreamPositionSchema.typeName;
      target[field] = values([
        { typeUrl: "example.com/", data: "ff" },
        { typeUrl: `example.com/${typeName}`, data: "1001" },
        { typeUrl: `type.googleapis.com/${typeName}`, data: "1002" },
      ]);
      const unrelated = target[field][0];
      const duplicate = target[field][2];
      set(
        target,
        EventStreamPositionSchema,
        create(EventStreamPositionSchema, { offset: 3n }),
      );
      expect(optional(env, EventStreamPositionSchema)?.offset).toBe(3n);
      expect(target[field]).toHaveLength(3);
      expect(target[field][0]).toBe(unrelated);
      expect(target[field][2]).toBe(duplicate);
    },
  );

  it("keeps a body override when setting the header", () => {
    const env = create(EnvelopeSchema, { header: {}, body: {} });
    set(
      env.body!,
      EventStreamPositionSchema,
      create(EventStreamPositionSchema, { offset: 2n }),
    );
    set(
      env.header!,
      EventStreamPositionSchema,
      create(EventStreamPositionSchema, { offset: 1n }),
    );
    expect(required(env, EventStreamPositionSchema).offset).toBe(2n);
  });

  it("infers optional and required result types", () => {
    const env = create(EnvelopeSchema, {});
    expectTypeOf(optional(env, EventStreamPositionSchema)).toEqualTypeOf<
      EventStreamPosition | undefined
    >();
    // Type assertion only: required lookup would throw on this empty envelope.
    expectTypeOf<
      ReturnType<typeof required<typeof EventStreamPositionSchema>>
    >().toEqualTypeOf<EventStreamPosition>();
  });
});
