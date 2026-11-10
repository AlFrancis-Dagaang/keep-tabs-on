import { describe, expect, it } from "vitest";
import { balanceOf, formatMoney, parseMoney, startingForBalance, toInput } from "./money";

describe("parseMoney", () => {
  it("reads pesos into integer centavos", () => {
    expect(parseMoney("1,234.56")).toBe(123456);
    expect(parseMoney(" 50 ")).toBe(5000);
    expect(parseMoney("0.5")).toBe(50);
    expect(parseMoney("0")).toBe(0);
  });

  it("rejects negatives, extra decimals and junk", () => {
    for (const bad of ["-50", "1.234", "", "abc", "1.2.3", "₱100"]) expect(parseMoney(bad)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("shows centavos as pesos", () => {
    expect(formatMoney(123456)).toBe("₱1,234.56");
    expect(toInput(123456)).toBe("1234.56");
  });
});

describe("startingForBalance", () => {
  it("sets the starting balance so the shown balance equals the target", () => {
    const account = { startingBalance: 10000 };
    const startingBalance = startingForBalance(account, 25050);
    expect(balanceOf({ startingBalance })).toBe(25050);
  });
});
