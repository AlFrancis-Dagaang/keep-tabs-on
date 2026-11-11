"use server";

import { and, eq, gt, sql, sum } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { bills, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { type Tx, withUser } from "@/lib/db";
import { formatMoney, nextDueDate, parseMoney } from "@/lib/money";

const billFields = ["id", "name", "amount", "nextDueDate", "repeat"] as const;
const payFields = ["billId", "accountId", "amount", "date"] as const;
type Field = (typeof billFields)[number] | (typeof payFields)[number];

export type FormState = {
  ok?: boolean;
  completed?: boolean; // the payment finished the cycle, so the bar flashes
  errors?: Partial<Record<Field, string>>;
  values?: Partial<Record<Field, string>>; // refills the form after React resets it
};

const amount = z.string().transform((value, ctx) => {
  const centavos = parseMoney(value);
  if (!centavos) ctx.addIssue({ code: "custom", message: "Enter an amount above zero, like 1,234.56." });
  return centavos || z.NEVER;
});
const billInput = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: z.string().trim().min(1, "Give the bill a name.").max(60, "Keep the name under 60 characters."),
  amount,
  nextDueDate: z.iso.date("Pick the next due date."),
  repeat: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"], "Pick how often it repeats."),
});
const payInput = z.object({ billId: z.uuid(), accountId: z.uuid("Pick an account."), amount, date: z.iso.date("Pick a date.") });

function read<F extends Field>(formData: FormData, fields: readonly F[]) {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<F, string>;
}

function fieldErrors(error: z.ZodError): FormState["errors"] {
  return Object.fromEntries(Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [field, (messages as string[])?.[0]]));
}

/** What's been paid toward the bill since its current cycle started. */
async function paidThisCycle(tx: Tx, billId: string) {
  // Compared in SQL: a JS Date drops cycle_start's microseconds, which would count the payment that closed the last cycle.
  const [row] = await tx.select({ paid: sum(transactions.amount).mapWith(Number) }).from(transactions)
    .innerJoin(bills, eq(transactions.billId, bills.id))
    .where(and(eq(bills.id, billId), gt(transactions.createdAt, bills.cycleStart)));
  return row?.paid ?? 0;
}

/** Creates a bill, or edits one. The picked date's day becomes the day monthly rolls land on. */
export async function saveBill(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = read(formData, billFields);
  const parsed = billInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { id, ...bill } = parsed.data;
  const row = { ...bill, dueDay: Number(bill.nextDueDate.slice(8)) };
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    if (!id) {
      await tx.insert(bills).values({ userId, ...row });
      return;
    }
    const own = and(eq(bills.id, id), eq(bills.userId, userId));
    const [current] = await tx.select({ id: bills.id }).from(bills).where(own).for("update");
    if (!current) return { name: "This bill is gone. Close and refresh." };
    // Lowering the amount below what's paid would finish the cycle without a payment to roll it.
    const paid = await paidThisCycle(tx, current.id);
    if (row.amount <= paid) return { amount: `Already paid ${formatMoney(paid)} this cycle. Enter more than that.` };
    await tx.update(bills).set(row).where(own);
  });
  if (errors) return { values, errors };
  refresh();
  return { ok: true };
}

/** Its payments stay in Activity as plain expenses. */
export async function deleteBill(formData: FormData) {
  const userId = await getUserId();
  const id = z.uuid().parse(formData.get("id"));
  await withUser(userId, (tx) => tx.delete(bills).where(and(eq(bills.id, id), eq(bills.userId, userId))));
  refresh();
}

/** Saves an expense linked to the bill. Paying the rest of the cycle rolls the due date in the same transaction. */
export async function payBill(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = read(formData, payFields);
  const parsed = payInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const payment = parsed.data;
  const result = await withUser(userId, async (tx): Promise<FormState> => {
    const { accounts, balance } = await loadBalances(tx, userId, { lock: true });
    const [bill] = await tx.select().from(bills).where(and(eq(bills.id, payment.billId), eq(bills.userId, userId))).for("update");
    if (!bill) return { errors: { amount: "This bill is gone. Close and refresh." } };
    // FKs skip RLS, so only an account found among the user's own rows gets saved.
    const from = accounts.find((account) => account.id === payment.accountId);
    if (!from) return { errors: { accountId: "Pick an account." } };
    const left = bill.amount - (await paidThisCycle(tx, bill.id));
    if (payment.amount > left) return { errors: { amount: `Only ${formatMoney(left)} left this cycle.` } };
    if (balance(from.id)! < payment.amount) return { errors: { amount: `Only ${formatMoney(balance(from.id)!)} in ${from.name}.` } };

    await tx.insert(transactions).values({
      userId, type: "expense", amount: payment.amount, date: payment.date, accountId: from.id, billId: bill.id, payee: bill.name,
    });
    const completed = payment.amount === left;
    if (completed) {
      // now() is the transaction's start, the same as this payment's created_at, so it counts toward the cycle it closed.
      await tx.update(bills).set({ nextDueDate: nextDueDate(bill.nextDueDate, bill.repeat, bill.dueDay), cycleStart: sql`now()` })
        .where(eq(bills.id, bill.id));
    }
    return { ok: true, completed };
  });
  if (!result.ok) return { values, ...result };
  refresh();
  return result;
}
