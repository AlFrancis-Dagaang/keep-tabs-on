import { asc, eq, sql } from "drizzle-orm";
import { bills, debts, goals, installments } from "@/db/schema";
import type { Tx } from "@/lib/db";

/** The user's bills, debts, installments and goals as the For choices of a transfer: value is "kind:id". */
export async function loadSetAsideItems(tx: Tx, userId: string) {
  const named = [
    ["bill", "Bills", bills],
    ["debt", "Debts", debts],
    ["installment", "Installments", installments],
    ["goal", "Goals", goals],
  ] as const;
  const groups = await Promise.all(named.map(async ([kind, group, table]) => {
    const rows = await tx.select({ id: table.id, name: table.name }).from(table).where(eq(table.userId, userId)).orderBy(asc(table.name));
    return rows.map((row) => ({ value: `${kind}:${row.id}`, label: `${row.name} · ${kind}`, name: row.name, group }));
  }));
  return groups.flat();
}

// One correlated subquery per kind, so a page's paid sum (a left join on transactions) isn't multiplied by a second join.
// Aliased `sa`, and the outer table named in full: drizzle drops the qualifier in a single-table select, and a bare "id" would read sa.id.
const sum = (kind: "bill" | "debt" | "installment" | "goal", table: string, since = sql``) =>
  sql<number>`coalesce((select sum(sa.amount) from transactions sa where sa.${sql.raw(`set_aside_${kind}_id`)} = ${sql.identifier(table)}.id${since}), 0)`.mapWith(Number);

/** Set aside for a bill this cycle: transfers after the cycle start, like what's paid. */
export const billSetAside = sum("bill", "bills", sql` and sa.created_at > "bills"."cycle_start"`);
/** Set aside for an installment since its last payment. */
export const installmentSetAside = sum(
  "installment",
  "installments",
  sql` and sa.created_at > coalesce((select max(p.created_at) from transactions p where p.installment_id = "installments"."id"), '-infinity')`,
);
/** Set aside for a debt or a goal: everything linked, payments don't reduce it. */
export const debtSetAside = sum("debt", "debts");
export const goalSetAside = sum("goal", "goals");
