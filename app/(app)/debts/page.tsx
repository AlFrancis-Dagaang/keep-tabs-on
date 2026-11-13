import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { debts, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";

import { DebtForm, DebtProgress, DeleteDebt, PayDebt } from "./debt-form";
import { getMoney } from "@/lib/settings";

export default function DebtsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Debts />
    </Suspense>
  );
}

async function Debts() {
  const money = await getMoney();
  const userId = await getUserId();
  const { balances, rows } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    rows: await tx
      .select({
        id: debts.id, name: debts.name, total: debts.total, deadline: debts.deadline, paidBefore: debts.paidBefore,
        paid: sql<number>`${debts.paidBefore} + coalesce(sum(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(debts)
      .leftJoin(transactions, eq(transactions.debtId, debts.id))
      .where(eq(debts.userId, userId))
      .groupBy(debts.id)
      .orderBy(asc(debts.deadline), asc(debts.createdAt)),
  }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <PageHeader title="Debts" description="What you owe and how much is left.">
        {balances.accounts.length > 0 && <DebtForm today={today} />}
      </PageHeader>
      {balances.accounts.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          Add an account first in <Link href="/accounts" className="underline">Accounts</Link>, then track the debts you pay from it.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No debts yet. Add a credit card, loan or money you owe a friend.</p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Debt</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* The name's link stretches over the row; the actions cell sits above it so its buttons stay clickable. */}
              {rows.map((row) => (
                <TableRow key={row.id} className="relative">
                  <TableCell className="pl-4">
                    <Link href={`/debts/${row.id}`} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{row.name}</Link>
                    <div className="text-sm text-muted-foreground tabular-nums">{money(row.total)}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.deadline}</TableCell>
                  <TableCell>
                    <DebtProgress id={row.id} name={row.name} paid={row.paid} total={row.total} />
                    <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                      {money(row.paid)} of {money(row.total)}
                    </div>
                  </TableCell>
                  <TableCell className="relative z-10 pr-4 text-right whitespace-nowrap">
                    <PayDebt debt={{ id: row.id, name: row.name, left: row.total - row.paid }} accounts={balances.accounts} today={today} />
                    <DebtForm today={today} debt={row} />
                    <DeleteDebt id={row.id} name={row.name} />
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
