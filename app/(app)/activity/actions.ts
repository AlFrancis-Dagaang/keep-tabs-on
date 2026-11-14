"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { categories, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { getMoney } from "@/lib/settings";

const fields = ["type", "accountId", "toAccountId", "toName", "categoryId", "amount", "date", "payee", "note"] as const;
type Field = (typeof fields)[number];

export type FormState = {
  ok?: boolean;
  errors?: Partial<Record<Field, string>>;
  values?: Record<Field, string>; // refills the form after React resets it
};

const amount = z.string().transform((value, ctx) => {
  const centavos = parseMoney(value);
  if (!centavos) ctx.addIssue({ code: "custom", message: "Enter an amount above zero, like 1,234.56." });
  return centavos || z.NEVER;
});
const common = {
  accountId: z.uuid("Pick an account."),
  amount,
  date: z.iso.date("Pick a date."),
  payee: z.string().trim().max(60, "Keep the payee under 60 characters.").transform((payee) => payee || null),
  note: z.string().trim().max(200, "Keep the note under 200 characters.").transform((note) => note || null),
};
const entryInput = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["income", "expense"]), categoryId: z.uuid("Pick a category."), ...common }),
  // Goes to one of your accounts, or to someone else by name: exactly one of the two.
  z.object({
    type: z.literal("transfer"),
    toAccountId: z.union([z.literal(""), z.uuid("Pick the account it goes to.")]),
    toName: z.string().trim().max(60, "Keep the name under 60 characters."),
    ...common,
  })
    .refine((entry) => entry.toAccountId || entry.toName, { path: ["toAccountId"], message: "Pick the account it goes to, or enter a name." })
    .refine((entry) => !(entry.toAccountId && entry.toName), { path: ["toAccountId"], message: "Pick an account or enter a name, not both." })
    .refine((entry) => entry.toAccountId !== entry.accountId, { path: ["toAccountId"], message: "Pick a different account." }),
]);

/** Records an income, expense or transfer (to an account or to a name). Refuses when it would take an account below zero. */
export async function saveEntry(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const money = await getMoney();
  const values = Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<Field, string>;
  const parsed = entryInput.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { values, errors: Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages?.[0]])) };
  }

  const entry = parsed.data;
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    const { accounts, balance } = await loadBalances(tx, userId, { lock: true });
    // FKs skip RLS, so only ids found among the user's own rows get saved.
    const from = accounts.find((account) => account.id === entry.accountId);
    if (!from) return { accountId: "Pick an account." };
    if (entry.type === "transfer") {
      if (entry.toAccountId && !accounts.some((account) => account.id === entry.toAccountId)) return { toAccountId: "Pick the account it goes to." };
    } else {
      const [category] = await tx.select({ kind: categories.kind }).from(categories)
        .where(and(eq(categories.id, entry.categoryId), eq(categories.userId, userId)));
      if (category?.kind !== (entry.type === "income" ? "income" : "spending")) return { categoryId: "Pick a category." };
    }
    if (entry.type !== "income" && balance(from.id)! < entry.amount) {
      return { amount: `Only ${money(balance(from.id)!)} in ${from.name}.` };
    }
    const row = entry.type === "transfer" ? { ...entry, toAccountId: entry.toAccountId || null, toName: entry.toName || null } : entry;
    await tx.insert(transactions).values({ userId, ...row });
  });
  if (errors) return { values, errors };
  refresh();
  return { ok: true };
}

/** Refuses when the money it brought in is already spent: the account would drop below zero. */
export async function deleteEntry(formData: FormData): Promise<{ error?: string }> {
  const userId = await getUserId();
  const money = await getMoney();
  const id = z.uuid().parse(formData.get("id"));
  const error = await withUser(userId, async (tx) => {
    const own = and(eq(transactions.id, id), eq(transactions.userId, userId));
    const { accounts, balance } = await loadBalances(tx, userId, { lock: true });
    const [entry] = await tx.select().from(transactions).where(own);
    if (!entry) return;
    const credited = entry.type === "income" ? entry.accountId : entry.type === "transfer" ? entry.toAccountId : null;
    if (credited && balance(credited)! < entry.amount) {
      const account = accounts.find((row) => row.id === credited)!;
      return `${account.name} has only ${money(account.balance)} left, so this can't be undone.`;
    }
    await tx.delete(transactions).where(own);
  });
  if (error) return { error };
  refresh();
  return {};
}
