import { create } from "@bufbuild/protobuf";
import { EmptySchema } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";
import { parseUUID } from "../uuidpb/uuid.js";
import { UUIDSchema, type UUID } from "../uuidpb/uuid_pb.js";
import { validateMessageFilter } from "./filter.js";
import {
  MessageFilterSchema,
  MessageFilter_MessageTypesSchema,
} from "./filter_pb.js";

const id = parseUUID("a967a8b9-3f9c-4918-9a41-19577be5fec5");
function specific(ids: UUID[]) {
  return create(MessageFilterSchema, {
    types: {
      case: "specific",
      value: create(MessageFilter_MessageTypesSchema, { ids }),
    },
  });
}

describe("validateMessageFilter", () => {
  it("accepts an explicit all-types selection", () => {
    const filter = create(MessageFilterSchema, {
      types: { case: "all", value: create(EmptySchema) },
    });
    expect(() => validateMessageFilter(filter)).not.toThrow();
  });
  it("accepts a non-empty specific-types selection", () => {
    expect(() => validateMessageFilter(specific([id]))).not.toThrow();
  });
  it.each([
    ["missing filter", undefined],
    ["missing selection", create(MessageFilterSchema)],
    ["empty specific types", specific([])],
    ["invalid type ID", specific([create(UUIDSchema)])],
  ])("rejects %s", (_, filter) => {
    expect(() => validateMessageFilter(filter)).toThrow();
  });
});
