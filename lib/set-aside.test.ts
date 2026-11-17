import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { and, eq, gt, sum } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { accounts, bills, debts, goals, installments, transactions } from "../db/schema";
import { withUser } from "./db";
import { billSetAside, debtSetAside, goalSetAside, installmentSetAside } from "./set-aside";

vi.mock("@/lib/auth/server", () => ({ getUserId: async () => currentUser }));
vi.mock("@/lib/settings", () => ({ getMoney: async () => String }));
vi.mock("next/cache", () => ({ refresh: () => {} }));

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

let currentUser = "";
const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day);

// Runs against the dev database as app_user, like rls.test.ts.
describe.skipIf(!process.env.DATABASE_URL)("set aside", () => {
  async function setup(userId: string) {
    return withUser(userId, async (tx) => {
      const [from] = await tx.insert(accounts).values({ userId, name: "Set aside test", startingBalance: 1_000_000 }).returning();
      const [holding] = await tx.insert(accounts).values({ userId, name: "Set aside holding" }).returning();
      const [bill] = await tx.insert(bills).values({ userId, name: "Rent", amount: 1_000_000, nextDueDate: "2026-12-01", dueDay: 1, repeat: "monthly", cycleStart: ago(1) }).returning();
      return { from, holding, bill };
    });
  }
  const cleanup = (userId: string) =>
    withUser(userId, async (tx) => {
      await tx.delete(transactions).where(eq(transactions.userId, userId));
      await tx.delete(goals).where(eq(goals.userId, userId));
      await tx.delete(debts).where(eq(debts.userId, userId));
      await tx.delete(bills).where(eq(bills.userId, userId));
      await tx.delete(installments).where(eq(installments.userId, userId));
      await tx.delete(accounts).where(eq(accounts.userId, userId));
    });
  const transfer = (userId: string, from: string, to: string, extra: Partial<typeof transactions.$inferInsert>) =>
    ({ userId, type: "transfer" as const, amount: 300_000, date: "2026-11-17", accountId: from, toAccountId: to, ...extra });

  it("counts a bill's transfers this cycle without touching what's paid", async () => {
    const userId = randomUUID();
    const s = await setup(userId);
    try {
      await withUser(userId, async (tx) => {
        await tx.insert(transactions).values([
          transfer(userId, s.from.id, s.holding.id, { setAsideBillId: s.bill.id }),
          transfer(userId, s.from.id, s.holding.id, { setAsideBillId: s.bill.id, amount: 100_000, createdAt: ago(5) }), // before the cycle: not counted
          { userId, type: "expense", amount: 200_000, date: "2026-11-17", accountId: s.from.id, billId: s.bill.id, payee: "Rent" },
        ]);
      });
      const [row] = await withUser(userId, (tx) =>
        tx.select({ setAside: billSetAside, paid: sum(transactions.amount).mapWith(Number) }).from(bills)
          .leftJoin(transactions, and(eq(transactions.billId, bills.id), gt(transactions.createdAt, bills.cycleStart)))
          .where(eq(bills.id, s.bill.id)).groupBy(bills.id),
      );
      expect(row).toEqual({ setAside: 300_000, paid: 200_000 });
    } finally {
      await cleanup(userId);
    }
  });

  it("counts an installment's transfers since its last payment", async () => {
    const userId = randomUUID();
    const s = await setup(userId);
    try {
      const [inst] = await withUser(userId, (tx) =>
        tx.insert(installments).values({ userId, name: "Phone", monthlyAmount: 300_000, months: 6, dueDay: 1, nextDueDate: "2026-12-01", accountId: s.from.id }).returning(),
      );
      await withUser(userId, (tx) =>
        tx.insert(transactions).values([
          transfer(userId, s.from.id, s.holding.id, { setAsideInstallmentId: inst.id, amount: 100_000, createdAt: ago(3) }),
          { userId, type: "expense", amount: 300_000, date: "2026-11-15", accountId: s.from.id, installmentId: inst.id, payee: "Phone", createdAt: ago(2) },
          transfer(userId, s.from.id, s.holding.id, { setAsideInstallmentId: inst.id, amount: 150_000 }),
        ]),
      );
      const [row] = await withUser(userId, (tx) => tx.select({ setAside: installmentSetAside }).from(installments).where(eq(installments.id, inst.id)));
      expect(row.setAside).toBe(150_000);
    } finally {
      await cleanup(userId);
    }
  });

  it("sums everything linked to a debt or a goal, not reduced by payments", async () => {
    const userId = randomUUID();
    const s = await setup(userId);
    try {
      const [debt] = await withUser(userId, (tx) => tx.insert(debts).values({ userId, name: "Loan", total: 2_000_000, deadline: "2027-01-01" }).returning());
      const [goal] = await withUser(userId, (tx) => tx.insert(goals).values({ userId, name: "Trip", target: 2_000_000, deadline: "2027-01-01", accountId: s.holding.id }).returning());
      await withUser(userId, (tx) =>
        tx.insert(transactions).values([
          transfer(userId, s.from.id, s.holding.id, { setAsideDebtId: debt.id, createdAt: ago(40) }),
          transfer(userId, s.from.id, s.holding.id, { setAsideDebtId: debt.id, amount: 200_000 }),
          { userId, type: "expense", amount: 100_000, date: "2026-11-17", accountId: s.from.id, debtId: debt.id, payee: "Loan" },
          transfer(userId, s.from.id, s.holding.id, { setAsideGoalId: goal.id, amount: 400_000 }),
        ]),
      );
      const [d] = await withUser(userId, (tx) => tx.select({ setAside: debtSetAside }).from(debts).where(eq(debts.id, debt.id)));
      const [g] = await withUser(userId, (tx) => tx.select({ setAside: goalSetAside }).from(goals).where(eq(goals.id, goal.id)));
      expect([d.setAside, g.setAside]).toEqual([500_000, 400_000]);
    } finally {
      await cleanup(userId);
    }
  });

  it("allows one link, on a transfer only", async () => {
    const userId = randomUUID();
    const s = await setup(userId);
    try {
      const [inst] = await withUser(userId, (tx) =>
        tx.insert(installments).values({ userId, name: "Phone", monthlyAmount: 100, months: 2, dueDay: 1, nextDueDate: "2026-12-01", accountId: s.from.id }).returning(),
      );
      await expect(withUser(userId, (tx) =>
        tx.insert(transactions).values({ userId, type: "income", amount: 100, date: "2026-11-17", accountId: s.from.id, setAsideBillId: s.bill.id }),
      )).rejects.toThrow();
      await expect(withUser(userId, (tx) =>
        tx.insert(transactions).values(transfer(userId, s.from.id, s.holding.id, { setAsideBillId: s.bill.id, setAsideInstallmentId: inst.id })),
      )).rejects.toThrow();
    } finally {
      await cleanup(userId);
    }
  });

  it("clears the link and keeps the transfer when the bill is deleted", async () => {
    const userId = randomUUID();
    const s = await setup(userId);
    try {
      await withUser(userId, (tx) => tx.insert(transactions).values(transfer(userId, s.from.id, s.holding.id, { setAsideBillId: s.bill.id })));
      await withUser(userId, (tx) => tx.delete(bills).where(eq(bills.id, s.bill.id)));
      const rows = await withUser(userId, (tx) => tx.select().from(transactions));
      expect(rows).toEqual([expect.objectContaining({ type: "transfer", amount: 300_000, setAsideBillId: null })]);
    } finally {
      await cleanup(userId);
    }
  });

  it("refuses another user's item, and saves your own", async () => {
    const [a, b] = [randomUUID(), randomUUID()];
    const [sa, sb] = [await setup(a), await setup(b)];
    const { saveEntry } = await import("../app/(app)/activity/actions");
    const form = (from: string, to: string, setAside: string) => {
      const data = new FormData();
      for (const [key, value] of Object.entries({ type: "transfer", accountId: from, toAccountId: to, amount: "10", date: "2026-11-17", setAside })) data.set(key, value);
      return data;
    };
    try {
      currentUser = a;
      const refused = await saveEntry({}, form(sa.from.id, sa.holding.id, `bill:${sb.bill.id}`));
      expect(refused.errors?.setAside).toBeTruthy();
      expect(await withUser(a, (tx) => tx.select().from(transactions))).toEqual([]);

      const saved = await saveEntry({}, form(sa.from.id, sa.holding.id, `bill:${sa.bill.id}`));
      expect(saved.ok).toBe(true);
      expect(await withUser(a, (tx) => tx.select().from(transactions))).toEqual([expect.objectContaining({ setAsideBillId: sa.bill.id, billId: null })]);
    } finally {
      await Promise.all([cleanup(a), cleanup(b)]);
    }
  });
});
