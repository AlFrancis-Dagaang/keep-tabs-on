import { asc, count, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PixelBar } from "@/components/pixel-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, installments, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { progressBlocks } from "@/lib/money";
import { getMoney } from "@/lib/settings";

import { DeleteInstallment, InstallmentForm, PayInstallment } from "./installment-form";

export default function InstallmentsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Installments />
    </Suspense>
  );
}

async function Installments() {
  const money = await getMoney();
  const userId = await getUserId();
  const { balances, rows } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    rows: await tx
      .select({
        id: installments.id, name: installments.name, monthlyAmount: installments.monthlyAmount, months: installments.months,
        paidBefore: installments.paidBefore, nextDueDate: installments.nextDueDate, accountId: installments.accountId, note: installments.note,
        account: accounts.name,
        paid: sql<number>`${installments.paidBefore} + ${count(transactions.id)}`.mapWith(Number),
      })
      .from(installments)
      .innerJoin(accounts, eq(installments.accountId, accounts.id))
      .leftJoin(transactions, eq(transactions.installmentId, installments.id))
      .where(eq(installments.userId, userId))
      .groupBy(installments.id, accounts.name)
      .orderBy(asc(installments.nextDueDate), asc(installments.createdAt)),
  }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <PageHeader title="Installments" description="Purchases you pay off month by month.">
        {balances.accounts.length > 0 && <InstallmentForm today={today} accounts={balances.accounts} />}
      </PageHeader>
      {balances.accounts.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          Add an account first in <Link href="/accounts" className="underline">Accounts</Link>, then track the installments you pay from it.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No installments yet. Add a phone, an appliance or anything you pay in monthly parts.</p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Installment</TableHead>
                <TableHead>Paid from</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const finished = row.paid >= row.months;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-sm text-muted-foreground tabular-nums">{money(row.monthlyAmount)} × {row.months} = {money(row.monthlyAmount * row.months)}</div>
                      <div className="text-sm text-muted-foreground">{row.note}</div>
                    </TableCell>
                    <TableCell>{row.account}</TableCell>
                    <TableCell className="tabular-nums">
                      {finished ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Finished</span>
                      ) : (
                        <>
                          {row.nextDueDate}
                          {row.nextDueDate < today && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Overdue</span>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <PixelBar blocks={progressBlocks(row.paid, row.months)} label={`${row.name}: ${row.paid} of ${row.months} paid`} />
                      <div className="mt-1 text-sm text-muted-foreground tabular-nums">{row.paid} of {row.months} paid</div>
                    </TableCell>
                    <TableCell className="pr-4 text-right whitespace-nowrap">
                      {!finished && <PayInstallment installment={row} today={today} />}
                      <InstallmentForm today={today} accounts={balances.accounts} installment={row} />
                      <DeleteInstallment id={row.id} name={row.name} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
