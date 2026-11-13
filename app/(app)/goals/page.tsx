import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, goals, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";

import { AddMoney, DeleteGoal, GoalForm, GoalProgress } from "./goal-form";
import { getMoney } from "@/lib/settings";

export default function GoalsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Goals />
    </Suspense>
  );
}

async function Goals() {
  const money = await getMoney();
  const userId = await getUserId();
  const { balances, rows } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    rows: await tx
      .select({
        id: goals.id, name: goals.name, target: goals.target, deadline: goals.deadline, accountId: goals.accountId,
        savedBefore: goals.savedBefore, account: accounts.name,
        saved: sql<number>`${goals.savedBefore} + coalesce(sum(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(goals)
      .innerJoin(accounts, eq(goals.accountId, accounts.id))
      .leftJoin(transactions, eq(transactions.goalId, goals.id))
      .where(eq(goals.userId, userId))
      .groupBy(goals.id, accounts.name)
      .orderBy(asc(goals.deadline), asc(goals.createdAt)),
  }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <PageHeader title="Goals" description="What you're saving for.">
        {balances.accounts.length > 0 && <GoalForm today={today} accounts={balances.accounts} />}
      </PageHeader>
      {balances.accounts.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          Add an account first in <Link href="/accounts" className="underline">Accounts</Link>, then save toward goals in it.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No goals yet. Create one: an emergency fund, a trip, a new phone.</p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Goal</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Saved in</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* The name's link stretches over the row; the actions cell sits above it so its buttons stay clickable. */}
              {rows.map((row) => (
                <TableRow key={row.id} className="relative">
                  <TableCell className="pl-4">
                    <Link href={`/goals/${row.id}`} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{row.name}</Link>
                    <div className="text-sm text-muted-foreground tabular-nums">{money(row.target)}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.deadline}</TableCell>
                  <TableCell>{row.account}</TableCell>
                  <TableCell>
                    <GoalProgress id={row.id} name={row.name} saved={row.saved} target={row.target} />
                    <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                      {money(row.saved)} of {money(row.target)}
                    </div>
                  </TableCell>
                  <TableCell className="relative z-10 pr-4 text-right whitespace-nowrap">
                    <AddMoney goal={{ id: row.id, name: row.name, accountId: row.accountId, left: row.target - row.saved }} accounts={balances.accounts} today={today} />
                    <GoalForm today={today} accounts={balances.accounts} goal={row} />
                    <DeleteGoal id={row.id} name={row.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
