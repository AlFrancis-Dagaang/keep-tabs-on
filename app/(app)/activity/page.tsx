import { and, asc, desc, eq, gte, lte, min } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Fragment, Suspense } from "react";
import { cn } from "cn";
import { EntryDate } from "@/components/entry-date";
import { LoadingBar } from "@/components/loading-bar";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { RowActions } from "@/components/row-actions";
import { TypeFilter } from "@/components/type-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, categories, transactions, type Transaction } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { formatDate, isLinked, parseRange } from "@/lib/money";

import { DeleteEntry, EntryForm } from "./entry-form";
import { getMoney } from "@/lib/settings";

const types: Transaction["type"][] = ["income", "expense", "transfer"];
const toAccounts = alias(accounts, "to_accounts");

type Search = Promise<{ type?: string; from?: string; to?: string }>;
type Row = Pick<Transaction, "type" | "payee" | "note" | "toName" | "billId" | "debtId" | "goalId" | "installmentId"> & { account: string; toAccount: string | null; category: string | null };

const dash = <span className="text-muted-foreground">—</span>;
const payee = (head: string) => ({ head, cell: (row: Row) => <TableCell data-label={head}>{row.payee ?? dash}</TableCell> });
const note = { head: "Note", cell: (row: Row) => <TableCell data-label={row.note ? "Note" : undefined} className="text-muted-foreground">{row.note}</TableCell> };
const category = {
  head: "Category",
  cell: (row: Row) => (
    <TableCell data-label="Category" className={cn(!row.category && !row.billId && !row.debtId && !row.installmentId && "text-muted-foreground")}>
      {row.type === "transfer" ? (row.goalId ? "Goal" : "Transfer") : (row.category ?? (row.billId ? "Bill" : row.debtId ? "Debt" : row.installmentId ? "Installment" : "Uncategorized"))}
    </TableCell>
  ),
};
const account = { head: "Account", cell: (row: Row) => <TableCell data-label="Account">{row.type === "transfer" ? `${row.account} → ${row.toAccount ?? row.toName}` : row.account}</TableCell> };
// Only the columns that fit the type; "All" mixes the three, so it keeps one shared set.
const columns: Record<"all" | Transaction["type"], { head: string; cell: (row: Row) => React.ReactNode }[]> = {
  all: [payee("Payee"), category, account, note],
  expense: [category, payee("Payee"), account, note],
  income: [category, payee("Source"), account, note],
  transfer: [
    { head: "From", cell: (row) => <TableCell data-label="From">{row.account}</TableCell> },
    { head: "To", cell: (row) => <TableCell data-label="To">{row.toAccount ?? row.toName}</TableCell> },
    { head: "For", cell: (row) => <TableCell data-label="For">{row.goalId ? "Goal" : dash}</TableCell> },
    note,
  ],
};

export default function ActivityPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<LoadingBar />}>
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
  const { balances, choices, earliest, rows } = await withUser(userId, async (tx) => ({
    balances: await loadBalances(tx, userId),
    choices: await tx.select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name)),
    earliest: (await tx.select({ date: min(transactions.date) }).from(transactions).where(eq(transactions.userId, userId)))[0].date,
    rows: await tx
      .select({
        id: transactions.id, type: transactions.type, accountId: transactions.accountId, toAccountId: transactions.toAccountId, categoryId: transactions.categoryId, amount: transactions.amount, date: transactions.date, createdAt: transactions.createdAt, payee: transactions.payee,
        note: transactions.note, toName: transactions.toName,
        account: accounts.name, toAccount: toAccounts.name, category: categories.name, billId: transactions.billId, debtId: transactions.debtId, goalId: transactions.goalId, installmentId: transactions.installmentId,
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
          <div className="mb-4 flex gap-2 max-md:[&>button]:flex-1">
            <TypeFilter items={[undefined, ...types].map((t) => ({ label: t ?? "All types", href: typeHref(t), current: t === type }))} />
            <MonthPicker path="/activity" today={today} min={earliest ?? today} from={from} to={to} keep={type ? { type } : undefined} />
          </div>
          {rows.length === 0 ? (
            <p className="rounded-xl border bg-surface p-6 text-muted-foreground">
              {from || to ? `No ${type ? `${type} ` : ""}entries in this range.` : type ? `No ${type} entries yet. Log one with Add entry.` : "No entries yet. Log one with Add entry."}
            </p>
          ) : (
            <div className="rounded-xl border bg-surface max-md:border-0 max-md:bg-transparent">
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
                    const where = row.type === "transfer" ? `${row.account} → ${row.toAccount ?? row.toName}` : row.account;
                    const sign = { income: "+", expense: "−", transfer: "" }[row.type];
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="pl-4 tabular-nums"><EntryDate date={row.date} today={today} loggedAt={row.createdAt} />
                        </TableCell>
                        {cols.map((col) => <Fragment key={col.head}>{col.cell(row)}</Fragment>)}
                        <TableCell data-card="end" className="text-right tabular-nums">{sign}{money(row.amount)}</TableCell>
                        <TableCell data-card="actions" className="pr-4 text-right">
                          <RowActions
                            items={[
                              { label: "Edit", node: !isLinked(row) && <EntryForm entry={row} accounts={balances.accounts} categories={choices} today={today} /> },
                              { label: "Remove", node: <DeleteEntry id={row.id} label={`${formatDate(row.date)} · ${where} · ${sign}${money(row.amount)}`} consequence={isLinked(row) ? "The bill, installment, debt or goal goes back too, and a due date it moved rolls back." : undefined} /> },
                            ]}
                          />
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
