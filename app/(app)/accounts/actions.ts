"use server";

import { and, eq, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { accounts, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { parseMoney, startingForBalance } from "@/lib/money";

export type FormState = {
  ok?: boolean;
  errors?: { name?: string; balance?: string };
  values?: { name: string; balance: string }; // refills the form after React resets it
};

const accountInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(60, "Keep the name under 60 characters."),
  balance: z.string().transform((value, ctx) => {
    const centavos = parseMoney(value);
    if (centavos === null) ctx.addIssue({ code: "custom", message: "Enter an amount like 1,234.56 (no minus sign)." });
    return centavos ?? z.NEVER;
  }),
});

/** Adds an account, or renames it and sets its balance when the form has an id. */
export async function saveAccount(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = { name: String(formData.get("name") ?? ""), balance: String(formData.get("balance") ?? "") };
  const parsed = accountInput.safeParse({ id: formData.get("id") || undefined, ...values });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { values, errors: { name: fieldErrors.name?.[0], balance: fieldErrors.balance?.[0] } };
  }

  const { id, name, balance } = parsed.data;
  await withUser(userId, async (tx) => {
    if (!id) return tx.insert(accounts).values({ userId, name, startingBalance: balance });
    const { accounts: rows, entries } = await loadBalances(tx, userId, { lock: true });
    const account = rows.find((row) => row.id === id);
    if (account) {
      await tx.update(accounts).set({ name, startingBalance: startingForBalance(account, entries, balance) })
        .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    }
  });
  refresh();
  return { ok: true };
}

/** Refuses while entries use the account: deleting them too would change the other accounts' balances. */
export async function deleteAccount(formData: FormData): Promise<{ error?: string }> {
  const userId = await getUserId();
  const id = z.uuid().parse(formData.get("id"));
  const error = await withUser(userId, async (tx) => {
    const [used] = await tx.select({ id: transactions.id }).from(transactions)
      .where(and(eq(transactions.userId, userId), or(eq(transactions.accountId, id), eq(transactions.toAccountId, id)))).limit(1);
    if (used) return "Delete its entries in Activity first.";
    await tx.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  });
  if (error) return { error };
  refresh();
  return {};
}
