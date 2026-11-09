import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

export type Tx = Parameters<Parameters<NeonDatabase["transaction"]>[0]>[0];

let db: NeonDatabase | undefined;

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return (db ??= drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }) }));
}

// Every data access goes through here: RLS policies read the user from these claims.
export async function withUser<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
  database: Pick<NeonDatabase, "transaction"> = getDb(),
): Promise<T> {
  if (!userId) throw new Error("withUser needs a signed-in user id");
  return database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId })}, true)`);
    return fn(tx);
  });
}
