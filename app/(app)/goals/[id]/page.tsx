import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, goals, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { goalSetAside } from "@/lib/set-aside";
import { withUser } from "@/lib/db";

import { GoalProgress } from "../goal-form";
import { formatDate } from "@/lib/money";
import { getMoney } from "@/lib/settings";

const toAccounts = alias(accounts, "to_accounts");

export default function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingBar />}>
      <GoalDetail params={params} />
    </Suspense>
  );
}

async function GoalDetail({ params }: { params: Promise<{ id: string }> }) {
  const money = await getMoney();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const userId = await getUserId();
  const { goal, transfers } = await withUser(userId, async (tx) => ({
    goal: (await tx
      .select({ id: goals.id, name: goals.name, target: goals.target, deadline: goals.deadline, saved: goalSetAside })
      .from(goals)
      .where(and(eq(goals.id, id.data), eq(goals.userId, userId))))[0],
    transfers: await tx
      .select({ id: transactions.id, date: transactions.date, amount: transactions.amount, note: transactions.note, from: accounts.name, to: sql<string>`coalesce(${toAccounts.name}, ${transactions.toName})` })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(toAccounts, eq(transactions.toAccountId, toAccounts.id))
      .where(eq(transactions.setAsideGoalId, id.data))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
  }));
  if (!goal) notFound();

  return (
    <>
      <Link href="/goals" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Goals</Link>
      <PageHeader title={goal.name} description={`Deadline ${formatDate(goal.deadline)}`} />
      <div className="mb-6 rounded-xl border bg-surface p-4">
        <GoalProgress name={goal.name} saved={goal.saved} target={goal.target} />
        <div className="mt-2 text-sm tabular-nums">{money(goal.saved)} of {money(goal.target)} saved</div>
      </div>
      {transfers.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">Nothing yet. Make a transfer in Activity and pick this goal under For.</p>
      ) : (
        <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="pl-4 tabular-nums">
                    {formatDate(transfer.date)}
                  </TableCell>
                  <TableCell data-label="From">{transfer.from}</TableCell>
                  <TableCell data-label="To">{transfer.to}</TableCell>
                  <TableCell data-label={transfer.note ? "Note" : undefined} className="text-muted-foreground">{transfer.note}</TableCell>
                  <TableCell data-card="end" className="text-right tabular-nums">{money(transfer.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
