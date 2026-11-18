import { and, asc, eq, isNull, sql } from "drizzle-orm";
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
// `before` is the amount set aside before tracking (set_aside_before), added once the item says it still counts.
const sum = (kind: "bill" | "debt" | "installment" | "goal", table: string, since = sql``, before = sql.raw(`"${table}"."set_aside_before"`)) =>
  sql<number>`coalesce((select sum(sa.amount) from transactions sa where sa.${sql.raw(`set_aside_${kind}_id`)} = ${sql.identifier(table)}.id${since}), 0) + ${before}`.mapWith(Number);

/** Set aside for a bill this cycle: transfers after the cycle start, like what's paid, plus the before-tracking amount until the cycle rolls past it. */
export const billSetAside = sum(
  "bill",
  "bills",
  sql` and sa.created_at > "bills"."cycle_start"`,
  sql`case when "bills"."cycle_start" <= "bills"."set_aside_before_at" then "bills"."set_aside_before" else 0 end`,
);
/** Set aside for an installment since its last payment, plus the before-tracking amount until a payment comes after it. */
export const installmentSetAside = sum(
  "installment",
  "installments",
  sql` and sa.created_at > coalesce((select max(p.created_at) from transactions p where p.installment_id = "installments"."id"), '-infinity')`,
  sql`case when not exists (select 1 from transactions p where p.installment_id = "installments"."id" and p.created_at > "installments"."set_aside_before_at") then "installments"."set_aside_before" else 0 end`,
);
/** Set aside for a debt or a goal: everything linked plus the before-tracking amount, payments don't reduce it. */
export const debtSetAside = sum("debt", "debts");
export const goalSetAside = sum("goal", "goals");

export type SetAsideRow = { kind: "bill" | "debt" | "installment" | "goal"; id: string; name: string; setAside: number; outOf: number; ready: boolean; toGo: number; full: boolean };

/** Everything set aside, biggest first, for the Set aside page. Items with nothing set aside are left out; total sums Set aside only. */
export async function loadSetAsideRows(tx: Tx, userId: string) {
  const [billRows, debtRows, installmentRows, goalRows] = await Promise.all([
    tx.select({ id: bills.id, name: bills.name, setAside: billSetAside, outOf: bills.amount }).from(bills).where(eq(bills.userId, userId)),
    tx.select({ id: debts.id, name: debts.name, setAside: debtSetAside, outOf: debts.total, direction: debts.direction }).from(debts).where(eq(debts.userId, userId)),
    tx.select({ id: installments.id, name: installments.name, setAside: installmentSetAside, outOf: installments.monthlyAmount }).from(installments).where(eq(installments.userId, userId)),
    tx.select({ id: goals.id, name: goals.name, setAside: goalSetAside, outOf: goals.target }).from(goals).where(and(eq(goals.userId, userId), isNull(goals.doneAt))),
  ]);
  // full: the pill reads "Full" instead of "Ready to pay", for a goal and for a debt owed to you (nothing for you to pay).
  const tag = <T extends { setAside: number; outOf: number; direction?: string }>(kind: SetAsideRow["kind"], list: T[]) =>
    list.map((row) => ({ ...row, kind, full: kind === "goal" || row.direction === "owed", ready: row.setAside >= row.outOf, toGo: Math.max(row.outOf - row.setAside, 0) }));
  const rows: SetAsideRow[] = [...tag("goal", goalRows), ...tag("installment", installmentRows), ...tag("debt", debtRows), ...tag("bill", billRows)]
    .filter((row) => row.setAside > 0)
    .sort((a, b) => b.setAside - a.setAside || a.name.localeCompare(b.name));
  return { rows, total: rows.reduce((sum, row) => sum + row.setAside, 0) };
}
