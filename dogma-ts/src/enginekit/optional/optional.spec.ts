import { describe, expect, it } from "vitest";
import { none, some, transform } from "./index.ts";

describe("optional", () => {
  it("some returns a present Optional", () => {
    const o = some(42);
    expect(o.isPresent()).toBe(true);
    expect(o.get()).toBe(42);
    expect(o.tryGet()).toEqual([42, true]);
  });

  it("none returns an absent Optional", () => {
    const o = none<number>();
    expect(o.isPresent()).toBe(false);
    expect(() => o.get()).toThrow("value is not present");
    expect(o.tryGet()).toEqual([undefined, false]);
  });

  it("transform transforms present values and preserves none", () => {
    expect(transform(some(21), (x) => x * 2).get()).toBe(42);
    expect(transform(none<number>(), (x) => x * 2).isPresent()).toBe(false);
  });
});
