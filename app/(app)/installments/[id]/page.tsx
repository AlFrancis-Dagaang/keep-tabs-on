import { and, count, desc, eq, gte, lte, min } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DateFilter } from "@/components/date-filter";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { SetAside } from "@/components/set-aside";
import { PaymentHistory } from "@/components/payment-history";
import { PixelBar } from "@/components/pixel-bar";
import { accounts, installments, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { installmentSetAside } from "@/lib/set-aside";
import { withUser } from "@/lib/db";
import { formatDate, parseRange, previousDueDate, progressBlocks } from "@/lib/money";
import { getMoney } from "@/lib/settings";

import { PayInstallment } from "../installment-form";

type Search = Promise<{ from?: string; to?: string }>;

export default function InstallmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  return (
    <Suspense fallback={<LoadingBar />}>
      <InstallmentDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function InstallmentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  const money = await getMoney();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const { from, to } = parseRange((await searchParams).from, (await searchParams).to);
  const userId = await getUserId();
  const { installment, balances, first, total, payments } = await withUser(userId, async (tx) => ({
    installment: (await tx
      .select({
        id: installments.id, name: installments.name, monthlyAmount: installments.monthlyAmount, months: installments.months,
        paidBefore: installments.paidBefore, nextDueDate: installments.nextDueDate, dueDay: installments.dueDay, note: installments.note,
        account: accounts.name, setAside: installmentSetAside,
      })
      .from(installments)
      .innerJoin(accounts, eq(installments.accountId, accounts.id))
      .where(and(eq(installments.id, id.data), eq(installments.userId, userId))))[0],
    balances: await loadBalances(tx, userId),
    first: (await tx.select({ date: min(transactions.date) }).from(transactions).where(eq(transactions.installmentId, id.data)))[0]?.date,
    total: (await tx.select({ n: count() }).from(transactions).where(eq(transactions.installmentId, id.data)))[0].n,
    payments: await tx
      .select({ id: transactions.id, date: transactions.date, amount: transactions.amount, note: transactions.note, paidTo: transactions.paidTo, account: accounts.name, accountId: transactions.accountId })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.installmentId, id.data), from ? gte(transactions.date, from) : undefined, to ? lte(transactions.date, to) : undefined))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
  }));
  if (!installment) notFound();
  const paid = installment.paidBefore + total;
  const finished = paid >= installment.months;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <Link href="/installments" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Installments</Link>
      <PageHeader
        title={installment.name}
        description={`${money(installment.monthlyAmount)} × ${installment.months} · due day ${installment.dueDay} · from ${installment.account} · ${finished ? "Finished" : `Next due ${formatDate(installment.nextDueDate)}${installment.nextDueDate < today ? " · Overdue" : ""}`}${installment.note ? ` · ${installment.note}` : ""}`}
      >
        {!finished && <PayInstallment installment={installment} today={today} />}
      </PageHeader>
      <div className="mb-6 rounded-xl border bg-surface p-4">
        <SetAside name={installment.name} amount={installment.setAside} target={installment.monthlyAmount} money={money} nextTarget />
        <PixelBar blocks={progressBlocks(paid, installment.months)} label={`${installment.name}: ${paid} of ${installment.months} paid`} />
        <div className="mt-2 text-sm tabular-nums">{paid} of {installment.months} paid</div>
        {installment.paidBefore > 0 && (
          <div className="text-sm text-muted-foreground">Includes {installment.paidBefore} paid before tracking</div>
        )}
      </div>
      <DateFilter path={`/installments/${installment.id}`} today={today} min={first ?? today} from={from} to={to} />
      {payments.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          {first ? "No payments in this range." : "No payments yet. Record one with Record payment."}
        </p>
      ) : (
        <PaymentHistory
          rows={payments.map((payment) => ({
            ...payment,
            locked: false,
            consequence: `${paid - 1} of ${installment.months} paid.${paid >= installment.months ? "" : ` Next payment goes back to ${formatDate(previousDueDate(installment.nextDueDate, "monthly", installment.dueDay))}.`}`,
          }))}
          money={money}
          accounts={balances.accounts}
        />
      )}
    </>
  );
}
