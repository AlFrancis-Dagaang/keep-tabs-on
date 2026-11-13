import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accounts, categories, transactions, type Transaction } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";

import { DeleteEntry, EntryForm } from "./entry-form";
import { getMoney } from "@/lib/settings";

const types: Transaction["type"][] = ["income", "expense", "transfer"];
const toAccounts = alias(accounts, "to_accounts");

export default function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <Activity searchParams={searchParams} />
    </Suspense>
  );
}

async function Activity({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const money = await getMoney();
  const userId = await getUserId();
  const param = (await searchParams).type;
  const type = types.find((t) => t === param);
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
      .where(and(eq(transactions.userId, userId), type && eq(transactions.type, type)))
      .orderBy(desc(transactions.date), desc(transactions.createdAt)),
  }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

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
                href={t ? `/activity?type=${t}` : "/activity"}
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
          {rows.length === 0 ? (
            <p className="rounded-xl border bg-surface p-6 text-muted-foreground">{type ? `No ${type} entries yet. Log one with Add entry.` : "No entries yet. Log one with Add entry."}</p>
          ) : (
            <div className="rounded-xl border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Account</TableHead>
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
                        <TableCell>{row.payee ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className={cn(!row.category && !row.billId && !row.debtId && "text-muted-foreground")}>
                          {row.type === "transfer" ? (row.goalId ? "Goal" : "Transfer") : (row.category ?? (row.billId ? "Bill" : row.debtId ? "Debt" : "Uncategorized"))}
                        </TableCell>
                        <TableCell>{where}</TableCell>
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
