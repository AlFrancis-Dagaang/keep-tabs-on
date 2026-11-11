import { sql } from "drizzle-orm";
import { type AnyPgColumn, bigint, check, date, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// The user withUser() put in the transaction's claims. Every table's policy compares user_id to this.
export const currentUserId = sql`(current_setting('request.jwt.claims', true)::json->>'sub')::uuid`;

const ownRows = (userId: AnyPgColumn) =>
  pgPolicy("own rows", { for: "all", using: sql`${userId} = ${currentUserId}`, withCheck: sql`${userId} = ${currentUserId}` });

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text().notNull(),
    startingBalance: bigint("starting_balance", { mode: "number" }).notNull().default(0), // centavos
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [ownRows(t.userId)],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text().notNull(),
    kind: text({ enum: ["spending", "income"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.kind, t.name),
    check("categories_kind", sql`${t.kind} in ('spending', 'income')`),
    ownRows(t.userId),
  ],
).enableRLS();

// FKs are checked without RLS, so actions must confirm account and category ids are the user's own.
export const transactions = pgTable(
  "transactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: text({ enum: ["income", "expense", "transfer"] }).notNull(),
    amount: bigint({ mode: "number" }).notNull(), // centavos
    date: date({ mode: "string" }).notNull(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
    toAccountId: uuid("to_account_id").references(() => accounts.id, { onDelete: "restrict" }), // transfers only
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    payee: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("transactions_type", sql`${t.type} in ('income', 'expense', 'transfer')`),
    check("transactions_amount", sql`${t.amount} > 0`),
    check(
      "transactions_transfer",
      sql`(${t.type} = 'transfer') = (${t.toAccountId} is not null and ${t.toAccountId} <> ${t.accountId})`,
    ),
    ownRows(t.userId),
  ],
).enableRLS();

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
