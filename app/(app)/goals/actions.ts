"use server";

import { and, eq, sum } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { accounts, goals, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { type Tx, withUser } from "@/lib/db";
import { formatMoney, parseMoney } from "@/lib/money";

const goalFields = ["id", "name", "target", "deadline", "accountId", "savedBefore"] as const;
const addFields = ["goalId", "fromAccountId", "amount", "date"] as const;
type Field = (typeof goalFields)[number] | (typeof addFields)[number];

export type FormState = {
  ok?: boolean;
  completed?: boolean; // the money reached the target, so the bar flashes
  errors?: Partial<Record<Field, string>>;
  values?: Partial<Record<Field, string>>; // refills the form after React resets it
};

const amount = z.string().transform((value, ctx) => {
  const centavos = parseMoney(value);
  if (!centavos) ctx.addIssue({ code: "custom", message: "Enter an amount above zero, like 1,234.56." });
  return centavos || z.NEVER;
});
const goalInput = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(1, "Give the goal a name.").max(60, "Keep the name under 60 characters."),
  target: amount,
  deadline: z.iso.date("Pick a deadline."),
  accountId: z.uuid("Pick an account."),
  savedBefore: z.string().transform((value, ctx) => {
    const centavos = value.trim() ? parseMoney(value) : 0;
    if (centavos === null) ctx.addIssue({ code: "custom", message: "Enter an amount like 1,234.56, or leave it blank." });
    return centavos ?? z.NEVER;
  }),
});
const addInput = z.object({ goalId: z.uuid(), fromAccountId: z.uuid("Pick an account."), amount, date: z.iso.date("Pick a date.") });

function read<F extends Field>(formData: FormData, fields: readonly F[]) {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<F, string>;
}

function fieldErrors(error: z.ZodError): FormState["errors"] {
  return Object.fromEntries(Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [field, (messages as string[])?.[0]]));
}

/** What's been added through Kinsenas, not counting what was saved before tracking. */
async function addedTransfers(tx: Tx, goalId: string) {
  const [row] = await tx.select({ added: sum(transactions.amount).mapWith(Number) }).from(transactions).where(eq(transactions.goalId, goalId));
  return row?.added ?? 0;
}

/** Creates a goal, or edits one. The target can't drop below what's already saved. */
export async function saveGoal(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = read(formData, goalFields);
  const parsed = goalInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { id, ...goal } = parsed.data;
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    // FKs skip RLS, so the account must be found among the user's own rows.
    const [account] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, goal.accountId), eq(accounts.userId, userId)));
    if (!account) return { accountId: "Pick an account." };
    const own = and(eq(goals.id, id), eq(goals.userId, userId));
    const [current] = id ? await tx.select({ id: goals.id }).from(goals).where(own).for("update") : [];
    if (id && !current) return { name: "This goal is gone. Close and refresh." };
    const saved = goal.savedBefore + (current ? await addedTransfers(tx, current.id) : 0);
    if (saved > goal.target) return { target: `Already saved ${formatMoney(saved)}. Enter at least that.` };
    if (current) await tx.update(goals).set(goal).where(own);
    else await tx.insert(goals).values({ userId, ...goal });
  });
  if (errors) return { values, errors };
  refresh();
  return { ok: true };
}

/** Its transfers stay in Activity as plain transfers. */
export async function deleteGoal(formData: FormData) {
  const userId = await getUserId();
  const id = z.uuid().parse(formData.get("id"));
  await withUser(userId, (tx) => tx.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId))));
  refresh();
}

/** Saves a transfer into the goal's account, linked to the goal, up to what's left. */
export async function addToGoal(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = read(formData, addFields);
  const parsed = addInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const transfer = parsed.data;
  const result = await withUser(userId, async (tx): Promise<FormState> => {
    const { accounts, balance } = await loadBalances(tx, userId, { lock: true });
    const [goal] = await tx.select().from(goals).where(and(eq(goals.id, transfer.goalId), eq(goals.userId, userId))).for("update");
    if (!goal) return { errors: { amount: "This goal is gone. Close and refresh." } };
    // FKs skip RLS, so only an account found among the user's own rows gets saved.
    const from = accounts.find((account) => account.id === transfer.fromAccountId);
    if (!from || from.id === goal.accountId) return { errors: { fromAccountId: "Pick an account other than the one the goal is saved in." } };
    const left = goal.target - goal.savedBefore - (await addedTransfers(tx, goal.id));
    if (transfer.amount > left) return { errors: { amount: `Only ${formatMoney(left)} left to reach the target.` } };
    if (balance(from.id)! < transfer.amount) return { errors: { amount: `Only ${formatMoney(balance(from.id)!)} in ${from.name}.` } };

    await tx.insert(transactions).values({
      userId, type: "transfer", amount: transfer.amount, date: transfer.date,
      accountId: from.id, toAccountId: goal.accountId, goalId: goal.id, payee: goal.name,
    });
    return { ok: true, completed: transfer.amount === left };
  });
  if (!result.ok) return { values, ...result };
  refresh();
  return result;
}
