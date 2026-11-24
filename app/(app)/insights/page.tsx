import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { categories, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { manilaMonth, monthChange, monthlyTrend, monthRange, monthTotals, previousMonth, spendingByCategory } from "@/lib/money";
import { getMoney } from "@/lib/settings";

type Search = Promise<{ month?: string }>;

export default function InsightsPage({ searchParams }: { searchParams: Search }) {
  return (
    <>
      <PageHeader title="Insights" description="Where your money goes." />
      <Suspense fallback={<LoadingBar />}>
        <Insights searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const monthName = (month: string) => new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(month));
const shortName = (month: string) => new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: "UTC" }).format(new Date(month));

async function Insights({ searchParams }: { searchParams: Search }) {
  const money = await getMoney();
  const userId = await getUserId();
  const thisMonth = manilaMonth(new Date());
  const asked = `${(await searchParams).month}-01`;
  // Anything that is not a real past or current month falls back to this month.
  const month = /^\d{4}-(0[1-9]|1[0-2])-01$/.test(asked) && asked <= thisMonth ? asked : thisMonth;
  const trend = monthlyTrend(month, []);
  // shortcut: loads six months of entries per request and sums them in JS, switch to SQL sums when a month passes a few thousand rows.
  const { entries, userCategories } = await withUser(userId, async (tx) => ({
    entries: await tx.select({
      type: transactions.type, amount: transactions.amount, date: transactions.date,
      categoryId: transactions.categoryId, billId: transactions.billId, debtId: transactions.debtId, installmentId: transactions.installmentId,
    }).from(transactions).where(and(
      eq(transactions.userId, userId), inArray(transactions.type, ["income", "expense"]),
      gte(transactions.date, trend[0].month), lte(transactions.date, monthRange(month).to),
    )),
    userCategories: await tx.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
  }));

  const { income, expenses } = monthTotals(month, entries);
  const left = income - expenses;
  const where = spendingByCategory(month, entries, userCategories);
  const before = previousMonth(month);
  const beforeBy = new Map(spendingByCategory(before, entries, userCategories).map((row) => [row.name, row.amount]));
  const change = monthChange(expenses, monthTotals(before, entries).expenses);
  const months = monthlyTrend(month, entries);
  const tallest = Math.max(1, ...months.flatMap((m) => [m.income, m.expenses]));

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-1">
        <Link href={`/insights?month=${before.slice(0, 7)}`} aria-label="Previous month" className="grid size-11 place-items-center rounded-xl border bg-surface"><ChevronLeft className="size-5" /></Link>
        <h2 className="flex-1 text-center font-serif text-xl">{monthName(month)}</h2>
        {month < thisMonth ? (
          <Link href={`/insights?month=${nextMonthOf(month)}`} aria-label="Next month" className="grid size-11 place-items-center rounded-xl border bg-surface"><ChevronRight className="size-5" /></Link>
        ) : (
          <span aria-hidden className="grid size-11 place-items-center rounded-xl border bg-surface opacity-40"><ChevronRight className="size-5" /></span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([["Income", income], ["Spent", expenses], ["Left", left]] as const).map(([label, amount]) => (
          <div key={label} className="rounded-xl border bg-surface px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-serif text-lg tabular-nums md:text-2xl">{money(amount)}</p>
          </div>
        ))}
      </div>

      <p className="rounded-xl bg-secondary px-4 py-3 text-sm leading-relaxed">
        {where.length === 0
          ? `No spending in ${monthName(month)}.`
          : `You spent ${money(expenses)} in ${monthName(month)}${change ? `, ${change > 0 ? "up" : "down"} ${Math.abs(change)}% from ${monthName(before)}` : ""}. ${Math.round((where[0].amount / expenses) * 100)}% went to ${where[0].name}.${income > 0 ? ` You have ${money(left)} left of ${money(income)} income.` : ""}`}
      </p>

      <div className="grid items-start gap-4 md:grid-cols-[1.1fr_1fr]">
        <section className="rounded-xl border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Where it went</h3>
          {where.length === 0 && <p className="text-sm text-muted-foreground">Nothing to show yet.</p>}
          <div className="grid gap-3">
            {where.map((row) => {
              const was = beforeBy.get(row.name);
              const delta = was === undefined ? null : monthChange(row.amount, was);
              return (
                <div key={row.name}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span>{row.name}</span>
                    <span className="font-semibold tabular-nums">{money(row.amount)} · {Math.round((row.amount / expenses) * 100)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${(row.amount / where[0].amount) * 100}%` }} /></div>
                  {delta !== null && delta !== 0 && (
                    <p className={cn("mt-1 text-xs", delta > 0 ? "text-primary" : "text-muted-foreground")}>{delta > 0 ? "↑" : "↓"} {Math.abs(delta)}% vs {shortName(before)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Last 6 months</h3>
          <div className="flex h-32 items-end gap-2">
            {months.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="flex h-full items-end gap-0.5">
                  <div className="w-2.5 rounded-t-sm bg-foreground md:w-3.5" style={{ height: `${(m.income / tallest) * 100}%` }} title={`Income ${money(m.income)}`} />
                  <div className="w-2.5 rounded-t-sm bg-primary md:w-3.5" style={{ height: `${(m.expenses / tallest) * 100}%` }} title={`Spent ${money(m.expenses)}`} />
                </div>
                <span className={cn("text-[11px] text-muted-foreground", m.month === month && "font-semibold text-foreground")}>{shortName(m.month)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-foreground" />Income</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-primary" />Spent</span>
          </div>
        </section>
      </div>
      <p className="text-xs text-muted-foreground">Moves between your own accounts are left out.</p>
    </div>
  );
}

// The "YYYY-MM" of the month after a "YYYY-MM-01" month.
const nextMonthOf = (month: string) => {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 1)).toISOString().slice(0, 7);
};
