import { and, asc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DateFilter } from "@/components/date-filter";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, categories, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { accountHistory, parseRange } from "@/lib/money";
import { getMoney } from "@/lib/settings";

const toAccounts = alias(accounts, "to_accounts");

type Search = Promise<{ from?: string; to?: string }>;

export default function AccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <AccountHistory params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountHistory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  const money = await getMoney();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const search = await searchParams;
  const { from, to } = parseRange(search.from, search.to);
  const userId = await getUserId();
  const { account, rows } = await withUser(userId, async (tx) => ({
    account: (await tx.select({ id: accounts.id, name: accounts.name, startingBalance: accounts.startingBalance })
      .from(accounts).where(and(eq(accounts.id, id.data), eq(accounts.userId, userId))))[0],
    // shortcut: loads every entry of the account, add paging when one account passes a few thousand rows.
    rows: await tx
      .select({
        id: transactions.id, type: transactions.type, amount: transactions.amount, date: transactions.date, payee: transactions.payee,
        accountId: transactions.accountId, toAccountId: transactions.toAccountId, account: accounts.name, toAccount: toAccounts.name, toName: transactions.toName,
        category: categories.name, billId: transactions.billId, debtId: transactions.debtId, goalId: transactions.goalId, installmentId: transactions.installmentId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(toAccounts, eq(transactions.toAccountId, toAccounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), or(eq(transactions.accountId, id.data), eq(transactions.toAccountId, id.data))))
      .orderBy(asc(transactions.date), asc(transactions.createdAt)),
  }));
  if (!account) notFound();
  // The running balance is worked out over every entry; the date filter only hides rows.
  const history = accountHistory(account, rows);
  const shown = history.filter((row) => (!from || row.date >= from) && (!to || row.date <= to)).reverse();
  const current = history.at(-1)?.balanceAfter ?? account.startingBalance;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  return (
    <>
      <Link href="/accounts" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← Accounts</Link>
      <PageHeader title={account.name} description={`Balance ${money(current)}`} />
      <DateFilter path={`/accounts/${account.id}`} today={today} from={from} to={to} />
      {shown.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          {history.length === 0 ? "No entries yet. Log one in Activity." : "No entries in this range."}
        </p>
      ) : (
        <div className="rounded-xl border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-4 text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => {
                const out = row.accountId === account.id;
                const label = row.category ?? (row.billId ? "Bill" : row.debtId ? "Debt" : row.installmentId ? "Installment" : "Uncategorized");
                const details = row.type === "transfer"
                  ? `${row.goalId ? "Goal" : "Transfer"} ${out ? `to ${row.toAccount ?? row.toName}` : `from ${row.account}`}`
                  : row.payee ? `${row.payee} · ${label}` : label;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4 tabular-nums">{row.date}</TableCell>
                    <TableCell>{details}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.change > 0 ? "+" : "−"}{money(Math.abs(row.change))}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{money(row.balanceAfter)}</TableCell>
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
