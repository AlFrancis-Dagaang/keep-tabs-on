"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { accounts } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
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
    const own = and(eq(accounts.id, id), eq(accounts.userId, userId));
    const [account] = await tx.select().from(accounts).where(own);
    if (account) await tx.update(accounts).set({ name, startingBalance: startingForBalance(account, balance) }).where(own);
  });
  refresh();
  return { ok: true };
}

export async function deleteAccount(formData: FormData) {
  const userId = await getUserId();
  const id = z.uuid().parse(formData.get("id"));
  await withUser(userId, (tx) => tx.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId))));
  refresh();
}
