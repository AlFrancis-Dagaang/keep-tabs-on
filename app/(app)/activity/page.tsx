import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Fragment, Suspense } from "react";
import { cn } from "cn";
import { DateFilter } from "@/components/date-filter";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, categories, transactions, type Transaction } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { parseRange } from "@/lib/money";

import { DeleteEntry, EntryForm } from "./entry-form";
import { getMoney } from "@/lib/settings";

const types: Transaction["type"][] = ["income", "expense", "transfer"];
const toAccounts = alias(accounts, "to_accounts");

type Search = Promise<{ type?: string; from?: string; to?: string }>;
type Row = Pick<Transaction, "type" | "payee" | "billId" | "debtId" | "goalId"> & { account: string; toAccount: string | null; category: string | null };

const dash = <span className="text-muted-foreground">—</span>;
const payee = { head: "Payee", cell: (row: Row) => <TableCell>{row.payee ?? dash}</TableCell> };
const source = { ...payee, head: "Source" };
const category = {
  head: "Category",
  cell: (row: Row) => (
    <TableCell className={cn(!row.category && !row.billId && !row.debtId && "text-muted-foreground")}>
      {row.type === "transfer" ? (row.goalId ? "Goal" : "Transfer") : (row.category ?? (row.billId ? "Bill" : row.debtId ? "Debt" : "Uncategorized"))}
    </TableCell>
  ),
};
const account = { head: "Account", cell: (row: Row) => <TableCell>{row.type === "transfer" ? `${row.account} → ${row.toAccount}` : row.account}</TableCell> };
// Only the columns that fit the type; "All" mixes the three, so it keeps one shared set.
const columns: Record<"all" | Transaction["type"], { head: string; cell: (row: Row) => React.ReactNode }[]> = {
  all: [payee, category, account],
  expense: [category, payee, account],
  income: [category, source, account],
  transfer: [
    { head: "From", cell: (row) => <TableCell>{row.account}</TableCell> },
    { head: "To", cell: (row) => <TableCell>{row.toAccount}</TableCell> },
    { head: "For", cell: (row) => <TableCell>{row.goalId ? "Goal" : dash}</TableCell> },
  ],
};

export default function ActivityPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Activity searchParams={searchParams} />
    </Suspense>
  );
}

async function Activity({ searchParams }: { searchParams: Search }) {
  const money = await getMoney();
  const userId = await getUserId();
  const search = await searchParams;
  const type = types.find((t) => t === search.type);
  const { from, to } = parseRange(search.from, search.to);
  const { balances, choices, rows } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    choices: await tx.select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
    rows: await tx
      .select({
        id: transactions.id, type: transactions.type, amount: transactions.amount, date: transactions.date, payee: transactions.payee,
        account: accounts.name, toAccount: toAccounts.name, category: categories.name, billId: transactions.billId, debtId: transactions.debtId, goalId: transactions.goalId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(toAccounts, eq(transactions.toAccountId, toAccounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), type && eq(transactions.type, type), from ? gte(transactions.date, from) : undefined, to ? lte(transactions.date, to) : undefined))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
  }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const typeHref = (t?: string) => {
    const query = new URLSearchParams({ ...(t && { type: t }), ...(from && { from }), ...(to && { to }) }).toString();
    return query ? `/activity?${query}` : "/activity";
  };
  const cols = columns[type ?? "all"];

  return (
    <>
      <PageHeader title="Activity" description="Income, expenses and transfers.">
        {balances.accounts.length > 0 && <EntryForm accounts={balances.accounts} categories={choices} today={today} />}
      </PageHeader>
      {balances.accounts.length === 0 ? (
        <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
          Add an account first in <Link href="/accounts" className="underline">Accounts</Link>, then log what comes in and goes out.
        </p>
      ) : (
        <>
          <nav aria-label="Filter by type" className="mb-4 flex flex-wrap gap-2">
            {[undefined, ...types].map((t) => (
              <Link
                key={t ?? "all"}
                href={typeHref(t)}
                aria-current={t === type ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm capitalize text-muted-foreground hover:bg-accent hover:text-foreground",
                  t === type && "bg-accent font-medium text-foreground",
                )}
              >
                {t ?? "All"}
              </Link>
            ))}
          </nav>
          <DateFilter path="/activity" today={today} from={from} to={to} keep={type ? { type } : undefined} />
          {rows.length === 0 ? (
            <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
              {from || to ? `No ${type ? `${type} ` : ""}entries in this range.` : type ? `No ${type} entries yet. Log one with Add entry.` : "No entries yet. Log one with Add entry."}
            </p>
          ) : (
            <div className="rounded-xl border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    {cols.map((col) => <TableHead key={col.head}>{col.head}</TableHead>)}
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const where = row.type === "transfer" ? `${row.account} → ${row.toAccount}` : row.account;
                    const sign = { income: "+", expense: "−", transfer: "" }[row.type];
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="pl-4 tabular-nums">{row.date}</TableCell>
                        {cols.map((col) => <Fragment key={col.head}>{col.cell(row)}</Fragment>)}
                        <TableCell className="text-right tabular-nums">{sign}{money(row.amount)}</TableCell>
                        <TableCell className="pr-4 text-right">
                          <DeleteEntry id={row.id} label={`${row.date} · ${where} · ${sign}${money(row.amount)}`} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </>
  );
}
