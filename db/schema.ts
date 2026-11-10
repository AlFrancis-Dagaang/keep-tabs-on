import { sql } from "drizzle-orm";
import { bigint, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The user withUser() put in the transaction's claims. Every table's policy compares user_id to this.
export const currentUserId = sql`(current_setting('request.jwt.claims', true)::json->>'sub')::uuid`;

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text().notNull(),
    startingBalance: bigint("starting_balance", { mode: "number" }).notNull().default(0), // centavos
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [pgPolicy("own rows", { for: "all", using: sql`${t.userId} = ${currentUserId}`, withCheck: sql`${t.userId} = ${currentUserId}` })],
).enableRLS();

export type Account = typeof accounts.$inferSelect;
