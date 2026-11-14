import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, debts, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { directionLabels } from "@/lib/money";

import { DebtProgress, PayDebt } from "../debt-form";
import { getMoney } from "@/lib/settings";

export default function DebtPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <DebtDetail params={params} />
    </Suspense>
  );
}

async function DebtDetail({ params }: { params: Promise<{ id: string }> }) {
  const money = await getMoney();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const userId = await getUserId();
  const { debt, balances, payments } = await withUser(userId, async (tx) => ({
    debt: (await tx.select().from(debts).where(and(eq(debts.id, id.data), eq(debts.userId, userId))))[0],
    balances: await loadBalances(tx, userId),
    payments: await tx
      .select({ id: transactions.id, date: transactions.date, amount: transactions.amount, account: accounts.name })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.debtId, id.data))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
  }));
  if (!debt) notFound();
  const paid = debt.paidBefore + payments.reduce((total, payment) => total + payment.amount, 0);
  const owed = debt.direction === "owed";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <Link href="/debts" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Debts</Link>
      <PageHeader title={debt.name} description={`${directionLabels[debt.direction]} · Deadline ${debt.deadline}`}>
        <PayDebt debt={{ id: debt.id, name: debt.name, left: debt.total - paid, direction: debt.direction }} accounts={balances.accounts} today={today} />
      </PageHeader>
      <div className="mb-6 rounded-xl border bg-surface p-4">
        <DebtProgress id={debt.id} name={debt.name} paid={paid} total={debt.total} direction={debt.direction} />
        <div className="mt-2 text-sm tabular-nums">{money(paid)} of {money(debt.total)} {owed ? "received" : "paid"}</div>
        {debt.paidBefore > 0 && (
          <div className="text-sm text-muted-foreground tabular-nums">Includes {money(debt.paidBefore)} {owed ? "received" : "paid"} before tracking</div>
        )}
      </div>
      {payments.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">{owed ? "No receipts yet. Record one with Record receipt." : "No payments yet. Record one with Record payment."}</p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>{owed ? "To" : "From"}</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="pl-4 tabular-nums">{payment.date}</TableCell>
                  <TableCell>{payment.account}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{money(payment.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
