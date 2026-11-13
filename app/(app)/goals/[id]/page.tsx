import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, goals, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { AddMoney, GoalProgress } from "../goal-form";

const toAccounts = alias(accounts, "to_accounts");

export default function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <GoalDetail params={params} />
    </Suspense>
  );
}

async function GoalDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const userId = await getUserId();
  const { goal, balances, transfers } = await withUser(userId, async (tx) => ({
    goal: (await tx
      .select({ id: goals.id, name: goals.name, target: goals.target, deadline: goals.deadline, accountId: goals.accountId, savedBefore: goals.savedBefore, account: accounts.name })
      .from(goals)
      .innerJoin(accounts, eq(goals.accountId, accounts.id))
      .where(and(eq(goals.id, id.data), eq(goals.userId, userId))))[0],
    balances: await loadBalances(tx, userId),
    transfers: await tx
      .select({ id: transactions.id, date: transactions.date, amount: transactions.amount, from: accounts.name, to: toAccounts.name })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(toAccounts, eq(transactions.toAccountId, toAccounts.id))
      .where(eq(transactions.goalId, id.data))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
  }));
  if (!goal) notFound();
  const saved = goal.savedBefore + transfers.reduce((total, transfer) => total + transfer.amount, 0);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <Link href="/goals" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Goals</Link>
      <PageHeader title={goal.name} description={`Deadline ${goal.deadline} · Saved in ${goal.account}`}>
        <AddMoney goal={{ id: goal.id, name: goal.name, accountId: goal.accountId, left: goal.target - saved }} accounts={balances.accounts} today={today} />
      </PageHeader>
      <div className="mb-6 rounded-xl border bg-surface p-4">
        <GoalProgress id={goal.id} name={goal.name} saved={saved} target={goal.target} />
        <div className="mt-2 text-sm tabular-nums">{formatMoney(saved)} of {formatMoney(goal.target)} saved</div>
        {goal.savedBefore > 0 && (
          <div className="text-sm text-muted-foreground tabular-nums">Includes {formatMoney(goal.savedBefore)} saved before tracking</div>
        )}
      </div>
      {transfers.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No money added yet.</p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="pl-4 tabular-nums">{transfer.date}</TableCell>
                  <TableCell>{transfer.from}</TableCell>
                  <TableCell>{transfer.to}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatMoney(transfer.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
