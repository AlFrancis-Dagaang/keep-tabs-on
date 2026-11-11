import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts, bills, categories, transactions } from "../db/schema";
import { withUser } from "./db";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Runs against the real database as app_user, so it proves the policies, not just our filters.
describe.skipIf(!process.env.DATABASE_URL)("RLS", () => {
  it("hides one user's accounts from another", async () => {
    const [a, b] = [randomUUID(), randomUUID()];
    const [mine] = await withUser(a, (tx) =>
      tx.insert(accounts).values({ userId: a, name: "RLS test", startingBalance: 100 }).returning(),
    );

    try {
      // b gets no filter on user_id here: only the policy stands between b and a's row
      expect(await withUser(b, (tx) => tx.select().from(accounts))).toEqual([]);
      expect(await withUser(b, (tx) => tx.update(accounts).set({ name: "taken" }).where(eq(accounts.id, mine.id)).returning())).toEqual([]);
      expect(await withUser(b, (tx) => tx.delete(accounts).where(eq(accounts.id, mine.id)).returning())).toEqual([]);
      await expect(withUser(b, (tx) => tx.insert(accounts).values({ userId: a, name: "planted" }))).rejects.toThrow();

      const seen = await withUser(a, (tx) => tx.select().from(accounts));
      expect(seen).toEqual([expect.objectContaining({ id: mine.id, name: "RLS test", startingBalance: 100 })]);
    } finally {
      await withUser(a, (tx) => tx.delete(accounts).where(eq(accounts.id, mine.id)));
    }
  });

  it("hides one user's categories and entries from another", async () => {
    const [a, b] = [randomUUID(), randomUUID()];
    const [account] = await withUser(a, (tx) => tx.insert(accounts).values({ userId: a, name: "RLS test" }).returning());
    try {
      const [category] = await withUser(a, (tx) => tx.insert(categories).values({ userId: a, name: "RLS test", kind: "income" }).returning());
      await withUser(a, (tx) =>
        tx.insert(transactions).values({ userId: a, type: "income", amount: 100, date: "2026-11-11", accountId: account.id, categoryId: category.id }),
      );

      expect(await withUser(b, (tx) => tx.select().from(categories))).toEqual([]);
      expect(await withUser(b, (tx) => tx.select().from(transactions))).toEqual([]);
      expect(await withUser(a, (tx) => tx.select().from(transactions))).toHaveLength(1);
    } finally {
      await withUser(a, async (tx) => {
        await tx.delete(transactions).where(eq(transactions.accountId, account.id));
        await tx.delete(categories).where(eq(categories.userId, a));
        await tx.delete(accounts).where(eq(accounts.id, account.id));
      });
    }
  });

  it("hides one user's bills from another", async () => {
    const [a, b] = [randomUUID(), randomUUID()];
    const [bill] = await withUser(a, (tx) =>
      tx.insert(bills).values({ userId: a, name: "RLS test", amount: 100, nextDueDate: "2026-11-30", dueDay: 30, repeat: "monthly" }).returning(),
    );
    try {
      expect(await withUser(b, (tx) => tx.select().from(bills))).toEqual([]);
      expect(await withUser(b, (tx) => tx.update(bills).set({ amount: 1 }).where(eq(bills.id, bill.id)).returning())).toEqual([]);
      expect(await withUser(a, (tx) => tx.select().from(bills))).toHaveLength(1);
    } finally {
      await withUser(a, (tx) => tx.delete(bills).where(eq(bills.id, bill.id)));
    }
  });
});
