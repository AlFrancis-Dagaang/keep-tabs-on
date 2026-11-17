import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { and, eq, gt, sql, sum } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { accounts, bills, debts, goals, installments, transactions } from "../db/schema";
import { withUser } from "./db";
import { billSetAside, debtSetAside, goalSetAside, installmentSetAside, loadSetAsideRows } from "./set-aside";

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

  it("lists what is set aside, biggest first, with the Total and each row's status", async () => {
    const userId = randomUUID();
    const s = await setup(userId);
    try {
      const [debt] = await withUser(userId, (tx) => tx.insert(debts).values({ userId, name: "Loan", total: 140_000, setAsideBefore: 20_000, deadline: "2027-01-01" }).returning());
      const [goal] = await withUser(userId, (tx) => tx.insert(goals).values({ userId, name: "Trip", target: 250_000, deadline: "2027-01-01", accountId: s.holding.id }).returning());
      await withUser(userId, (tx) => tx.insert(debts).values({ userId, name: "Lent", direction: "owed", total: 50_000, setAsideBefore: 50_000, deadline: "2027-01-01" }));
      const [empty] = await withUser(userId, (tx) => tx.insert(goals).values({ userId, name: "Nothing", target: 100, deadline: "2027-01-01", accountId: s.holding.id }).returning());
      const [inst] = await withUser(userId, (tx) =>
        tx.insert(installments).values({ userId, name: "Phone", monthlyAmount: 195_792, months: 6, dueDay: 1, nextDueDate: "2026-12-01", accountId: s.from.id }).returning(),
      );
      await withUser(userId, (tx) =>
        tx.insert(transactions).values([
          transfer(userId, s.from.id, s.holding.id, { setAsideBillId: s.bill.id, amount: 1_100_000 }), // over the bill: still ready
          transfer(userId, s.from.id, s.holding.id, { setAsideGoalId: goal.id, amount: 250_000 }), // equal to the target: ready
          transfer(userId, s.from.id, s.holding.id, { setAsideInstallmentId: inst.id, amount: 100_000 }), // under
          transfer(userId, s.from.id, s.holding.id, { setAsideDebtId: debt.id, amount: 70_000 }), // 70,000 + 20,000 before tracking, under
        ]),
      );
      const { rows, total } = await withUser(userId, (tx) => loadSetAsideRows(tx, userId));
      expect(rows.map(({ kind, setAside, outOf, ready, toGo, full }) => ({ kind, setAside, outOf, ready, toGo, full }))).toEqual([
        { kind: "bill", setAside: 1_100_000, outOf: 1_000_000, ready: true, toGo: 0, full: false },
        { kind: "goal", setAside: 250_000, outOf: 250_000, ready: true, toGo: 0, full: true },
        { kind: "installment", setAside: 100_000, outOf: 195_792, ready: false, toGo: 95_792, full: false },
        { kind: "debt", setAside: 90_000, outOf: 140_000, ready: false, toGo: 50_000, full: false },
        { kind: "debt", setAside: 50_000, outOf: 50_000, ready: true, toGo: 0, full: true }, // owed to you: "Full", not "Ready to pay"
      ]);
      expect(rows.some((row) => row.id === empty.id)).toBe(false);
      expect(total).toBe(1_590_000); // Out of is never summed
      const [g] = await withUser(userId, (tx) => tx.select({ setAside: goalSetAside }).from(goals).where(eq(goals.id, goal.id)));
      expect(rows.find((row) => row.id === goal.id)?.setAside).toBe(g.setAside);
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
  describe("set aside before tracking", () => {
    it("adds to a goal's and a debt's linked transfers without touching Saved or Paid", async () => {
      const userId = randomUUID();
      const s = await setup(userId);
      try {
        const [debt] = await withUser(userId, (tx) => tx.insert(debts).values({ userId, name: "Loan", total: 2_000_000, deadline: "2027-01-01", paidBefore: 100_000, setAsideBefore: 200_000 }).returning());
        const [goal] = await withUser(userId, (tx) => tx.insert(goals).values({ userId, name: "Trip", target: 2_500_000, deadline: "2027-01-01", accountId: s.holding.id, savedBefore: 150_000, setAsideBefore: 1_500_000 }).returning());
        await withUser(userId, (tx) =>
          tx.insert(transactions).values([
            transfer(userId, s.from.id, s.holding.id, { setAsideDebtId: debt.id, amount: 700_000 }),
            transfer(userId, s.from.id, s.holding.id, { setAsideGoalId: goal.id, amount: 1_000_000 }),
          ]),
        );
        const [d] = await withUser(userId, (tx) =>
          tx.select({ setAside: debtSetAside, paid: sql<number>`${debts.paidBefore} + coalesce(sum(${transactions.amount}), 0)`.mapWith(Number) }).from(debts)
            .leftJoin(transactions, eq(transactions.debtId, debts.id)).where(eq(debts.id, debt.id)).groupBy(debts.id),
        );
        const [g] = await withUser(userId, (tx) =>
          tx.select({ setAside: goalSetAside, saved: sql<number>`${goals.savedBefore} + coalesce(sum(${transactions.amount}), 0)`.mapWith(Number) }).from(goals)
            .leftJoin(transactions, eq(transactions.goalId, goals.id)).where(eq(goals.id, goal.id)).groupBy(goals.id),
        );
        expect(d).toEqual({ setAside: 900_000, paid: 100_000 });
        expect(g).toEqual({ setAside: 2_500_000, saved: 150_000 });
      } finally {
        await cleanup(userId);
      }
    });

    it("counts a bill's amount until the cycle rolls, and again if the roll is undone", async () => {
      const userId = randomUUID();
      const s = await setup(userId);
      const figure = async () => (await withUser(userId, (tx) => tx.select({ setAside: billSetAside }).from(bills).where(eq(bills.id, s.bill.id))))[0].setAside;
      try {
        await withUser(userId, (tx) => tx.update(bills).set({ setAsideBefore: 300_000, setAsideBeforeAt: ago(1), cycleStart: ago(2) }).where(eq(bills.id, s.bill.id)));
        expect(await figure()).toBe(300_000);
        await withUser(userId, (tx) => tx.update(bills).set({ cycleStart: new Date() }).where(eq(bills.id, s.bill.id)));
        expect(await figure()).toBe(0);
        await withUser(userId, (tx) => tx.update(bills).set({ cycleStart: ago(2) }).where(eq(bills.id, s.bill.id)));
        expect(await figure()).toBe(300_000);
      } finally {
        await cleanup(userId);
      }
    });

    it("counts an installment's amount until the next payment, and again if it is removed", async () => {
      const userId = randomUUID();
      const s = await setup(userId);
      try {
        const [inst] = await withUser(userId, (tx) =>
          tx.insert(installments).values({ userId, name: "Phone", monthlyAmount: 300_000, months: 6, dueDay: 1, nextDueDate: "2026-12-01", accountId: s.from.id, setAsideBefore: 500_000, setAsideBeforeAt: ago(1) }).returning(),
        );
        const figure = async () => (await withUser(userId, (tx) => tx.select({ setAside: installmentSetAside }).from(installments).where(eq(installments.id, inst.id))))[0].setAside;
        expect(await figure()).toBe(500_000);
        const [payment] = await withUser(userId, (tx) =>
          tx.insert(transactions).values({ userId, type: "expense", amount: 300_000, date: "2026-11-17", accountId: s.from.id, installmentId: inst.id, payee: "Phone" }).returning(),
        );
        expect(await figure()).toBe(0);
        await withUser(userId, (tx) => tx.delete(transactions).where(eq(transactions.id, payment.id)));
        expect(await figure()).toBe(500_000);
      } finally {
        await cleanup(userId);
      }
    });

    it("restamps a bill only when the amount changes, and refuses a negative one", async () => {
      const userId = randomUUID();
      const s = await setup(userId);
      const { saveBill } = await import("../app/(app)/bills/actions");
      const form = (name: string, setAside: string) => {
        const data = new FormData();
        for (const [key, value] of Object.entries({ id: s.bill.id, name, amount: "10000", setAsideBefore: setAside, nextDueDate: "2026-12-01", repeat: "monthly", note: "" })) data.set(key, value);
        return data;
      };
      const stamp = async () => (await withUser(userId, (tx) => tx.select({ at: bills.setAsideBeforeAt, n: bills.setAsideBefore }).from(bills).where(eq(bills.id, s.bill.id))))[0];
      try {
        currentUser = userId;
        await withUser(userId, (tx) => tx.update(bills).set({ setAsideBefore: 300_000, setAsideBeforeAt: ago(10) }).where(eq(bills.id, s.bill.id)));
        expect((await saveBill({}, form("Rent 2", "3000"))).ok).toBe(true);
        expect((await stamp()).at.getTime()).toBeLessThan(ago(9).getTime());
        expect((await saveBill({}, form("Rent 2", "4000"))).ok).toBe(true);
        const changed = await stamp();
        expect(changed.n).toBe(400_000);
        expect(changed.at.getTime()).toBeGreaterThan(ago(1).getTime());
        expect((await saveBill({}, form("Rent 2", "-5"))).errors?.setAsideBefore).toBeTruthy();
      } finally {
        await cleanup(userId);
      }
    });
  });
});
