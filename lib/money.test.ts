import { describe, expect, it } from "vitest";
import { balanceOf, billBlocks, type Entry, formatMoney, nextDueDate, parseMoney, startingForBalance, toInput } from "./money";

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

describe("nextDueDate", () => {
  it("adds 7 or 14 days for weekly and biweekly, across months and years", () => {
    expect(nextDueDate("2026-11-11", "weekly", 11)).toBe("2026-11-18");
    expect(nextDueDate("2026-12-31", "weekly", 31)).toBe("2027-01-07");
    expect(nextDueDate("2026-11-25", "biweekly", 25)).toBe("2026-12-09");
  });

  it("adds a month, three months or a year for the other repeats", () => {
    expect(nextDueDate("2026-11-15", "monthly", 15)).toBe("2026-12-15");
    expect(nextDueDate("2026-12-15", "monthly", 15)).toBe("2027-01-15");
    expect(nextDueDate("2026-11-15", "quarterly", 15)).toBe("2027-02-15");
    expect(nextDueDate("2026-11-15", "yearly", 15)).toBe("2027-11-15");
  });

  it("clamps to the month's last day, then returns to the due day", () => {
    expect(nextDueDate("2027-01-31", "monthly", 31)).toBe("2027-02-28");
    expect(nextDueDate("2028-01-31", "monthly", 31)).toBe("2028-02-29");
    expect(nextDueDate("2027-02-28", "monthly", 31)).toBe("2027-03-31");
    expect(nextDueDate("2026-11-30", "quarterly", 30)).toBe("2027-02-28");
    expect(nextDueDate("2028-02-29", "yearly", 29)).toBe("2029-02-28");
  });
});

describe("billBlocks", () => {
  it("fills a block only once it's earned, and all 12 only when fully paid", () => {
    expect(billBlocks(0, 120000)).toBe(0);
    expect(billBlocks(30000, 120000)).toBe(3);
    expect(billBlocks(119999, 120000)).toBe(11);
    expect(billBlocks(120000, 120000)).toBe(12);
  });
});
