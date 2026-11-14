import { and, asc, desc, eq, gt, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PixelBar } from "@/components/pixel-bar";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { accounts, bills, budgetMonths, categories, debts, goals, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { billsDueSoon, budgetFor, directionLabels, manilaMonth, monthTotals, netWorth, progressBlocks } from "@/lib/money";
import { getMoney } from "@/lib/settings";


const toAccounts = alias(accounts, "to_accounts");

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="Your money at a glance." />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  const money = await getMoney();
  const userId = await getUserId();
  // shortcut: the bills, goals and debts queries are copies of their pages' queries; move them to lib/ if a third page needs them.
  const data = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    bills: await tx
      .select({ id: bills.id, name: bills.name, amount: bills.amount, nextDueDate: bills.nextDueDate, paid: sum(transactions.amount).mapWith(Number) })
      .from(bills)
      .leftJoin(transactions, and(eq(transactions.billId, bills.id), gt(transactions.createdAt, bills.cycleStart)))
      .where(eq(bills.userId, userId))
      .groupBy(bills.id)
      .orderBy(asc(bills.nextDueDate), asc(bills.createdAt)),
    goals: await tx
      .select({
        id: goals.id, name: goals.name, target: goals.target,
        saved: sql<number>`${goals.savedBefore} + coalesce(sum(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(goals)
      .leftJoin(transactions, eq(transactions.goalId, goals.id))
      .where(eq(goals.userId, userId))
      .groupBy(goals.id)
      .orderBy(asc(goals.deadline), asc(goals.createdAt))
      .limit(5),
    debts: await tx
      .select({
        id: debts.id, name: debts.name, direction: debts.direction, total: debts.total,
        paid: sql<number>`${debts.paidBefore} + coalesce(sum(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(debts)
      .leftJoin(transactions, eq(transactions.debtId, debts.id))
      .where(eq(debts.userId, userId))
      .groupBy(debts.id)
      .orderBy(asc(debts.deadline), asc(debts.createdAt))
      .limit(5),
    recent: await tx
      .select({
        id: transactions.id, type: transactions.type, amount: transactions.amount, date: transactions.date, payee: transactions.payee,
        account: accounts.name, toAccount: toAccounts.name, category: categories.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(toAccounts, eq(transactions.toAccountId, toAccounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(5),
    categories: await tx.select({ id: categories.id, name: categories.name, kind: categories.kind }).from(categories).where(eq(categories.userId, userId)),
    limits: await tx.select({ categoryId: budgetMonths.categoryId, month: budgetMonths.month, budget: budgetMonths.budget })
      .from(budgetMonths).where(eq(budgetMonths.userId, userId)),
    entries: await tx.select({
      type: transactions.type, amount: transactions.amount, date: transactions.date,
      categoryId: transactions.categoryId, billId: transactions.billId, debtId: transactions.debtId,
    }).from(transactions).where(eq(transactions.userId, userId)),
  }));

  if (data.balances.accounts.length === 0) {
    return (
      <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
        Add your first account in <Link href="/accounts" className="underline">Accounts</Link>, like your bank, GCash or cash on hand. Everything else builds on it.
      </p>
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const month = manilaMonth(new Date());
  const { income, expenses } = monthTotals(month, data.entries);
  const dueSoon = billsDueSoon(data.bills.map((bill) => ({ ...bill, paid: bill.paid ?? 0 })), today);
  const budget = budgetFor(month, data.categories, data.limits, data.entries);

  return (
    <div className="grid gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card href="/accounts" label="Net worth" value={money(netWorth(data.balances.accounts))} />
        <Card href="/activity?type=income" label="Income this month" value={money(income)} />
        <Card href="/activity?type=expense" label="Expenses this month" value={money(expenses)} />
        <Card href="/bills" label="Bills due in 7 days" value={money(dueSoon.left)} note={`${dueSoon.count} ${dueSoon.count === 1 ? "bill" : "bills"}`} />
        <Card
          href="/budget"
          label="Budget left"
          value={budget.budget === 0 ? "—" : money(budget.left)}
          note={budget.budget === 0 ? "No limits set" : `of ${money(budget.budget)}`}
          warn={budget.left < 0}
        />
      </div>

      <Section title="Accounts" href="/accounts">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.balances.accounts.map((account) => (
            <Link key={account.id} href="/accounts" className="rounded-xl border bg-surface p-4 hover:bg-accent">
              <div className="text-sm text-muted-foreground">{account.name}</div>
              <div className="font-serif text-xl tabular-nums">{money(account.balance)}</div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Upcoming bills" href="/bills" empty={data.bills.length === 0 && "No bills yet. Add rent, internet or a subscription in Recurring bills."}>
        <MiniTable>
          {data.bills.slice(0, 5).map((bill) => (
            <TableRow key={bill.id}>
              <TableCell className="pl-4 font-medium">{bill.name}</TableCell>
              <TableCell className="tabular-nums">
                {bill.nextDueDate}
                {bill.nextDueDate < today && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Overdue</span>
                )}
              </TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{money(bill.amount - (bill.paid ?? 0))} left</TableCell>
            </TableRow>
          ))}
        </MiniTable>
      </Section>

      <Section title="Goals" href="/goals" empty={data.goals.length === 0 && "No goals yet. Create one in Goals: an emergency fund, a trip, a new phone."}>
        <MiniTable>
          {data.goals.map((goal) => (
            <ProgressRow key={goal.id} href={`/goals/${goal.id}`} name={goal.name} done={goal.saved} total={goal.target} verb="saved" />
          ))}
        </MiniTable>
      </Section>

      <Section title="Debts" href="/debts" empty={data.debts.length === 0 && "No debts. Add money you owe, or money owed to you, in Debts."}>
        <MiniTable>
          {data.debts.map((debt) => (
            <ProgressRow key={debt.id} href={`/debts/${debt.id}`} name={debt.name} tag={directionLabels[debt.direction]} done={debt.paid} total={debt.total} verb={debt.direction === "owed" ? "received" : "paid"} />
          ))}
        </MiniTable>
      </Section>

      <Section title="Recent activity" href="/activity" empty={data.recent.length === 0 && "No entries yet. Log what comes in and goes out with Add entry in Activity."}>
        <MiniTable>
          {data.recent.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-4 tabular-nums">{row.date}</TableCell>
              <TableCell>
                {row.payee ?? row.category ?? <span className="text-muted-foreground">—</span>}
                <div className="text-sm text-muted-foreground">{row.type === "transfer" ? `${row.account} → ${row.toAccount}` : row.account}</div>
              </TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{{ income: "+", expense: "−", transfer: "" }[row.type]}{money(row.amount)}</TableCell>
            </TableRow>
          ))}
        </MiniTable>
      </Section>
    </div>
  );
}

function Card({ href, label, value, note, warn = false }: { href: string; label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <Link href={href} className="rounded-xl border bg-surface p-4 hover:bg-accent">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`font-serif text-xl tabular-nums ${warn ? "text-destructive" : ""}`}>{value}</div>
      {note && <div className="text-sm text-muted-foreground">{note}</div>}
    </Link>
  );
}

function Section({ title, href, empty, children }: { title: string; href: string; empty?: string | false; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl">{title}</h2>
        <Link href={href} className="text-sm text-muted-foreground underline-offset-4 hover:underline">View all</Link>
      </div>
      {empty ? <p className="rounded-xl border bg-surface p-6 text-muted-foreground">{empty}</p> : children}
    </section>
  );
}

function MiniTable({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-surface">
      <Table>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

// The name's link stretches over the row, like the Goals and Debts lists.
async function ProgressRow({ href, name, tag, done, total, verb }: { href: string; name: string; tag?: string; done: number; total: number; verb: string }) {
  const money = await getMoney();
  return (
    <TableRow className="relative">
      <TableCell className="pl-4">
        <Link href={href} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{name}</Link>
        {tag && <div className="text-sm text-muted-foreground">{tag}</div>}
      </TableCell>
      <TableCell className="pr-4">
        <PixelBar blocks={progressBlocks(done, total)} label={`${name}: ${money(done)} of ${money(total)} ${verb}`} />
        <div className="mt-1 text-sm text-muted-foreground tabular-nums">{money(done)} of {money(total)} {verb}</div>
      </TableCell>
    </TableRow>
  );
}
