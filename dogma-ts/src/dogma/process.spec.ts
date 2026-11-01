import { describe, expect, it } from "vitest";
import { UnexpectedMessageError } from "./message.ts";
import {
  NoDeadlineMessagesBehavior,
  StatelessProcessBehavior,
  statelessProcessRoot,
} from "./process.ts";
import { backgroundContext } from "./util.ts";

describe("StatelessProcessBehavior", () => {
  it("returns the frozen stateless process root", () => {
    const root = StatelessProcessBehavior.newRoot();
    expect(root).toBe(statelessProcessRoot);
    expect(Object.isFrozen(root)).toBe(true);
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
