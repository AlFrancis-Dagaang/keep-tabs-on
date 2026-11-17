"use server";

import { and, count, eq, gt, ne, sql, sum } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { bills, categories, debts, goals, installments, transactions } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { loadBalances } from "@/lib/balances";
import { withUser } from "@/lib/db";
import { balancesAfterEdit, installmentDueAfterRemove, isLinked, maxPaymentAmount, parseMoney, previousDueDate } from "@/lib/money";
import { getMoney } from "@/lib/settings";

const fields = ["type", "accountId", "toAccountId", "toName", "categoryId", "amount", "date", "payee", "note", "setAside", "paidTo"] as const;
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
    // "kind:id" of a bill, debt, installment or goal, or blank.
    setAside: z.string().regex(/^((bill|debt|installment|goal):[0-9a-f-]{36})?$/, "Pick something from the list."),
    ...common,
  })
    .refine((entry) => entry.toAccountId || entry.toName, { path: ["toAccountId"], message: "Pick the account it goes to, or enter a name." })
    .refine((entry) => !(entry.toAccountId && entry.toName), { path: ["toAccountId"], message: "Pick an account or enter a name, not both." })
    .refine((entry) => entry.toAccountId !== entry.accountId, { path: ["toAccountId"], message: "Pick a different account." }),
]);

/** Records an income, expense or transfer (to an account or to a name), or with an id edits one. Refuses when it would take an account below zero. */
export async function saveEntry(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const money = await getMoney();
  const values = Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<Field, string>;
  const id = formData.get("id") ? z.uuid().parse(formData.get("id")) : undefined;
  const parsed = entryInput.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { values, errors: Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages?.[0]])) };
  }

  const { setAside, ...entry } = { setAside: "", ...parsed.data };
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    const { accounts, entries, balance } = await loadBalances(tx, userId, { lock: true });
    if (id) {
      const [old] = await tx.select({ billId: transactions.billId, debtId: transactions.debtId, goalId: transactions.goalId, installmentId: transactions.installmentId })
        .from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
      if (!old) return { type: "This entry no longer exists." };
      if (isLinked(old)) return { type: "Entries made by a bill, debt, goal or installment can't be edited." };
    }
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
    const [kind, itemId] = setAside.split(":");
    const table = { bill: bills, debt: debts, installment: installments, goal: goals }[kind as "bill"];
    if (table) {
      const [item] = await tx.select({ id: table.id }).from(table).where(and(eq(table.id, itemId), eq(table.userId, userId)));
      if (!item) return { setAside: "Pick something from the list." };
    }
    const link = {
      setAsideBillId: kind === "bill" ? itemId : null,
      setAsideDebtId: kind === "debt" ? itemId : null,
      setAsideInstallmentId: kind === "installment" ? itemId : null,
      setAsideGoalId: kind === "goal" ? itemId : null,
    };
    const row = entry.type === "transfer"
      ? { ...entry, ...link, categoryId: null, toAccountId: entry.toAccountId || null, toName: entry.toName || null }
      : { ...entry, toAccountId: null, toName: null, setAsideBillId: null, setAsideDebtId: null, setAsideInstallmentId: null, setAsideGoalId: null };
    if (id) {
      // An edit can lower the old account, the new one or a transfer's target, so every account is rechecked.
      const short = balancesAfterEdit(accounts, entries, id, row);
      if (short) return { amount: `This would take ${short.name} below zero.` };
      await tx.update(transactions).set(row).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    } else {
      if (entry.type !== "income" && balance(from.id)! < entry.amount) {
        return { amount: `Only ${money(balance(from.id)!)} in ${from.name}.` };
      }
      await tx.insert(transactions).values({ userId, ...row });
    }
  });
  if (errors) return { values, errors };
  refresh();
  return { ok: true };
}

const paymentInput = z.object({
  accountId: common.accountId,
  amount,
  date: common.date,
  paidTo: z.string().trim().max(60, "Keep the name under 60 characters.").transform((name) => name || null),
  note: common.note,
});

