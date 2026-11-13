"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { budgetMonths, categories } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { manilaMonth, parseMoney } from "@/lib/money";

export type FormState = {
  ok?: boolean;
  errors?: { budget?: string };
  values?: { budget: string }; // refills the form after React resets it
};

const limitInput = z.object({
  categoryId: z.uuid(),
  budget: z.string().transform((value, ctx) => {
    if (!value.trim()) return null;
    const centavos = parseMoney(value);
    if (!centavos) ctx.addIssue({ code: "custom", message: "Enter an amount above zero, like 5,000, or leave it blank." });
    return centavos || z.NEVER;
  }),
});

/** Sets this month's limit, or removes it when blank. Earlier months keep the limit they had. */
export async function saveLimit(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = { budget: String(formData.get("budget") ?? "") };
  const parsed = limitInput.safeParse({ categoryId: formData.get("categoryId"), ...values });
  if (!parsed.success) return { values, errors: { budget: z.flattenError(parsed.error).fieldErrors.budget?.[0] ?? "Close and refresh." } };

  const { categoryId, budget } = parsed.data;
  const month = manilaMonth(new Date());
  const missing = await withUser(userId, async (tx) => {
    // FKs skip RLS, so only a spending category found among the user's own rows gets a limit.
    const [category] = await tx.select({ id: categories.id }).from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId), eq(categories.kind, "spending")));
    if (!category) return true;
    await tx.insert(budgetMonths).values({ userId, categoryId, month, budget })
      .onConflictDoUpdate({ target: [budgetMonths.userId, budgetMonths.categoryId, budgetMonths.month], set: { budget } });
  });
  if (missing) return { values, errors: { budget: "This category is gone. Close and refresh." } };
  refresh();
  return { ok: true };
}
