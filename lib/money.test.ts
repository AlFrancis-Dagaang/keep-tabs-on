import { describe, expect, it } from "vitest";
import { balanceOf, type Entry, formatMoney, parseMoney, startingForBalance, toInput } from "./money";

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

const a = "a";
const b = "b";
const entries: Entry[] = [
  { type: "income", amount: 50000, accountId: a, toAccountId: null },
  { type: "expense", amount: 20000, accountId: a, toAccountId: null },
  { type: "transfer", amount: 30000, accountId: a, toAccountId: b },
  { type: "transfer", amount: 5000, accountId: b, toAccountId: a },
  { type: "expense", amount: 1000, accountId: b, toAccountId: null },
];

describe("balanceOf", () => {
  it("is starting + income − expenses + transfers in − transfers out", () => {
    expect(balanceOf({ id: a, startingBalance: 100000 }, entries)).toBe(100000 + 50000 - 20000 + 5000 - 30000);
    expect(balanceOf({ id: b, startingBalance: 0 }, entries)).toBe(30000 - 5000 - 1000);
  });

  it("ignores other accounts' entries", () => {
    expect(balanceOf({ id: "c", startingBalance: 700 }, entries)).toBe(700);
  });
});

describe("startingForBalance", () => {
  it("sets the starting balance so the shown balance equals the target", () => {
    const account = { id: a, startingBalance: 100000 };
    const startingBalance = startingForBalance(account, entries, 25050);
    expect(balanceOf({ id: a, startingBalance }, entries)).toBe(25050);
  });

  it("goes below zero when entries already exceed the target", () => {
    const account = { id: a, startingBalance: 0 };
    const income: Entry[] = [{ type: "income", amount: 50000, accountId: a, toAccountId: null }];
    expect(startingForBalance(account, income, 10000)).toBe(-40000);
  });
});
