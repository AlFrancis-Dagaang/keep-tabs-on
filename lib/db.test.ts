import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { withUser, type Tx } from "./db";

function fakeDb() {
  const calls: string[] = [];
  const params: unknown[][] = [];
  const tx = {
    execute: async (query: SQL) => {
      const { sql, params: p } = new PgDialect().sqlToQuery(query);
      calls.push(sql);
      params.push(p);
      return { rows: [] };
    },
  } as unknown as Tx;
  const database = { transaction: async <T>(cb: (t: Tx) => Promise<T>) => cb(tx) };
  return { calls, params, tx, database: database as never };
}

describe("withUser", () => {
  it("sets the user's claims inside the transaction before running the query", async () => {
    const db = fakeDb();
    const result = await withUser("user-1", async (tx) => {
      expect(tx).toBe(db.tx);
      expect(db.calls).toHaveLength(1);
      return "ok";
    }, db.database);

    expect(result).toBe("ok");
    expect(db.calls[0]).toContain("set_config('request.jwt.claims'");
    expect(db.calls[0]).toContain(", true)");
    expect(db.params[0]).toEqual([JSON.stringify({ sub: "user-1" })]);
  });

  it("refuses to run without a user id", async () => {
    const db = fakeDb();
    await expect(withUser("", async () => "never", db.database)).rejects.toThrow();
    expect(db.calls).toHaveLength(0);
  });
});
