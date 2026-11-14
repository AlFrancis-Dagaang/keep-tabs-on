import type { Account, Bill, BudgetMonth, Category, Transaction } from "@/db/schema";

export const currencies = ["PHP", "USD"] as const;
export type Currency = (typeof currencies)[number];

const formatters = Object.fromEntries(
  currencies.map((currency) => [currency, new Intl.NumberFormat("en-PH", { style: "currency", currency, currencyDisplay: "narrowSymbol" })]),
) as Record<Currency, Intl.NumberFormat>;

/** "1,234.56" → 123456 centavos. Null for anything else, including negatives: accounts hold money you have. */
export function parseMoney(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim().replaceAll(",", ""));
  if (!match) return null;
  const centavos = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

export function formatMoney(centavos: number, currency: Currency): string {
  return formatters[currency].format(centavos / 100);
}

/** The symbol for a form label: "₱", "$". */
export function currencySymbol(currency: Currency): string {
  return formatters[currency].formatToParts(0).find((part) => part.type === "currency")!.value;
}

/** For a form field: 123456 → "1234.56". */
export function toInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

export type Entry = Pick<Transaction, "type" | "amount" | "accountId" | "toAccountId">;

/** starting + income − expenses + transfers in − transfers out. */
export function balanceOf(account: Pick<Account, "id" | "startingBalance">, entries: Entry[]): number {
  return entries.reduce((balance, { type, amount, accountId, toAccountId }) => {
    if (type === "transfer" && toAccountId === account.id) return balance + amount;
    if (accountId !== account.id) return balance;
    return type === "income" ? balance + amount : balance - amount;
  }, account.startingBalance);
}

/** The starting balance that makes balanceOf(account) equal target. Can go below zero: it's only an adjustment. */
export function startingForBalance(account: Pick<Account, "id" | "startingBalance">, entries: Entry[], target: number): number {
  return account.startingBalance + (target - balanceOf(account, entries));
}

export const repeatLabels: Record<Bill["repeat"], string> = {
  weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly", quarterly: "Every 3 months", yearly: "Yearly",
};

const monthsPerRepeat = { monthly: 1, quarterly: 3, yearly: 12 } as const;

/** The due date after this one. Month-based repeats land on dueDay, clamped to the month's length (Jan 31 → Feb 28 → Mar 31). */
export function nextDueDate(date: string, repeat: Bill["repeat"], dueDay: number): string {
  const [year, month, day] = date.split("-").map(Number);
  if (repeat === "weekly" || repeat === "biweekly") {
    return new Date(Date.UTC(year, month - 1, day + (repeat === "weekly" ? 7 : 14))).toISOString().slice(0, 10);
  }
  const target = month - 1 + monthsPerRepeat[repeat];
  const daysInTarget = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, target, Math.min(dueDay, daysInTarget))).toISOString().slice(0, 10);
}

/** How many of a progress bar's 12 blocks are filled. A block shows only once it's earned; all 12 only when fully paid. */
export function progressBlocks(paid: number, amount: number): number {
  return Math.min(12, Math.floor((paid * 12) / amount));
}

/** This month's first day, "YYYY-MM-01", on the Asia/Manila calendar rather than the server's UTC. */
export function manilaMonth(now: Date): string {
  return `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now).slice(0, 8)}01`;
}

function nextMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 10);
}

export type BudgetLimit = Pick<BudgetMonth, "categoryId" | "month" | "budget">;
export type BudgetExpense = Pick<Transaction, "type" | "amount" | "date" | "categoryId" | "billId" | "debtId">;

/**
 * Budget, spent and left per spending category for one month. A category's limit is its latest row at or before
 * the month, so a later change never reaches back. Totals cover only categories with a limit.
 */
export function budgetFor(month: string, categories: Pick<Category, "id" | "name" | "kind">[], limits: BudgetLimit[], expenses: BudgetExpense[]) {
  const end = nextMonth(month);
  const rows = categories.filter((category) => category.kind === "spending").map(({ id, name }) => {
    const latest = limits.filter((limit) => limit.categoryId === id && limit.month <= month).sort((a, b) => b.month.localeCompare(a.month))[0];
    const budget = latest?.budget ?? null;
    const spent = expenses
      .filter((e) => e.type === "expense" && e.categoryId === id && !e.billId && !e.debtId && e.date >= month && e.date < end)
      .reduce((total, e) => total + e.amount, 0);
    return { id, name, budget, spent, left: budget === null ? null : budget - spent };
  });
  const limited = rows.filter((row) => row.budget !== null);
  const budget = limited.reduce((total, row) => total + row.budget!, 0);
  const spent = limited.reduce((total, row) => total + row.spent, 0);
  return { month, rows, budget, spent, left: budget - spent };
}

/** Every month before thisMonth that had a limit or spending, newest first. Left is what was saved (negative when over). */
export function budgetHistory(thisMonth: string, categories: Pick<Category, "id" | "name" | "kind">[], limits: BudgetLimit[], expenses: BudgetExpense[]) {
  const starts = [...limits.map((limit) => limit.month), ...expenses.filter((e) => e.type === "expense").map((e) => `${e.date.slice(0, 8)}01`)];
  const months = [];
  for (let month = starts.sort()[0]; month && month < thisMonth; month = nextMonth(month)) {
    const result = budgetFor(month, categories, limits, expenses);
    const rows = result.rows.filter((row) => row.budget !== null || row.spent > 0);
    if (rows.length > 0) months.push({ ...result, rows });
  }
  return months.reverse();
}

/** Money in and out during a month. Transfers only move money between accounts; bill and debt payments are money out. */
export function monthTotals(month: string, entries: Pick<Transaction, "type" | "amount" | "date">[]) {
  const end = nextMonth(month);
  const inMonth = entries.filter((e) => e.date >= month && e.date < end);
  const total = (type: Transaction["type"]) => inMonth.filter((e) => e.type === type).reduce((sum, e) => sum + e.amount, 0);
  return { income: total("income"), expenses: total("expense") };
}

/** Bills due on or before today + days (overdue ones too), and what's left to pay on them this cycle. */
export function billsDueSoon(bills: (Pick<Bill, "nextDueDate" | "amount"> & { paid: number })[], today: string, days = 7) {
  const [year, month, day] = today.split("-").map(Number);
  const until = new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  const due = bills.filter((bill) => bill.nextDueDate <= until);
  return { count: due.length, left: due.reduce((sum, bill) => sum + bill.amount - bill.paid, 0) };
}

export const directionLabels = { owe: "You owe", owed: "Owed to you" } as const;

/** First and last day of a "YYYY-MM-01" month. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  return { from: month, to: new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10) };
}

function isDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

/** A date filter from search params. Anything that isn't a real YYYY-MM-DD is dropped, and an inverted pair is ignored. */
export function parseRange(from?: string, to?: string): { from?: string; to?: string } {
  const range = { from: isDate(from) ? from : undefined, to: isDate(to) ? to : undefined };
  return range.from && range.to && range.from > range.to ? {} : range;
}

/** Each entry, oldest first as given, with its effect on the account and the balance after it. */
export function accountHistory<T extends Entry>(account: Pick<Account, "id" | "startingBalance">, entries: T[]) {
  let balance = account.startingBalance;
  return entries.map((entry) => {
    const change = balanceOf({ id: account.id, startingBalance: 0 }, [entry]);
    balance += change;
    return { ...entry, change, balanceAfter: balance };
  });
}
