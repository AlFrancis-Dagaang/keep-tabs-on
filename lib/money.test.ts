import { describe, expect, it } from "vitest";
import { accountHistory, balanceOf, billsDueSoon, type BudgetExpense, budgetFor, budgetHistory, currencySymbol, type Entry, formatMoney, manilaMonth, monthRange, monthTotals, netWorth, nextDueDate, parseMoney, parseRange, progressBlocks, startingForBalance, toInput } from "./money";

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
  it("shows centavos in the chosen currency", () => {
    expect(formatMoney(123456, "PHP")).toBe("₱1,234.56");
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
    expect(toInput(123456)).toBe("1234.56");
  });

  it("gives the symbol for form labels", () => {
    expect(currencySymbol("PHP")).toBe("₱");
    expect(currencySymbol("USD")).toBe("$");
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

describe("netWorth", () => {
  const rows = [
    { balance: 100000, includeInNetWorth: true },
    { balance: 15000, includeInNetWorth: true },
    { balance: 500000, includeInNetWorth: false },
  ];

  it("sums every account when all are included", () => {
    expect(netWorth(rows.map((row) => ({ ...row, includeInNetWorth: true })))).toBe(615000);
  });

  it("leaves out excluded accounts", () => {
    expect(netWorth(rows)).toBe(115000);
  });

  it("is 0 with nothing included or no accounts", () => {
    expect(netWorth(rows.map((row) => ({ ...row, includeInNetWorth: false })))).toBe(0);
    expect(netWorth([])).toBe(0);
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

describe("progressBlocks", () => {
  it("fills a block only once it's earned, and all 12 only when fully paid", () => {
    expect(progressBlocks(0, 120000)).toBe(0);
    expect(progressBlocks(30000, 120000)).toBe(3);
    expect(progressBlocks(119999, 120000)).toBe(11);
    expect(progressBlocks(120000, 120000)).toBe(12);
  });
});

describe("manilaMonth", () => {
  it("turns the month at Manila midnight, 8 hours ahead of UTC", () => {
    expect(manilaMonth(new Date("2026-11-30T15:59:59Z"))).toBe("2026-11-01");
    expect(manilaMonth(new Date("2026-11-30T16:00:00Z"))).toBe("2026-12-01");
    expect(manilaMonth(new Date("2026-12-31T16:00:00Z"))).toBe("2027-01-01");
  });
});

describe("budget", () => {
  const categories = [
    { id: "food", name: "Food", kind: "spending" as const },
    { id: "fun", name: "Fun", kind: "spending" as const },
    { id: "salary", name: "Salary", kind: "income" as const },
  ];
  const expense = (amount: number, date: string, categoryId: string | null, more: Partial<BudgetExpense> = {}): BudgetExpense =>
    ({ type: "expense", amount, date, categoryId, billId: null, debtId: null, ...more });

  it("counts expenses in spending categories only, inside the month, without bill or debt payments", () => {
    const result = budgetFor("2026-11-01", categories, [{ categoryId: "food", month: "2026-11-01", budget: 1000 }], [
      expense(100, "2026-11-01", "food"),
      expense(200, "2026-11-30", "food"),
      expense(400, "2026-12-01", "food"), // next month
      expense(800, "2026-10-31", "food"), // last month
      expense(50, "2026-11-10", "food", { billId: "bill" }),
      expense(60, "2026-11-10", "food", { debtId: "debt" }),
      expense(70, "2026-11-10", "salary"),
      { ...expense(90, "2026-11-10", "food"), type: "income" },
      { ...expense(90, "2026-11-10", "food"), type: "transfer" },
      expense(30, "2026-11-10", "fun"),
    ]);
    expect(result.rows).toEqual([
      { id: "food", name: "Food", budget: 1000, spent: 300, left: 700 },
      { id: "fun", name: "Fun", budget: null, spent: 30, left: null },
    ]);
    // Fun has no limit, so it stays out of the totals.
    expect(result).toMatchObject({ budget: 1000, spent: 300, left: 700 });
  });

  it("uses the limit as it was in each month, so changing it later leaves past months alone", () => {
    const limits = [{ categoryId: "food", month: "2026-09-01", budget: 1000 }];
    const expenses = [expense(300, "2026-10-05", "food"), expense(1200, "2026-11-05", "food")];
    const october = budgetFor("2026-10-01", categories, limits, expenses);
    expect(october).toMatchObject({ budget: 1000, spent: 300, left: 700 });

    const changed = [...limits, { categoryId: "food", month: "2026-12-01", budget: 5000 }];
    expect(budgetFor("2026-10-01", categories, changed, expenses)).toEqual(october);
    expect(budgetFor("2026-12-01", categories, changed, expenses)).toMatchObject({ budget: 5000 });
    // A removed limit holds from its month on.
    expect(budgetFor("2026-12-01", categories, [...limits, { categoryId: "food", month: "2026-12-01", budget: null }], expenses).rows[0].budget).toBeNull();
  });

  it("lists past months newest first with budget, spent and saved, skipping empty ones", () => {
    const limits = [{ categoryId: "food", month: "2026-09-01", budget: 1000 }, { categoryId: "food", month: "2026-12-01", budget: 5000 }];
    const expenses = [expense(300, "2026-10-05", "food"), expense(1200, "2026-11-05", "food"), expense(10, "2026-12-02", "fun")];
    const history = budgetHistory("2026-12-01", categories, limits, expenses);
    expect(history.map(({ month, budget, spent, left }) => ({ month, budget, spent, left }))).toEqual([
      { month: "2026-11-01", budget: 1000, spent: 1200, left: -200 },
      { month: "2026-10-01", budget: 1000, spent: 300, left: 700 },
      { month: "2026-09-01", budget: 1000, spent: 0, left: 1000 },
    ]);
    expect(history[0].rows.map((row) => row.id)).toEqual(["food"]); // Fun had nothing in November
    expect(budgetHistory("2026-12-01", categories, [], [])).toEqual([]);
  });
});

describe("monthTotals", () => {
  it("sums income and expenses inside the month, leaving out transfers", () => {
    expect(monthTotals("2026-11-01", [
      { type: "income", amount: 1000, date: "2026-11-01" },
      { type: "income", amount: 500, date: "2026-12-01" }, // next month
      { type: "expense", amount: 200, date: "2026-11-30" },
      { type: "expense", amount: 300, date: "2026-10-31" }, // last month
      { type: "transfer", amount: 400, date: "2026-11-15" },
    ])).toEqual({ income: 1000, expenses: 200 });
  });
});

describe("billsDueSoon", () => {
  it("counts overdue bills and those due within 7 days, with what's left this cycle", () => {
    expect(billsDueSoon([
      { nextDueDate: "2026-11-01", amount: 1000, paid: 0 }, // overdue
      { nextDueDate: "2026-11-20", amount: 500, paid: 200 }, // day 7, part paid
      { nextDueDate: "2026-11-21", amount: 900, paid: 0 }, // day 8
    ], "2026-11-13")).toEqual({ count: 2, left: 1300 });
    expect(billsDueSoon([{ nextDueDate: "2026-12-03", amount: 100, paid: 0 }], "2026-11-28")).toEqual({ count: 1, left: 100 }); // across months
  });
});

describe("monthRange", () => {
  it("ends on the month's last day, including 28/29-day Februaries and December", () => {
    expect(monthRange("2026-11-01")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange("2026-01-01").to).toBe("2026-01-31");
    expect(monthRange("2026-02-01").to).toBe("2026-02-28");
    expect(monthRange("2028-02-01").to).toBe("2028-02-29");
    expect(monthRange("2026-12-01").to).toBe("2026-12-31");
  });

  it("puts Manila's 2026-11-30 inside November and 2026-12-01 outside it", () => {
    const { from, to } = monthRange(manilaMonth(new Date("2026-11-30T15:00:00Z"))); // Nov 30, 23:00 in Manila
    expect(from).toBe("2026-11-01");
    expect("2026-11-30" >= from && "2026-11-30" <= to).toBe(true);
    expect("2026-12-01" <= to).toBe(false);
  });
});

describe("parseRange", () => {
  it("keeps real dates, drops junk, and ignores an inverted pair", () => {
    expect(parseRange("2026-11-01", "2026-11-30")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(parseRange("2026-11-05", undefined)).toEqual({ from: "2026-11-05", to: undefined });
    expect(parseRange("2026-02-30", "nope")).toEqual({ from: undefined, to: undefined });
    expect(parseRange("2026-11-30", "2026-11-01")).toEqual({});
  });
});

describe("accountHistory", () => {
  it("gives the balance after each entry and ends at balanceOf", () => {
    const account = { id: a, startingBalance: 100000 };
    const mine = entries.filter((e) => e.accountId === a || e.toAccountId === a);
    const history = accountHistory(account, mine);
    expect(history.map((h) => h.change)).toEqual(mine.map((e) => balanceOf({ id: a, startingBalance: 0 }, [e])));
    expect(history.at(-1)!.balanceAfter).toBe(balanceOf(account, entries));
  });

  it("is empty when there are no entries", () => {
    expect(accountHistory({ id: a, startingBalance: 700 }, [])).toEqual([]);
  });
});
