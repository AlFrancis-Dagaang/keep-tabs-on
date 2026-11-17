import { asc, count, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { SetAside } from "@/components/set-aside";
import { RowActions } from "@/components/row-actions";
import { PixelBar } from "@/components/pixel-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, installments, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { installmentSetAside } from "@/lib/set-aside";
import { withUser } from "@/lib/db";
import { formatDate, progressBlocks } from "@/lib/money";
import { getMoney } from "@/lib/settings";

import { DeleteInstallment, InstallmentForm, PayInstallment } from "./installment-form";

export default function InstallmentsPage() {
  return (
    <Suspense fallback={<LoadingBar />}>
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
        paid: sql<number>`${installments.paidBefore} + ${count(transactions.id)}`.mapWith(Number), setAside: installmentSetAside,
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
        <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
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
                  <TableRow key={row.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/installments/${row.id}`} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{row.name}</Link>
                      <div className="text-sm text-muted-foreground tabular-nums">{money(row.monthlyAmount)} × {row.months} = {money(row.monthlyAmount * row.months)}</div>
                      <div className="text-sm text-muted-foreground">{row.note}</div>
                    </TableCell>
                    <TableCell data-label="Paid from">{row.account}</TableCell>
                    <TableCell data-label="Next due" className="tabular-nums">
                      {finished ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Finished</span>
                      ) : (
                        <>
                          {formatDate(row.nextDueDate)}
                          {row.nextDueDate < today && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Overdue</span>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell data-label="Progress">
                      <SetAside name={row.name} amount={row.setAside} target={row.monthlyAmount} money={money} nextTarget />
                      <PixelBar blocks={progressBlocks(row.paid, row.months)} label={`${row.name}: ${row.paid} of ${row.months} paid`} />
                      <div className="mt-1 text-sm text-muted-foreground tabular-nums">{row.paid} of {row.months} paid</div>
                    </TableCell>
                    <TableCell data-card="actions" className={`relative z-10 pr-4 text-right whitespace-nowrap${finished ? "" : ""}`}>
                      {!finished && <PayInstallment installment={row} today={today} />}
                      <RowActions items={[{ label: "Edit", node: <InstallmentForm today={today} accounts={balances.accounts} installment={row} /> }, { label: "Remove", node: <DeleteInstallment id={row.id} name={row.name} /> }]} />
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
