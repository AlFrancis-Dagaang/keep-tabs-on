import Link from "next/link";
import { Suspense } from "react";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { loadSetAsideRows } from "@/lib/set-aside";
import { getMoney } from "@/lib/settings";

const kinds = { bill: "Bill", debt: "Debt", installment: "Installment", goal: "Goal" };

export default function SetAsidePage() {
  return (
    <>
      <PageHeader title="Set aside" description="Money parked for your bills, debts, installments and goals, right now." />
      <Suspense fallback={<LoadingBar />}>
        <SetAside />
      </Suspense>
    </>
  );
}

async function SetAside() {
  const money = await getMoney();
  const userId = await getUserId();
  const { rows, total } = await withUser(userId, (tx) => loadSetAsideRows(tx, userId));

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
        Nothing set aside yet. Make a transfer in <Link href="/activity" className="underline">Activity</Link> and pick a bill, debt, installment or goal under For.
      </p>
    );
  }
  return (
    <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Kind</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Set aside</TableHead>
            <TableHead className="text-right">Out of</TableHead>
            <TableHead className="pr-4 text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.kind}:${row.id}`}>
              {/* Desktop reads Kind, Item; a card's title is its first cell, so that cell shows the name with kind and "out of" under it below md. */}
              <TableCell className="pl-4">
                <span className="md:hidden">
                  <span className="font-medium">{row.name}</span>
                  <span className="block text-sm text-muted-foreground tabular-nums">{kinds[row.kind]} · out of {money(row.outOf)}</span>
                </span>
                <span className="max-md:hidden">{kinds[row.kind]}</span>
              </TableCell>
              <TableCell className="max-md:hidden">{row.name}</TableCell>
              <TableCell data-card="end" className="text-right tabular-nums">{money(row.setAside)}</TableCell>
              <TableCell className="text-right tabular-nums max-md:hidden">{money(row.outOf)}</TableCell>
              <TableCell className="pr-4 text-right">
                {row.ready ? (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground">
                    {row.full ? "Full" : "Ready to pay"}
                  </span>
                ) : (
                  <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{money(row.toGo)} to go</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="pl-4">Total</TableCell>
            <TableCell className="text-right tabular-nums">{money(total)}</TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
