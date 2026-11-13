"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accounts, bills, budgetMonths, categories, debts, goals, settings } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { currencies, manilaMonth, parseMoney } from "@/lib/money";

export type SetupRows = Record<"accounts" | "spending" | "income" | "bills" | "goals" | "debts", Record<string, string>[]>;
export type SetupResult = { errors: Record<string, string> }; // keyed "section.row.field"; "form" for anything else

// shortcut: these field rules repeat the Accounts, Bills, Goals and Debts actions'; share them if a sixth caller appears.
const name = z.string().trim().min(1, "Enter a name.").max(60, "Keep the name under 60 characters.");
const positive = z.string().transform((value, ctx) => {
  const centavos = parseMoney(value);
  if (!centavos) ctx.addIssue({ code: "custom", message: "Enter an amount above zero, like 1,234.56." });
  return centavos || z.NEVER;
});
// Blank means none: no budget, nothing saved or paid before (0).
const amountOrBlank = z.string().transform((value, ctx) => {
  const centavos = value.trim() ? parseMoney(value) : 0;
  if (centavos === null) ctx.addIssue({ code: "custom", message: "Enter an amount like 1,234.56 (no minus sign)." });
  return centavos ?? z.NEVER;
});
const date = z.iso.date("Pick a date.");

const rowSchemas = {
  accounts: z.object({
    name,
    balance: z.string().transform((value, ctx) => {
      const centavos = parseMoney(value);
      if (centavos === null) ctx.addIssue({ code: "custom", message: "Enter an amount like 1,234.56 (no minus sign)." });
      return centavos ?? z.NEVER;
    }),
  }),
  spending: z.object({ name: name.max(40), budget: amountOrBlank }),
  income: z.object({ name: name.max(40) }),
  bills: z.object({ name, amount: positive, nextDueDate: date, repeat: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"], "Pick how often it repeats.") }),
  goals: z.object({ name, target: positive, deadline: date, account: z.string().min(1, "Pick an account."), savedBefore: amountOrBlank }),
  debts: z.object({ name, total: positive, deadline: date, paidBefore: amountOrBlank }),
};

type Parsed = { [K in keyof typeof rowSchemas]: { index: number; row: z.output<(typeof rowSchemas)[K]> }[] };

/** Saves everything the setup form collected and marks setup done, or returns the errors and writes nothing. */
export async function finishSetup(input: { currency: string; rows: SetupRows }): Promise<SetupResult> {
  const userId = await getUserId();
  const errors: Record<string, string> = {};
  const currency = z.enum(currencies).safeParse(input.currency);
  if (!currency.success) errors.form = "Pick a currency.";

  const parsed: Record<string, { index: number; row: Record<string, unknown> }[]> = {};
  for (const section of Object.keys(rowSchemas) as (keyof typeof rowSchemas)[]) {
    parsed[section] = [];
    (input.rows[section] ?? []).forEach((row, index) => {
      // Untouched rows are skipped; a bill's repeat starts filled in, so it doesn't count.
      if (!Object.entries(row).some(([field, value]) => field !== "repeat" && String(value).trim())) return;
      const result = rowSchemas[section].safeParse(row);
      if (result.success) parsed[section].push({ index, row: result.data });
      else for (const [field, messages] of Object.entries(z.flattenError(result.error).fieldErrors)) errors[`${section}.${index}.${field}`] = (messages as string[])[0];
    });
  }
  const rows = parsed as unknown as Parsed;

  if (!rows.accounts.length) errors["accounts.none"] = "Add at least one account.";
  for (const section of ["spending", "income"] as const) {
    const seen = new Set<string>();
    for (const { index, row } of rows[section]) {
      if (seen.has(row.name)) errors[`${section}.${index}.name`] = "You already have this category.";
      seen.add(row.name);
    }
  }
  for (const { index, row } of rows.goals) {
    if (!rows.accounts.some((account) => String(account.index) === row.account)) errors[`goals.${index}.account`] = "Pick an account.";
    else if (row.savedBefore > row.target) errors[`goals.${index}.savedBefore`] = "Can't be more than the target.";
  }
  for (const { index, row } of rows.debts) {
    if (row.paidBefore > row.total) errors[`debts.${index}.paidBefore`] = "Can't be more than the total.";
  }
  if (Object.keys(errors).length || !currency.success) return { errors };

  await withUser(userId, async (tx) => {
    const [existing] = await tx.select({ done: settings.setupDone }).from(settings).where(eq(settings.userId, userId));
    if (existing?.done) return; // a second submit after setup finished

    const accountIds = new Map<string, string>();
    const created = await tx.insert(accounts)
      .values(rows.accounts.map(({ row }) => ({ userId, name: row.name, startingBalance: row.balance })))
      .returning({ id: accounts.id });
    rows.accounts.forEach(({ index }, i) => accountIds.set(String(index), created[i].id));

    const spending = rows.spending.length
      ? await tx.insert(categories).values(rows.spending.map(({ row }) => ({ userId, name: row.name, kind: "spending" as const }))).returning({ id: categories.id })
      : [];
    if (rows.income.length) await tx.insert(categories).values(rows.income.map(({ row }) => ({ userId, name: row.name, kind: "income" as const })));
    const limits = rows.spending.flatMap(({ row }, i) => (row.budget ? [{ userId, categoryId: spending[i].id, month: manilaMonth(new Date()), budget: row.budget }] : []));
    if (limits.length) await tx.insert(budgetMonths).values(limits);

    if (rows.bills.length) {
      await tx.insert(bills).values(rows.bills.map(({ row }) => ({
        userId, name: row.name, amount: row.amount, nextDueDate: row.nextDueDate, dueDay: Number(row.nextDueDate.slice(8)), repeat: row.repeat,
      })));
    }
    if (rows.goals.length) {
      await tx.insert(goals).values(rows.goals.map(({ row }) => ({
        userId, name: row.name, target: row.target, deadline: row.deadline, accountId: accountIds.get(row.account)!, savedBefore: row.savedBefore,
      })));
    }
    if (rows.debts.length) {
      await tx.insert(debts).values(rows.debts.map(({ row }) => ({ userId, name: row.name, total: row.total, deadline: row.deadline, paidBefore: row.paidBefore })));
    }

    await tx.insert(settings).values({ userId, currency: currency.data, setupDone: true })
      .onConflictDoUpdate({ target: settings.userId, set: { currency: currency.data, setupDone: true } });
  });
  redirect("/");
}
