"use server";

import { and, count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { accounts, installments, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { type Tx, withUser } from "@/lib/db";
import { nextDueDate, parseMoney } from "@/lib/money";
import { getMoney } from "@/lib/settings";

const fields = ["id", "name", "monthlyAmount", "months", "paidBefore", "nextDueDate", "accountId", "note"] as const;
const payFields = ["installmentId", "date"] as const;
type Field = (typeof fields)[number] | (typeof payFields)[number];

export type FormState = {
  ok?: boolean;
  errors?: Partial<Record<Field, string>>;
  values?: Partial<Record<Field, string>>; // refills the form after React resets it
};

const whole = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : NaN);
const installmentInput = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(1, "Give the installment a name.").max(60, "Keep the name under 60 characters."),
  monthlyAmount: z.string().transform((value, ctx) => {
    const centavos = parseMoney(value);
    if (!centavos) ctx.addIssue({ code: "custom", message: "Enter an amount above zero, like 1,234.56." });
    return centavos || z.NEVER;
  }),
  months: z.string().transform(whole).pipe(z.number("Enter 1 to 120 months.").min(1, "Enter 1 to 120 months.").max(120, "Enter 1 to 120 months.")),
  paidBefore: z.string().transform((value) => (value.trim() ? whole(value) : 0)).pipe(z.number("Enter a whole number of months, or leave it blank.")),
  nextDueDate: z.iso.date("Pick the next due date."),
  accountId: z.uuid("Pick an account."),
  note: z.string().trim().max(200, "Keep the note under 200 characters.").transform((note) => note || null),
}).refine((installment) => installment.paidBefore < installment.months, { path: ["paidBefore"], message: "Must be fewer than the months, or it's already finished." });
const payInput = z.object({ installmentId: z.uuid(), date: z.iso.date("Pick a date.") });

function read<F extends Field>(formData: FormData, names: readonly F[]) {
  return Object.fromEntries(names.map((name) => [name, String(formData.get(name) ?? "")])) as Record<F, string>;
}

function fieldErrors(error: z.ZodError): FormState["errors"] {
  return Object.fromEntries(Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [field, (messages as string[])?.[0]]));
}

/** Payments recorded through Keep tabs on, not counting the months paid before tracking. */
async function recordedPayments(tx: Tx, installmentId: string) {
  const [row] = await tx.select({ n: count() }).from(transactions).where(eq(transactions.installmentId, installmentId));
  return row?.n ?? 0;
}

/** Creates an installment, or edits one. The picked date's day becomes the day monthly rolls land on. */
export async function saveInstallment(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = read(formData, fields);
  const parsed = installmentInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { id, ...installment } = parsed.data;
  const row = { ...installment, dueDay: Number(installment.nextDueDate.slice(8)) };
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    // FKs skip RLS, so the account must be found among the user's own rows.
    const [account] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, row.accountId), eq(accounts.userId, userId)));
    if (!account) return { accountId: "Pick an account." };
    if (!id) {
      await tx.insert(installments).values({ userId, ...row });
      return;
    }
    const own = and(eq(installments.id, id), eq(installments.userId, userId));
    const [current] = await tx.select({ id: installments.id }).from(installments).where(own).for("update");
    if (!current) return { name: "This installment is gone. Close and refresh." };
    const paid = row.paidBefore + (await recordedPayments(tx, current.id));
    if (paid >= row.months) return { months: `Already paid ${paid} months. Enter more than that.` };
    await tx.update(installments).set(row).where(own);
  });
  if (errors) return { values, errors };
  refresh();
  return { ok: true };
}

/** Its payments stay in Activity as plain expenses. */
export async function deleteInstallment(formData: FormData) {
  const userId = await getUserId();
  const id = z.uuid().parse(formData.get("id"));
  await withUser(userId, (tx) => tx.delete(installments).where(and(eq(installments.id, id), eq(installments.userId, userId))));
  refresh();
}

/** Saves one month's expense from the installment's account and rolls the due date, unless it was the last payment. */
export async function payInstallment(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const money = await getMoney();
  const values = read(formData, payFields);
  const parsed = payInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const payment = parsed.data;
  const result = await withUser(userId, async (tx): Promise<FormState> => {
    const { accounts: owned, balance } = await loadBalances(tx, userId, { lock: true });
    const [installment] = await tx.select().from(installments)
      .where(and(eq(installments.id, payment.installmentId), eq(installments.userId, userId))).for("update");
    if (!installment) return { errors: { installmentId: "This installment is gone. Close and refresh." } };
    const paid = installment.paidBefore + (await recordedPayments(tx, installment.id));
    if (paid >= installment.months) return { errors: { installmentId: "Already paid in full." } };
    const from = owned.find((account) => account.id === installment.accountId);
    if (!from) return { errors: { installmentId: "Its account is gone. Edit the installment." } };
    if (balance(from.id)! < installment.monthlyAmount) {
      return { errors: { installmentId: `Only ${money(balance(from.id)!)} in ${from.name}.` } };
    }
    await tx.insert(transactions).values({
      userId, type: "expense", amount: installment.monthlyAmount, date: payment.date, accountId: from.id,
      installmentId: installment.id, payee: installment.name,
    });
    if (paid + 1 < installment.months) {
      await tx.update(installments).set({ nextDueDate: nextDueDate(installment.nextDueDate, "monthly", installment.dueDay) })
        .where(eq(installments.id, installment.id));
    }
    return { ok: true };
  });
  if (!result.ok) return { values, ...result };
  refresh();
  return result;
}
