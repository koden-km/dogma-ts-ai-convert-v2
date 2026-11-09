import { create } from "@bufbuild/protobuf";
import { timestampNow } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";
import { IdentitySchema } from "../identitypb/identity_pb.js";
import { UUIDSchema } from "../uuidpb/uuid_pb.js";
import { generateUUID } from "../uuidpb/uuid.js";
import {
  validateBody,
  validateEnvelope,
  validateHeader,
  validateMessage,
  validateMultiEnvelope,
} from "./envelope.js";
import {
  EnvelopeSchema,
  MultiEnvelopeSchema,
  type Envelope,
} from "./envelope_pb.js";

// newEnvelope returns a valid envelope, after applying the given modifications.
function newEnvelope(modify: (e: Envelope) => void = () => {}): Envelope {
  const e = create(EnvelopeSchema, {
    header: {
      causationId: generateUUID(),
      correlationId: generateUUID(),
      source: {
        site: { name: "<site-name>", key: generateUUID() },
        application: { name: "<app-name>", key: generateUUID() },
        handler: { name: "<handler-name>", key: generateUUID() },
        instanceId: "<instance>",
      },
    },
    body: {
      messageId: generateUUID(),
      createdAt: timestampNow(),
      scheduledFor: timestampNow(),
      message: {
        typeId: generateUUID(),
        description: "<description>",
        data: new TextEncoder().encode("<data>"),
      },
      extensions: [
        {
          typeUrl: "type.googleapis.com/example.Extension",
          value: new Uint8Array([1]),
        },
      ],
      baggage: [
        {
          typeUrl: "type.googleapis.com/example.Baggage",
          value: new Uint8Array([2]),
        },
      ],
    },
  });

  modify(e);
  return e;
}

const zero = "00000000-0000-0000-0000-000000000000";

describe("validateEnvelope", () => {
  it.each<[string, (e: Envelope) => void]>([
    ["complete", () => {}],
    ["without source site", (e) => (e.header!.source!.site = undefined)],
    [
      "without source handler",
      (e) => {
        e.header!.source!.handler = undefined;
        e.header!.source!.instanceId = "";
        e.body!.scheduledFor = undefined;
      },
    ],
    [
      "without source instance ID",
      (e) => {
        e.header!.source!.instanceId = "";
        e.body!.scheduledFor = undefined;
      },
    ],
    ["without extensions", (e) => (e.body!.extensions = [])],
    [
      "with empty extension payload",
      (e) =>
        (e.body!.extensions = [
          {
            $typeName: "google.protobuf.Any",
            typeUrl: "type.googleapis.com/x.Y",
            value: new Uint8Array(),
          },
        ]),
    ],
    ["without data", (e) => (e.body!.message!.data = new Uint8Array())],
  ])("accepts an envelope %s", (_, modify) => {
    expect(() => validateEnvelope(newEnvelope(modify))).not.toThrow();
  });

  it.each<[string, (e: Envelope) => void, string]>([
    [
      "without a header",
      (e) => (e.header = undefined),
      "invalid header: must be set",
    ],
    [
      "without a body",
      (e) => (e.body = undefined),
      "invalid body: must be set",
    ],
    [
      "with an invalid message ID",
      (e) => (e.body!.messageId = create(UUIDSchema)),
      `invalid body: invalid message ID (${zero}): UUID must use version 4 or 5`,
    ],
    [
      "with an invalid causation ID",
      (e) => (e.header!.causationId = create(UUIDSchema)),
      `invalid header: invalid causation ID (${zero}): UUID must use version 4 or 5`,
    ],
    [
      "without a correlation ID",
      (e) => (e.header!.correlationId = undefined),
      `invalid header: invalid correlation ID (${zero}): UUID must use version 4 or 5`,
    ],
    [
      "with an invalid source site",
      (e) => (e.header!.source!.site = create(IdentitySchema)),
      `invalid header: invalid source: invalid site (${zero} ?): invalid name: must be between 1 and 255 bytes`,
    ],
    [
      "without a source application",
      (e) => (e.header!.source!.application = undefined),
      `invalid header: invalid source: invalid application (${zero} ?): invalid name: must be between 1 and 255 bytes`,
    ],
    [
      "with a source instance ID but no handler",
      (e) => (e.header!.source!.handler = undefined),
      "invalid header: invalid source: invalid instance ID: must not be specified without a handler",
    ],
    [
      "with a scheduled-for time but no source handler",
      (e) => {
        e.header!.source!.handler = undefined;
        e.header!.source!.instanceId = "";
      },
      "invalid body: invalid scheduled-for time: must not be specified without a source handler and instance ID",
    ],
    [
      "without a created-at time",
      (e) => (e.body!.createdAt = undefined),
      "invalid body: invalid created-at time: must be set",
    ],
    [
      "with an out-of-range scheduled-for time",
      (e) => (e.body!.scheduledFor!.seconds = 253402300800n),
      "invalid body: invalid scheduled-for time: must be between 0001-01-01 and 9999-12-31",
    ],
    [
      "with an empty description",
      (e) => (e.body!.message!.description = ""),
      "invalid body: invalid message: invalid description: must not be empty",
    ],
    [
      "without a type ID",
      (e) => (e.body!.message!.typeId = undefined),
      `invalid body: invalid message: invalid type ID (${zero}): UUID must use version 4 or 5`,
    ],
    [
      "with an empty header extension type URL",
      (e) =>
        (e.header!.extensions = [
          {
            $typeName: "google.protobuf.Any",
            typeUrl: "",
            value: new Uint8Array(),
          },
        ]),
      "invalid header: invalid extensions at index 0: type URL must not be empty",
    ],
    [
      "with an empty body baggage type URL",
      (e) =>
        (e.body!.baggage = [
          {
            $typeName: "google.protobuf.Any",
            typeUrl: "",
            value: new Uint8Array(),
          },
        ]),
      "invalid body: invalid baggage at index 0: type URL must not be empty",
    ],
  ])("rejects an envelope %s", (_, modify, message) => {
    expect(() => validateEnvelope(newEnvelope(modify))).toThrow(message);
  });
});

