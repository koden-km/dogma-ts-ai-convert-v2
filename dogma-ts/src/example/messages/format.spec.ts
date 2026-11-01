import { describe, expect, it } from "vitest";
import { formatAmount } from "./format.ts";

describe("formatAmount", () => {
  it("formats amounts in USD by default", () => {
    expect(formatAmount(1000n)).toBe("$10.00");
    expect(formatAmount(12345n)).toBe("$123.45");
  });

  it("formats negative amounts", () => {
    expect(formatAmount(-500n)).toBe("-$5.00");
  });

  it("formats zero", () => {
    expect(formatAmount(0n)).toBe("$0.00");
  });

  it("formats amounts with a specific currency", () => {
    expect(formatAmount(1000n, "EUR")).toBe("€10.00");
    expect(formatAmount(1000n, "GBP")).toBe("£10.00");
  });

  it("formats amounts with a specific locale", () => {
    // German locale uses comma as decimal separator and puts currency symbol after the number
    expect(formatAmount(1000n, "EUR", "de-DE")).toMatch(/10,00\s€/);
  });
});
