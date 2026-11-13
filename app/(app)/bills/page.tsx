import { and, asc, eq, gt, sum } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bills, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { repeatLabels } from "@/lib/money";

import { BillForm, BillProgress, DeleteBill, PayBill } from "./bill-form";
import { getMoney } from "@/lib/settings";

export default function BillsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
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
        id: bills.id, name: bills.name, amount: bills.amount, nextDueDate: bills.nextDueDate, repeat: bills.repeat,
        paid: sum(transactions.amount).mapWith(Number),
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
        <div className="rounded-xl border bg-surface">
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
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-sm text-muted-foreground tabular-nums">{money(row.amount)}</div>
                    </TableCell>
                    <TableCell>{repeatLabels[row.repeat]}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.nextDueDate}
                      {row.nextDueDate < today && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Overdue</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <BillProgress id={row.id} name={row.name} paid={paid} amount={row.amount} />
                      <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                        {money(paid)} of {money(row.amount)}
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right whitespace-nowrap">
                      <PayBill bill={{ id: row.id, name: row.name, left: row.amount - paid }} accounts={balances.accounts} today={today} />
                      <BillForm today={today} bill={row} />
                      <DeleteBill id={row.id} name={row.name} />
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
