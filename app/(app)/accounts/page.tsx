import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { netWorth } from "@/lib/money";

import { AccountForm, DeleteAccount } from "./account-form";
import { getMoney } from "@/lib/settings";

export default function AccountsPage() {
  return (
    <>
      <PageHeader title="Accounts" description="Every place your money sits.">
        <AccountForm />
      </PageHeader>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <AccountsTable />
      </Suspense>
    </>
  );
}

async function AccountsTable() {
  const money = await getMoney();
  const userId = await getUserId();
  const { accounts: rows } = await withUser(userId, (tx) => loadBalances(tx, userId));

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
        No accounts yet. Add your first account, like your bank, GCash or cash on hand.
      </p>
    );
  }

  const excluded = rows.filter((account) => !account.includeInNetWorth);
  return (
    <div className="rounded-xl border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* The name's link stretches over the row; the actions cell sits above it so its buttons stay clickable. */}
          {rows.map((account) => (
            <TableRow key={account.id} className="relative">
              <TableCell className="pl-4">
                <Link href={`/accounts/${account.id}`} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{account.name}</Link>
                {!account.includeInNetWorth && <div className="text-sm text-muted-foreground">Not in net worth</div>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{money(account.balance)}</TableCell>
              <TableCell className="relative z-10 pr-4 text-right whitespace-nowrap">
                <AccountForm account={account} />
                <DeleteAccount account={account} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="pl-4 font-medium">
              Net worth
              {excluded.length > 0 && (
                <div className="text-sm font-normal text-muted-foreground">Excludes {excluded.length} {excluded.length === 1 ? "account" : "accounts"}</div>
              )}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{money(netWorth(rows))}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
