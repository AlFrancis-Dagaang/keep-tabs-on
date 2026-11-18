"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { goals } from "@/db/schema";
import { getUserId } from "@/lib/auth/server";
import { withUser } from "@/lib/db";
import { parseMoney } from "@/lib/money";

const goalFields = ["id", "name", "target", "deadline", "setAsideBefore", "note"] as const;
type Field = (typeof goalFields)[number];

export type FormState = {
  ok?: boolean;
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
  setAsideBefore: z.string().transform((value, ctx) => {
    const centavos = value.trim() ? parseMoney(value) : 0;
    if (centavos === null) ctx.addIssue({ code: "custom", message: "Enter an amount like 1,234.56, or leave it blank." });
    return centavos ?? z.NEVER;
  }),
  note: z.string().trim().max(200, "Keep the note under 200 characters.").transform((note) => note || null),
});

function read<F extends Field>(formData: FormData, fields: readonly F[]) {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")])) as Record<F, string>;
}

function fieldErrors(error: z.ZodError): FormState["errors"] {
  return Object.fromEntries(Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [field, (messages as string[])?.[0]]));
}

/** Creates a goal, or edits one. A goal can hold more than its target. */
export async function saveGoal(_: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  const values = read(formData, goalFields);
  const parsed = goalInput.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) };

  const { id, ...goal } = parsed.data;
  const errors = await withUser(userId, async (tx): Promise<FormState["errors"]> => {
    const own = and(eq(goals.id, id), eq(goals.userId, userId));
    const [current] = id ? await tx.select({ id: goals.id }).from(goals).where(own).for("update") : [];
    if (id && !current) return { name: "This goal is gone. Close and refresh." };
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
