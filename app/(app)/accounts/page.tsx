import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { AccountForm, DeleteAccount } from "./account-form";

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
  const userId = await getUserId();
  const { accounts: rows } = await withUser(userId, (tx) => loadBalances(tx, userId));

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
        No accounts yet. Add your first account, like your bank, GCash or cash on hand.
      </p>
    );
  }

  const netWorth = rows.reduce((sum, account) => sum + account.balance, 0);
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
          {rows.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="pl-4">{account.name}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(account.balance)}</TableCell>
              <TableCell className="pr-4 text-right whitespace-nowrap">
                <AccountForm account={account} />
                <DeleteAccount account={account} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="pl-4 font-medium">Net worth</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatMoney(netWorth)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
