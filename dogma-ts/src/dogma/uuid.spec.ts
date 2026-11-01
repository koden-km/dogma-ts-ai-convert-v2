import { describe, expect, it } from "vitest";
import { normalizeUUID } from "./uuid.ts";

describe("normalizeUUID", () => {
  it("returns the normalized UUID", () => {
    const id = "83C4A2D9-A728-49E6-83A3-6C670B99A173";
    const want = "83c4a2d9-a728-49e6-83a3-6c670b99a173";

    expect(normalizeUUID(id)).toBe(want);
  });

  it("throws an error when the UUID is invalid", () => {
    const valid = "b917cba9-1fa2-4513-8bf5-67acc121299f";

    const cases: string[] = [
      "00000000-0000-0000-0000-000000000000", // "nil" UUID
      valid.slice(0, -1), // too short
      valid + "f", // too long
    ];

    for (let i = 0; i < valid.length; i++) {
      const ch = valid[i];
      if (ch === "-") {
        cases.push(valid.slice(0, i) + "f" + valid.slice(i + 1));
      } else {
        cases.push(valid.slice(0, i) + "-" + valid.slice(i + 1));
      }
    }

    for (const id of cases) {
      expect(() => normalizeUUID(id)).toThrow();
    }
  });
});
