import { describe, expect, it } from "vitest";
import { NoSnapshotBehavior } from "./aggregate.ts";
import { NotSupportedError } from "./error.ts";

describe("NoSnapshotBehavior", () => {
  it("marshal throws NotSupportedError", () => {
    expect(() => NoSnapshotBehavior.marshal()).toThrow(NotSupportedError);
  });

  it("unmarshal throws NotSupportedError", () => {
    expect(() =>
      NoSnapshotBehavior.unmarshal(new Uint8Array([1, 2, 3])),
    ).toThrow(NotSupportedError);
  });
});
