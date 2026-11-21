import Link from "next/link";
import { Suspense } from "react";
import { AccountIcon } from "@/components/account-icon";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { RowActions } from "@/components/row-actions";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { cardColor } from "@/lib/account-icons";
import { netWorth } from "@/lib/money";

import { AccountMenu } from "./account-menu";
import { AccountForm, DeleteAccount } from "./account-form";
import { getMoney } from "@/lib/settings";

export default function AccountsPage() {
  return (
    <>
      <PageHeader title="Accounts" description="Every place your money sits.">
        <AccountForm />
      </PageHeader>
      <Suspense fallback={<LoadingBar />}>
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
  const excludes = excluded.length > 0 && `Excludes ${excluded.length} ${excluded.length === 1 ? "account" : "accounts"}`;
  return (
    <>
    {/* Phones get tinted cards; from md up it is the table below. */}
    <div className="grid gap-2.5 md:hidden">
      <div className="rounded-2xl border bg-surface px-4 py-4">
        <div className="text-sm text-muted-foreground">Net worth</div>
        <div className="font-serif text-4xl font-medium tabular-nums">{money(netWorth(rows))}</div>
        {excludes && <div className="text-xs text-muted-foreground">{excludes}</div>}
      </div>
      {rows.map((account) => (
        <div key={account.id} className={`relative flex min-h-28 flex-col justify-between rounded-2xl p-4 text-white shadow-sm ${account.includeInNetWorth ? "" : "opacity-80 saturate-50"}`} style={{ background: cardColor(account.icon) }}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/20"><AccountIcon icon={account.icon} name={account.name} /></span>
              <Link href={`/accounts/${account.id}`} className="truncate text-base font-semibold after:absolute after:inset-0 after:rounded-2xl">{account.name}</Link>
            </span>
            <span className="relative z-10"><AccountMenu account={account} /></span>
          </div>
          <div>
            <div className="font-serif text-3xl font-medium tabular-nums">{money(account.balance)}</div>
            {!account.includeInNetWorth && <div className="text-xs opacity-90">Not in net worth</div>}
          </div>
        </div>
      ))}
    </div>
    <div className="hidden rounded-xl border bg-surface md:block">
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
                <div className="flex items-center gap-2">
                  <AccountIcon icon={account.icon} name={account.name} />
                  <div>
                    <Link href={`/accounts/${account.id}`} className="font-medium underline-offset-4 after:absolute after:inset-0 hover:underline">{account.name}</Link>
                    {!account.includeInNetWorth && <div className="text-sm text-muted-foreground">Not in net worth</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell data-card="end" className="text-right tabular-nums">{money(account.balance)}</TableCell>
              <TableCell data-card="actions" className="relative z-10 pr-4 text-right whitespace-nowrap">
                <RowActions items={[{ label: "Edit", node: <AccountForm account={account} /> }, { label: "Remove", node: <DeleteAccount account={account} /> }]} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="pl-4 font-medium">
              Net worth
              {excludes && <div className="text-sm font-normal text-muted-foreground">{excludes}</div>}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{money(netWorth(rows))}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
    </>
  );
}
