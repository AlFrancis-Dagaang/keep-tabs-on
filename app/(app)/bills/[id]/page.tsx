import { and, desc, eq, gt, gte, lte, min, sql, sum } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DateFilter } from "@/components/date-filter";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { SetAside } from "@/components/set-aside";
import { PaymentHistory } from "@/components/payment-history";
import { accounts, bills, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { billSetAside } from "@/lib/set-aside";
import { withUser } from "@/lib/db";
import { formatDate, parseRange, previousDueDate, repeatLabels } from "@/lib/money";
import { getMoney } from "@/lib/settings";

import { BillProgress, PayBill } from "../bill-form";

type Search = Promise<{ from?: string; to?: string }>;

export default function BillPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  return (
    <Suspense fallback={<LoadingBar />}>
      <BillDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BillDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  const money = await getMoney();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const { from, to } = parseRange((await searchParams).from, (await searchParams).to);
  const userId = await getUserId();
  const { bill, balances, first, payments } = await withUser(userId, async (tx) => ({
    // The cycle sum is the list's own query for one bill, compared in SQL.
    bill: (await tx
      .select({
        id: bills.id, name: bills.name, amount: bills.amount, nextDueDate: bills.nextDueDate, dueDay: bills.dueDay, repeat: bills.repeat, note: bills.note,
        paid: sum(transactions.amount).mapWith(Number), setAside: billSetAside,
      })
      .from(bills)
      .leftJoin(transactions, and(eq(transactions.billId, bills.id), gt(transactions.createdAt, bills.cycleStart)))
      .where(and(eq(bills.id, id.data), eq(bills.userId, userId)))
      .groupBy(bills.id))[0],
    balances: await loadBalances(tx, userId),
    first: (await tx.select({ date: min(transactions.date) }).from(transactions).where(eq(transactions.billId, id.data)))[0]?.date,
    payments: await tx
      .select({
        id: transactions.id, date: transactions.date, amount: transactions.amount, note: transactions.note, paidTo: transactions.paidTo, account: accounts.name, accountId: transactions.accountId,
        // Compared in SQL: the payment that closed the last cycle has the same created_at as cycle_start.
        open: sql<boolean>`${transactions.createdAt} > ${bills.cycleStart}`, closing: sql<boolean>`${transactions.createdAt} = ${bills.cycleStart}`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(bills, eq(transactions.billId, bills.id))
      .where(and(eq(transactions.billId, id.data), from ? gte(transactions.date, from) : undefined, to ? lte(transactions.date, to) : undefined))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
  }));
  if (!bill) notFound();
  const paid = bill.paid ?? 0;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <Link href="/bills" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Recurring bills</Link>
      <PageHeader title={bill.name} description={`${repeatLabels[bill.repeat]} · Next due ${formatDate(bill.nextDueDate)}${bill.nextDueDate < today ? " · Overdue" : ""}${bill.note ? ` · ${bill.note}` : ""}`}>
        {balances.accounts.length > 0 && <PayBill bill={{ id: bill.id, name: bill.name, left: bill.amount - paid }} accounts={balances.accounts} today={today} />}
      </PageHeader>
      <div className="mb-6 rounded-xl border bg-surface p-4">
        <SetAside name={bill.name} amount={bill.setAside} target={bill.amount} money={money} />
        <BillProgress id={bill.id} name={bill.name} paid={paid} amount={bill.amount} />
        <div className="mt-2 text-sm tabular-nums">{money(paid)} of {money(bill.amount)} this cycle</div>
      </div>
      <DateFilter path={`/bills/${bill.id}`} today={today} min={first ?? today} from={from} to={to} />
      {payments.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          {first ? "No payments in this range." : "No payments yet. Record one with Record payment."}
        </p>
      ) : (
        <PaymentHistory
          rows={payments.map((payment) => ({
            ...payment,
            locked: !payment.open,
            consequence: payment.open
              ? "This cycle's total goes down."
              : payment.closing
                ? `${bill.name}'s next payment goes back to ${formatDate(previousDueDate(bill.nextDueDate, bill.repeat, bill.dueDay))}.`
                : "The due date doesn't change.",
          }))}
          money={money}
          accounts={balances.accounts}
        />
      )}
    </>
  );
}
