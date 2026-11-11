import { asc, eq } from "drizzle-orm";
import { accounts, transactions } from "@/db/schema";
import type { Tx } from "@/lib/db";
import { balanceOf, type Entry } from "@/lib/money";

// shortcut: loads every entry per request, switch to a SQL sum per account when Activity passes a few thousand rows.
/** The user's accounts and entries. With lock, the accounts stay locked until the transaction ends, so two saves can't both pass a >= 0 check. */
export async function loadBalances(tx: Tx, userId: string, { lock = false } = {}) {
  const accountQuery = tx
    .select({ id: accounts.id, name: accounts.name, startingBalance: accounts.startingBalance })
    .from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt));
  const rows = await (lock ? accountQuery.for("update") : accountQuery);
  const entries: Entry[] = await tx
    .select({ type: transactions.type, amount: transactions.amount, accountId: transactions.accountId, toAccountId: transactions.toAccountId })
    .from(transactions).where(eq(transactions.userId, userId));
  const withBalance = rows.map((account) => ({ ...account, balance: balanceOf(account, entries) }));
  return { accounts: withBalance, entries, balance: (id: string) => withBalance.find((account) => account.id === id)?.balance };
}
