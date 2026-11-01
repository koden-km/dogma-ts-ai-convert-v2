import { describe, expect, it } from "vitest";
import { NotSupportedError } from "./error.ts";
import { NoCompactBehavior, NoResetBehavior } from "./projection.ts";
import { backgroundContext } from "./util.ts";

describe("NoCompactBehavior", () => {
  it("does not throw", () => {
    expect(() =>
      NoCompactBehavior.compact(backgroundContext(), null as any),
    ).not.toThrow();
  });
});

describe("NoResetBehavior", () => {
  it("throws NotSupportedError", () => {
    expect(() =>
      NoResetBehavior.reset(backgroundContext(), null as any),
    ).toThrow(NotSupportedError);
  });
});
