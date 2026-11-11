"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { categories } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";

export type FormState = {
  ok?: boolean;
  errors?: { name?: string };
  values?: { name: string }; // refills the form after React resets it
};

const categoryInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(40, "Keep the name under 40 characters."),
  kind: z.enum(["spending", "income"]),
});

/** Adds a category, or renames it when the form has an id. Its kind never changes. */
export async function saveCategory(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = { name: String(formData.get("name") ?? "") };
  const parsed = categoryInput.safeParse({ id: formData.get("id") || undefined, kind: formData.get("kind"), ...values });
  if (!parsed.success) return { values, errors: { name: z.flattenError(parsed.error).fieldErrors.name?.[0] } };

  const { id, name, kind } = parsed.data;
  const taken = await withUser(userId, async (tx) => {
    const same = and(eq(categories.userId, userId), eq(categories.kind, kind), eq(categories.name, name));
    const [duplicate] = await tx.select({ id: categories.id }).from(categories).where(id ? and(same, ne(categories.id, id)) : same);
    if (duplicate) return true;
    if (!id) await tx.insert(categories).values({ userId, name, kind });
    else await tx.update(categories).set({ name }).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  });
  if (taken) return { values, errors: { name: `You already have ${name}.` } };
  refresh();
  return { ok: true };
}

/** Entries that used it stay, shown as Uncategorized (the FK sets category_id to null). */
export async function deleteCategory(formData: FormData) {
  const userId = await getUserId();
  const id = z.uuid().parse(formData.get("id"));
  await withUser(userId, (tx) => tx.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))));
  refresh();
}
