import { and, asc, eq, gt, sum } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { SetAside } from "@/components/set-aside";
import { RowActions } from "@/components/row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bills, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { billSetAside } from "@/lib/set-aside";
import { withUser } from "@/lib/db";
import { formatDate, repeatLabels } from "@/lib/money";

import { BillForm, BillProgress, DeleteBill, PayBill } from "./bill-form";
import { getMoney } from "@/lib/settings";

export default function BillsPage() {
  return (
    <Suspense fallback={<LoadingBar />}>
      <Bills />
    </Suspense>
  );
}

async function Bills() {
  const money = await getMoney();
  const userId = await getUserId();
  const { balances, rows } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    rows: await tx
      .select({
        id: bills.id, name: bills.name, amount: bills.amount, nextDueDate: bills.nextDueDate, repeat: bills.repeat, note: bills.note,
        paid: sum(transactions.amount).mapWith(Number), setAside: billSetAside,
      })
      .from(bills)
      .leftJoin(transactions, and(eq(transactions.billId, bills.id), gt(transactions.createdAt, bills.cycleStart)))
      .where(eq(bills.userId, userId))
      .groupBy(bills.id)
      .orderBy(asc(bills.nextDueDate), asc(bills.createdAt)),
  }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <PageHeader title="Recurring bills" description="What's due, and what's paid this cycle.">
        {balances.accounts.length > 0 && <BillForm today={today} />}
      </PageHeader>
      {balances.accounts.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          Add an account first in <Link href="/accounts" className="underline">Accounts</Link>, then track the bills you pay from it.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">No bills yet. Add rent, internet or a subscription.</p>
      ) : (
        <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Bill</TableHead>
                <TableHead>Repeats</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>This cycle</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const paid = row.paid ?? 0;
                return (
                  <TableRow key={row.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/bills/${row.id}`} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{row.name}</Link>
                      <div className="text-sm text-muted-foreground tabular-nums">{money(row.amount)}</div>
                      <div className="text-sm text-muted-foreground">{row.note}</div>
                    </TableCell>
                    <TableCell data-label="Repeats">{repeatLabels[row.repeat]}</TableCell>
                    <TableCell data-label="Next due" className="tabular-nums">
                      {formatDate(row.nextDueDate)}
                      {row.nextDueDate < today && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Overdue</span>
                      )}
                    </TableCell>
                    <TableCell data-label="This cycle">
                      <SetAside name={row.name} amount={row.setAside} target={row.amount} money={money} />
                      <BillProgress id={row.id} name={row.name} paid={paid} amount={row.amount} />
                      <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                        {money(paid)} of {money(row.amount)}
                      </div>
                    </TableCell>
                    <TableCell data-card="actions" className="relative z-10 pr-4 text-right whitespace-nowrap">
                      <PayBill bill={{ id: row.id, name: row.name, left: row.amount - paid }} accounts={balances.accounts} today={today} />
                      <RowActions items={[{ label: "Edit", node: <BillForm today={today} bill={row} /> }, { label: "Remove", node: <DeleteBill id={row.id} name={row.name} /> }]} />
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