/** Edits the amount, date, account, who was paid and note of a bill, installment, debt or goal payment. Progress and due dates follow the cycle and the count, never the date. */
export async function editPayment(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const money = await getMoney();
  const values = Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<Field, string>;
  const id = z.uuid().parse(formData.get("id"));
  const parsed = paymentInput.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { values, errors: Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages?.[0]])) };
  }

  const payment = parsed.data;
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    const { accounts, entries } = await loadBalances(tx, userId, { lock: true });
    const [old] = await tx.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    if (!old || !isLinked(old)) return { amount: "This payment no longer exists." };
    // FKs skip RLS, so only an account found among the user's own rows gets saved.
    if (!accounts.some((account) => account.id === payment.accountId)) return { accountId: "Pick an account." };
    const others = async (link: ReturnType<typeof eq>) => {
      const [row] = await tx.select({ n: sum(transactions.amount).mapWith(Number) }).from(transactions).where(and(link, ne(transactions.id, id)));
      return row?.n ?? 0;
    };
    let max: number | undefined;
    if (old.billId) {
      const [bill] = await tx.select({ amount: bills.amount, open: sql<boolean>`${transactions.createdAt} > ${bills.cycleStart}` })
        .from(transactions).innerJoin(bills, eq(transactions.billId, bills.id)).where(eq(transactions.id, id));
      if (!bill) return { amount: "This bill is gone. Close and refresh." };
      // Only the open cycle's payments change amount: an edit can't finish a cycle or change one already closed.
      if (!bill.open && payment.amount !== old.amount) return { amount: "The amount is locked: this payment is in a finished cycle. Remove it and record it again." };
      if (bill.open) {
        const [row] = await tx.select({ n: sum(transactions.amount).mapWith(Number) }).from(transactions).innerJoin(bills, eq(transactions.billId, bills.id))
          .where(and(eq(bills.id, old.billId), gt(transactions.createdAt, bills.cycleStart), ne(transactions.id, id)));
        max = maxPaymentAmount(bill.amount, row?.n ?? 0, true);
      }
    } else if (old.debtId) {
      const [debt] = await tx.select({ total: debts.total, paidBefore: debts.paidBefore }).from(debts).where(eq(debts.id, old.debtId));
      if (debt) max = maxPaymentAmount(debt.total - debt.paidBefore, await others(eq(transactions.debtId, old.debtId)));
    } else if (old.goalId) {
      const [goal] = await tx.select({ target: goals.target, savedBefore: goals.savedBefore, accountId: goals.accountId }).from(goals).where(eq(goals.id, old.goalId));
      if (goal) {
        if (payment.accountId === goal.accountId) return { accountId: "Pick an account other than the one the goal is saved in." };
        max = maxPaymentAmount(goal.target - goal.savedBefore, await others(eq(transactions.goalId, old.goalId)));
      }
    }
    if (max !== undefined && payment.amount > max) return { amount: `Only ${money(max)} fits.` };
    // The edit can lower the old account, the new one or a goal's account, so every account is rechecked.
    const short = balancesAfterEdit(accounts, entries, id, { ...entries.find((entry) => entry.id === id)!, ...payment });
    if (short) return { amount: `This would take ${short.name} below zero.` };
    await tx.update(transactions).set({ accountId: payment.accountId, amount: payment.amount, date: payment.date, paidTo: old.goalId ? null : payment.paidTo, note: payment.note }).where(eq(transactions.id, id));
  });
  if (errors) return { values, errors };
  refresh();
  return { ok: true };
}

/** Refuses when the money it brought in is already spent: the account would drop below zero. A bill payment that closed a cycle reopens it, and an installment payment steps its due date back. */
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
    if (entry.billId) {
      const [bill] = await tx.select().from(bills).where(eq(bills.id, entry.billId)).for("update");
      // The payment that closed a cycle has the same created_at as the bill's cycle_start (one transaction's now()), compared in SQL.
      const [closing] = await tx.select({ id: transactions.id }).from(transactions).innerJoin(bills, eq(transactions.billId, bills.id))
        .where(and(eq(transactions.id, id), eq(transactions.createdAt, bills.cycleStart)));
      if (bill && closing) {
        if (!entry.rolledCycleStart) return "This payment closed a cycle before undo was tracked, so it can't be removed.";
        const [next] = await tx.select({ n: count() }).from(transactions).innerJoin(bills, eq(transactions.billId, bills.id))
          .where(and(eq(bills.id, bill.id), gt(transactions.createdAt, bills.cycleStart)));
        if (next.n) return "The next cycle already has payments. Remove those first.";
        await tx.update(bills).set({
          nextDueDate: previousDueDate(bill.nextDueDate, bill.repeat, bill.dueDay),
          cycleStart: sql`(select rolled_cycle_start from transactions where id = ${id})`,
        }).where(eq(bills.id, bill.id));
      }
    }
    if (entry.installmentId) {
      const [installment] = await tx.select().from(installments).where(eq(installments.id, entry.installmentId)).for("update");
      if (installment) {
        const [paid] = await tx.select({ n: count() }).from(transactions).where(eq(transactions.installmentId, installment.id));
        await tx.update(installments)
          .set({ nextDueDate: installmentDueAfterRemove(installment.nextDueDate, installment.dueDay, installment.paidBefore + paid.n, installment.months) })
          .where(eq(installments.id, installment.id));
      }
    }
    await tx.delete(transactions).where(own);
  });
  if (error) return { error };
  refresh();
  return {};
}
