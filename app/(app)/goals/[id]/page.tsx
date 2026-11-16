import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DeleteEntry, EditPayment } from "@/app/(app)/activity/entry-form";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { RowActions, RowMenu } from "@/components/row-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, goals, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";

import { AddMoney, GoalProgress } from "../goal-form";
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
  const { goal, balances, transfers } = await withUser(userId, async (tx) => ({
    goal: (await tx
      .select({ id: goals.id, name: goals.name, target: goals.target, deadline: goals.deadline, accountId: goals.accountId, savedBefore: goals.savedBefore, account: accounts.name })
      .from(goals)
      .innerJoin(accounts, eq(goals.accountId, accounts.id))
      .where(and(eq(goals.id, id.data), eq(goals.userId, userId))))[0],
    balances: await loadBalances(tx, userId),
    transfers: await tx
      .select({ id: transactions.id, date: transactions.date, amount: transactions.amount, note: transactions.note, from: accounts.name, fromId: transactions.accountId, to: toAccounts.name })
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
      <PageHeader title={goal.name} description={`Deadline ${formatDate(goal.deadline)} · Saved in ${goal.account}`}>
        <AddMoney goal={{ id: goal.id, name: goal.name, accountId: goal.accountId, left: goal.target - saved }} accounts={balances.accounts} today={today} />
      </PageHeader>
      <div className="mb-6 rounded-xl border bg-surface p-4">
        <GoalProgress id={goal.id} name={goal.name} saved={saved} target={goal.target} />
        <div className="mt-2 text-sm tabular-nums">{money(saved)} of {money(goal.target)} saved</div>
        {goal.savedBefore > 0 && (
          <div className="text-sm text-muted-foreground tabular-nums">Includes {money(goal.savedBefore)} saved before tracking</div>
        )}
      </div>
      {transfers.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No money added yet. Move some in with Add money.</p>
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
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="pl-4 tabular-nums">
                    {formatDate(transfer.date)}
                    <RowMenu name={`transfer on ${formatDate(transfer.date)}`} labels={["Edit", "Remove"]} />
                  </TableCell>
                  <TableCell data-label="From">{transfer.from}</TableCell>
                  <TableCell data-label="To">{transfer.to}</TableCell>
                  <TableCell data-label={transfer.note ? "Note" : undefined} className="text-muted-foreground">{transfer.note}</TableCell>
                  <TableCell data-card="end" className="text-right tabular-nums">{money(transfer.amount)}</TableCell>
                  <TableCell data-card="actions" className="pr-4 text-right max-md:hidden">
                    <RowActions
                      items={[
                        // The goal's own account can't be the one money comes from.
                        { label: "Edit", node: <EditPayment payment={{ ...transfer, accountId: transfer.fromId }} accounts={balances.accounts.filter((account) => account.id !== goal.accountId)} accountLabel="From" /> },
                        {
                          label: "Remove",
                          node: <DeleteEntry id={transfer.id} what="transfer" label={`${formatDate(transfer.date)} · ${transfer.from} → ${transfer.to} · ${money(transfer.amount)}`} consequence={`${money(transfer.amount)} comes out of the goal.`} />,
                        },
                      ]}
                    />
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
