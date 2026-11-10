import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts } from "../db/schema";
import { withUser } from "./db";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Runs against the real database as app_user, so it proves the policies, not just our filters.
describe.skipIf(!process.env.DATABASE_URL)("accounts RLS", () => {
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
});
