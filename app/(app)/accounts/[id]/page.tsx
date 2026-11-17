import { and, asc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AccountIcon } from "@/components/account-icon";
import { DateFilter } from "@/components/date-filter";
import { EntryDate } from "@/components/entry-date";
import { LoadingBar } from "@/components/loading-bar";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, categories, transactions } from "@/db/schema";
import { EntryForm } from "../../activity/entry-form";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { loadSetAsideItems } from "@/lib/set-aside";
import { withUser } from "@/lib/db";
import { accountHistory, isLinked, parseRange, setAsideOf } from "@/lib/money";
import { getMoney } from "@/lib/settings";

const toAccounts = alias(accounts, "to_accounts");

type Search = Promise<{ from?: string; to?: string }>;

export default function AccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Search }) {
  return (
    <Suspense fallback={<LoadingBar />}>
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
  const { account, rows, balances, choices, setAsideItems } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    choices: await tx.select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
    setAsideItems: await loadSetAsideItems(tx, userId),
    account: (await tx.select({ id: accounts.id, name: accounts.name, startingBalance: accounts.startingBalance, icon: accounts.icon })
      .from(accounts).where(and(eq(accounts.id, id.data), eq(accounts.userId, userId))))[0],
    // shortcut: loads every entry of the account, add paging when one account passes a few thousand rows.
    rows: await tx
      .select({
        id: transactions.id, type: transactions.type, amount: transactions.amount, date: transactions.date, createdAt: transactions.createdAt, payee: transactions.payee, note: transactions.note,
        accountId: transactions.accountId, toAccountId: transactions.toAccountId, categoryId: transactions.categoryId, account: accounts.name, toAccount: toAccounts.name, toName: transactions.toName, paidTo: transactions.paidTo,
        category: categories.name, billId: transactions.billId, debtId: transactions.debtId, goalId: transactions.goalId, installmentId: transactions.installmentId,
        setAsideBillId: transactions.setAsideBillId, setAsideDebtId: transactions.setAsideDebtId, setAsideGoalId: transactions.setAsideGoalId, setAsideInstallmentId: transactions.setAsideInstallmentId,
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
      <PageHeader title={account.name} icon={<AccountIcon icon={account.icon} name={account.name} />} description={`Balance ${money(current)}`} />
      <DateFilter path={`/accounts/${account.id}`} today={today} min={rows[0]?.date ?? today} from={from} to={to} />
      {shown.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          {history.length === 0 ? "No entries yet. Log one in Activity." : "No entries in this range."}
        </p>
      ) : (
        <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => {
                const out = row.accountId === account.id;
                const label = row.category ?? (row.billId ? "Bill" : row.debtId ? "Debt" : row.installmentId ? "Installment" : "Uncategorized");
                const link = setAsideOf(row);
                const forName = link && setAsideItems.find((item) => item.value === `${link.kind}:${link.id}`)?.name;
                const details = row.type === "transfer"
                  ? `${row.goalId ? "Goal" : forName ? `Set aside · ${forName}` : "Transfer"} ${out ? `to ${row.toAccount ?? row.toName}` : `from ${row.account}`}`
                  : row.payee ? `${row.payee}${row.paidTo ? ` · To ${row.paidTo}` : ""} · ${label}` : label;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4 tabular-nums"><EntryDate date={row.date} today={today} loggedAt={row.createdAt} /></TableCell>
                    <TableCell data-label="Details">
                      {details}
                      {row.note && <p className="text-sm text-muted-foreground">{row.note}</p>}
                    </TableCell>
                    <TableCell data-card="end" className="text-right tabular-nums">{row.change > 0 ? "+" : "−"}{money(Math.abs(row.change))}</TableCell>
                    <TableCell data-label="Balance" className="text-right tabular-nums">{money(row.balanceAfter)}</TableCell>
                    <TableCell data-card="actions" className="pr-4 text-right">
                      {!isLinked(row) && <EntryForm entry={row} accounts={balances.accounts} categories={choices} today={today} setAsideItems={setAsideItems} />}
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
