import { describe, expect, it } from "vitest";
import { cleanAmountInput, parseAmount, rupees } from "./format";

describe("amounts with paise", () => {
  it("parses up to 2 decimals and rejects the rest", () => {
    expect(parseAmount("15.5")).toBe(15.5);
    expect(parseAmount("1,250.75")).toBe(1250.75);
    expect(parseAmount("15.")).toBe(15);
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("0")).toBeNull();
  });

  it("cleans typing to one dot and 2 decimals", () => {
    expect(cleanAmountInput("12.3.45")).toBe("12.34");
    expect(cleanAmountInput("₹1,5a0")).toBe("150");
  });

  it("shows paise only when there are any", () => {
    expect(rupees(15)).toBe("₹15");
    expect(rupees(15.5)).toBe("₹15.50");
    expect(rupees(-125000)).toBe("-₹1,25,000");
  });
});
