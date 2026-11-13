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
import { formatMoney } from "@/lib/money";
import { DebtProgress, PayDebt } from "../debt-form";

export default function DebtPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <DebtDetail params={params} />
    </Suspense>
  );
}

async function DebtDetail({ params }: { params: Promise<{ id: string }> }) {
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
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <Link href="/debts" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Debts</Link>
      <PageHeader title={debt.name} description={`Deadline ${debt.deadline}`}>
        <PayDebt debt={{ id: debt.id, name: debt.name, left: debt.total - paid }} accounts={balances.accounts} today={today} />
      </PageHeader>
      <div className="mb-6 rounded-xl border bg-surface p-4">
        <DebtProgress id={debt.id} name={debt.name} paid={paid} total={debt.total} />
        <div className="mt-2 text-sm tabular-nums">{formatMoney(paid)} of {formatMoney(debt.total)} paid</div>
        {debt.paidBefore > 0 && (
          <div className="text-sm text-muted-foreground tabular-nums">Includes {formatMoney(debt.paidBefore)} paid before tracking</div>
        )}
      </div>
      {payments.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No payments yet.</p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="pl-4 tabular-nums">{payment.date}</TableCell>
                  <TableCell>{payment.account}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatMoney(payment.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