describe("validateMultiEnvelope", () => {
  it("accepts a valid multi-envelope", () => {
    const e = newEnvelope();
    const multi = create(MultiEnvelopeSchema, {
      header: e.header,
      bodies: [e.body!, newEnvelope().body!],
    });

    expect(() => validateMultiEnvelope(multi)).not.toThrow();
  });

  it("identifies the invalid body by its index", () => {
    const e = newEnvelope();
    const invalid = newEnvelope((x) => (x.body!.message!.description = ""));
    const multi = create(MultiEnvelopeSchema, {
      header: e.header,
      bodies: [e.body!, invalid.body!],
    });

    expect(() => validateMultiEnvelope(multi)).toThrow(
      "invalid body at index 1: invalid message: invalid description: must not be empty",
    );
  });
});

describe("validateHeader", () => {
  it("accepts a valid header", () => {
    expect(() => validateHeader(newEnvelope().header)).not.toThrow();
  });

  it("rejects a missing header", () => {
    expect(() => validateHeader(undefined)).toThrow("must be set");
  });

  it("rejects an invalid header", () => {
    const e = newEnvelope((x) => (x.header!.source = undefined));

    expect(() => validateHeader(e.header)).toThrow(
      "invalid source: must be set",
    );
  });
});

describe("validateBody", () => {
  it("accepts a valid body", () => {
    const e = newEnvelope();

    expect(() => validateBody(e.body, e.header)).not.toThrow();
  });

  it("rejects a missing body", () => {
    expect(() => validateBody(undefined, newEnvelope().header)).toThrow(
      "must be set",
    );
  });

  it("rejects an invalid body", () => {
    const e = newEnvelope((x) => (x.body!.message!.description = ""));

    expect(() => validateBody(e.body, e.header)).toThrow(
      "invalid message: invalid description: must not be empty",
    );
  });

  it("rejects a scheduled-for time when the header has no instance ID", () => {
    const e = newEnvelope((x) => (x.header!.source!.instanceId = ""));

    expect(() => validateBody(e.body, e.header)).toThrow(
      "invalid scheduled-for time: must not be specified without a source handler and instance ID",
    );
  });
});

describe("validateMessage", () => {
  it("accepts a valid message", () => {
    expect(() => validateMessage(newEnvelope().body!.message)).not.toThrow();
  });

  it("rejects a missing message", () => {
    expect(() => validateMessage(undefined)).toThrow("must be set");
  });

  it("rejects an invalid message", () => {
    const e = newEnvelope((x) => (x.body!.message!.description = ""));

    expect(() => validateMessage(e.body!.message)).toThrow(
      "invalid description: must not be empty",
    );
  });
});
