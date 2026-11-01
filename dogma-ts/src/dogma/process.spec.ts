import { describe, expect, it } from "vitest";
import { UnexpectedMessageError } from "./message.ts";
import {
  NoDeadlineMessagesBehavior,
  StatelessProcessBehavior,
} from "./process.ts";
import { backgroundContext } from "./util.ts";

describe("StatelessProcessBehavior", () => {
  const root = StatelessProcessBehavior.newRoot() as any;

  it("returns a non-null root", () => {
    expect(root).toBeDefined();
  });

  it("processInstanceDescription returns an empty string", () => {
    expect(root.processInstanceDescription(false)).toBe("");
    expect(root.processInstanceDescription(true)).toBe("");
  });

  it("marshalBinary returns an empty slice", () => {
    const data = root.marshalBinary();
    expect(data.length).toBe(0);
  });

  it("unmarshalBinary succeeds on empty data and throws on non-empty data", () => {
    expect(() => root.unmarshalBinary(null)).not.toThrow();
    expect(() => root.unmarshalBinary(new Uint8Array(0))).not.toThrow();
    expect(() => root.unmarshalBinary(new Uint8Array([1, 2, 3]))).toThrow();
  });
});

describe("NoDeadlineMessagesBehavior", () => {
  it("throws UnexpectedMessageError", () => {
    expect(() =>
      NoDeadlineMessagesBehavior.handleDeadline(
        backgroundContext(),
        {},
        null as any,
        null as any,
      ),
    ).toThrow(UnexpectedMessageError);
  });
});
