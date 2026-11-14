"use server";

import { and, eq, sum } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { debts, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { type Tx, withUser } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { getMoney } from "@/lib/settings";

const debtFields = ["id", "name", "direction", "total", "deadline", "paidBefore", "note"] as const;
const payFields = ["debtId", "accountId", "amount", "date"] as const;
type Field = (typeof debtFields)[number] | (typeof payFields)[number];

export type FormState = {
  ok?: boolean;
  completed?: boolean; // the payment paid the debt off, so the bar flashes
  errors?: Partial<Record<Field, string>>;
  values?: Partial<Record<Field, string>>; // refills the form after React resets it
};

const amount = z.string().transform((value, ctx) => {
  const centavos = parseMoney(value);
  if (!centavos) ctx.addIssue({ code: "custom", message: "Enter an amount above zero, like 1,234.56." });
  return centavos || z.NEVER;
});
const debtInput = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(1, "Give the debt a name.").max(60, "Keep the name under 60 characters."),
  direction: z.enum(["owe", "owed"], "Pick who owes whom."),
  total: amount,
  deadline: z.iso.date("Pick a deadline."),
  paidBefore: z.string().transform((value, ctx) => {
    const centavos = value.trim() ? parseMoney(value) : 0;
    if (centavos === null) ctx.addIssue({ code: "custom", message: "Enter an amount like 1,234.56, or leave it blank." });
    return centavos ?? z.NEVER;
  }),
  note: z.string().trim().max(200, "Keep the note under 200 characters.").transform((note) => note || null),
});
const payInput = z.object({ debtId: z.uuid(), accountId: z.uuid("Pick an account."), amount, date: z.iso.date("Pick a date.") });

function read<F extends Field>(formData: FormData, fields: readonly F[]) {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<F, string>;
}

function fieldErrors(error: z.ZodError): FormState["errors"] {
  return Object.fromEntries(Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [field, (messages as string[])?.[0]]));
}

/** What's been paid (or received) through Keep tabs on, not counting what came before tracking. */
async function paidPayments(tx: Tx, debtId: string) {
  const [row] = await tx.select({ paid: sum(transactions.amount).mapWith(Number) }).from(transactions).where(eq(transactions.debtId, debtId));
  return row?.paid ?? 0;
}

/** Creates a debt, or edits one. The total can't drop below what's already paid, and the direction is fixed once it has payments. */
export async function saveDebt(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const money = await getMoney();
  const values = read(formData, debtFields);
  const parsed = debtInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { id, ...debt } = parsed.data;
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    const own = and(eq(debts.id, id), eq(debts.userId, userId));
    const [current] = id ? await tx.select({ id: debts.id, direction: debts.direction }).from(debts).where(own).for("update") : [];
    if (id && !current) return { name: "This debt is gone. Close and refresh." };
    const payments = current ? await paidPayments(tx, current.id) : 0;
    if (current && current.direction !== debt.direction && payments > 0) {
      return { direction: "Has payments, so its direction can't change. Delete it and add a new one." };
    }
    const paid = debt.paidBefore + payments;
    if (paid > debt.total) return { total: `Already ${debt.direction === "owed" ? "received" : "paid"} ${money(paid)}. Enter at least that.` };
    if (current) await tx.update(debts).set(debt).where(own);
    else await tx.insert(debts).values({ userId, ...debt });
  });
  if (errors) return { values, errors };
  refresh();
  return { ok: true };
}

/** Its payments stay in Activity as plain expenses, and money received as plain income. */
export async function deleteDebt(formData: FormData) {
  const userId = await getUserId();
  const id = z.uuid().parse(formData.get("id"));
  await withUser(userId, (tx) => tx.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId))));
  refresh();
}

/** Saves an expense (you owe) or income (owed to you) linked to the debt, up to what's left. */
export async function payDebt(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const money = await getMoney();
  const values = read(formData, payFields);
  const parsed = payInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const payment = parsed.data;
  const result = await withUser(userId, async (tx): Promise<FormState> => {
    const { accounts, balance } = await loadBalances(tx, userId, { lock: true });
    const [debt] = await tx.select().from(debts).where(and(eq(debts.id, payment.debtId), eq(debts.userId, userId))).for("update");
    if (!debt) return { errors: { amount: "This debt is gone. Close and refresh." } };
    // FKs skip RLS, so only an account found among the user's own rows gets saved.
    const from = accounts.find((account) => account.id === payment.accountId);
    if (!from) return { errors: { accountId: "Pick an account." } };
    const left = debt.total - debt.paidBefore - (await paidPayments(tx, debt.id));
    const receiving = debt.direction === "owed";
    if (payment.amount > left) return { errors: { amount: `Only ${money(left)} left to ${receiving ? "receive" : "pay"}.` } };
    if (!receiving && balance(from.id)! < payment.amount) return { errors: { amount: `Only ${money(balance(from.id)!)} in ${from.name}.` } };

    await tx.insert(transactions).values({
      userId, type: receiving ? "income" : "expense", amount: payment.amount, date: payment.date, accountId: from.id, debtId: debt.id, payee: debt.name,
    });
    return { ok: true, completed: payment.amount === left };
  });
  if (!result.ok) return { values, ...result };
  refresh();
  return result;
}
