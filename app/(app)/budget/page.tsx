import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PixelBar } from "@/components/pixel-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { budgetMonths, categories, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { budgetFor, budgetHistory, formatMoney, manilaMonth, progressBlocks } from "@/lib/money";
import { LimitForm } from "./limit-form";

export default function BudgetPage() {
  return (
    <>
      <PageHeader title="Budget" description="This month's spending against your limits." />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Budget />
      </Suspense>
    </>
  );
}

type Month = ReturnType<typeof budgetFor>;

const monthName = (month: string) => new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(month));

async function Budget() {
  const userId = await getUserId();
  // shortcut: loads every limit and expense per request, switch to SQL sums per month when Activity passes a few thousand rows.
  const { userCategories, limits, expenses } = await withUser(userId, async (tx) => ({
    userCategories: await tx.select({ id: categories.id, name: categories.name, kind: categories.kind }).from(categories)
      .where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
    limits: await tx.select({ categoryId: budgetMonths.categoryId, month: budgetMonths.month, budget: budgetMonths.budget })
      .from(budgetMonths).where(eq(budgetMonths.userId, userId)),
    expenses: await tx.select({
      type: transactions.type, amount: transactions.amount, date: transactions.date,
      categoryId: transactions.categoryId, billId: transactions.billId, debtId: transactions.debtId,
    }).from(transactions).where(eq(transactions.userId, userId)),
  }));
  if (!userCategories.some((category) => category.kind === "spending")) {
    return (
      <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
        Add a spending category first in <Link href="/settings" className="underline">Settings</Link>, then set a monthly limit on it.
      </p>
    );
  }

  const thisMonth = manilaMonth(new Date());
  const current = budgetFor(thisMonth, userCategories, limits, expenses);
  const history = budgetHistory(thisMonth, userCategories, limits, expenses);

  return (
    <div className="grid gap-10">
      <section>
        <h2 className="mb-3 font-serif text-xl">{monthName(thisMonth)}</h2>
        <Totals month={current} leftLabel="Left" />
        {current.budget === 0 && <p className="mb-4 text-muted-foreground">Set a limit on a category to start your budget.</p>}
        <CategoryTable month={current} editable />
      </section>
      <section>
        <h2 className="mb-3 font-serif text-xl">History</h2>
        {history.length === 0 ? (
          <p className="rounded-xl border bg-surface p-6 text-muted-foreground">Past months show here once a month ends.</p>
        ) : (
          <div className="grid gap-8">
            {history.map((month) => (
              <div key={month.month}>
                <h3 className="mb-2 font-serif text-lg">{monthName(month.month)}</h3>
                <Totals month={month} leftLabel="Saved" />
                <CategoryTable month={month} leftLabel="Saved" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Totals({ month, leftLabel }: { month: Month; leftLabel: string }) {
  return (
    <dl className="mb-4 grid grid-cols-3 gap-4 rounded-xl border bg-surface p-4">
      {([["Budget", month.budget], ["Spent", month.spent], [leftLabel, month.left]] as const).map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className={`font-serif text-2xl tabular-nums ${value < 0 ? "text-destructive" : ""}`}>{formatMoney(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function CategoryTable({ month, editable = false, leftLabel = "Left" }: { month: Month; editable?: boolean; leftLabel?: string }) {
  return (
    <div className="rounded-xl border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Category</TableHead>
            <TableHead>Spent</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className={editable ? "text-right" : "pr-4 text-right"}>{leftLabel}</TableHead>
            {editable && <TableHead className="w-0" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {month.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-4 font-medium">{row.name}</TableCell>
              <TableCell>
                {row.budget !== null && (
                  <PixelBar
                    blocks={progressBlocks(row.spent, row.budget)}
                    over={row.spent > row.budget}
                    label={`${row.name}: ${formatMoney(row.spent)} of ${formatMoney(row.budget)} spent`}
                  />
                )}
                <div className="mt-1 text-sm tabular-nums">{formatMoney(row.spent)}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{row.budget === null ? "No limit" : formatMoney(row.budget)}</TableCell>
              <TableCell className={`text-right tabular-nums ${editable ? "" : "pr-4"} ${row.left !== null && row.left < 0 ? "text-destructive" : ""}`}>
                {row.left === null ? "—" : formatMoney(row.left)}
              </TableCell>
              {editable && (
                <TableCell className="pr-4 text-right whitespace-nowrap">
                  <LimitForm category={row} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
