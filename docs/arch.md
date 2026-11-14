# Architecture

## Stack
layer | choice | why
---|---|---
Framework | Next.js (App Router), TypeScript | Server components for pages, server actions for every write
Package / test | pnpm, Vitest | Owner defaults; unit tests for money, balance and due-date math
UI | Tailwind CSS, shadcn/ui | Tables, dialogs and forms match the Notion-style layout; theme tokens from the design
Fonts | Source Serif 4, Instrument Sans (next/font) | Design spec; loaded from our own domain
Validation | Zod | Every server action validates input before touching the database
Database | Neon Postgres, Drizzle ORM | Typed schema, migrations, and RLS policies defined in the schema
Auth | Neon Auth (Better Auth), Google | Managed sign-in in the same Neon project
PWA | Next.js app/manifest.ts | Installable to the home screen; no offline mode
Hosting | Vercel | Preview per branch, production on main

## Shape
- Pages are server components that read through Drizzle; writes are server actions validated with Zod.
- Every request that touches data gets the signed-in user from Neon Auth, then runs in one transaction on the WebSocket Pool driver,
  connected as a role without BYPASSRLS, with the user's claims set via set_config. RLS does the scoping; queries still filter by user_id.
- Multi-row actions (pay a bill and roll its due date, record a goal transfer) run inside that same transaction.
- Pure functions hold the money logic: balances, progress, budget totals, next due date. They are unit-tested with Vitest.
- Proxy (middleware) sends signed-out users to sign-in.

## Data
All in Neon Postgres. Every table has user_id with RLS policies (Drizzle crudPolicy). Money is integer centavos.
- users / sessions: managed by Neon Auth.
- settings: currency (PHP | USD), setup_done. One row per user, created by first-run setup.
- accounts: name, starting_balance, include_in_net_worth (bool, default true). Net worth = sum of included accounts' balances.
- categories: name, kind (spending | income).
- transactions: type (income | expense | transfer), amount, date, account_id, to_account_id (transfers),
  category_id, payee, note, optional bill_id | debt_id | goal_id | installment_id. A transfer goes to to_account_id or, for someone outside the accounts, to_name (never both); the latter only lowers the paying account.
- installments: name, monthly_amount, months, paid_before (months), due_day, next_due_date, account_id, note. Paid = paid_before + linked expenses; each payment is an expense with installment_id.
- bills: name, amount, next_due_date, repeat (weekly | biweekly | monthly | quarterly | yearly).
- note (optional text, max 200) also sits on bills, debts and goals.
- debts: name, total, deadline, paid_before, direction (owe | owed). A repayment received on an owed debt is an income transaction with debt_id; the direction can't change once the debt has transactions.
- goals: name, target, deadline, account_id, saved_before.
- budget_months: month (first of the month), category_id, budget (null = limit removed). A row is written when a limit is set or changed; a month’s limit is the latest row at or before it.
Balances, progress and budget spent are computed from transactions, never stored.

## Deploy
Vercel: production from main, a preview per branch. Neon: a production branch and a dev branch (local work and tests; see the 2026-11-14 decision).
Live at https://keep-tabs-on-murex.vercel.app (Vercel picked the suffix; `keep-tabs-on.vercel.app` belongs to someone else). Production env vars (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`) are set in Vercel for the Production scope only; no Preview vars, since work happens on main.
Neon Auth on the production branch trusts that URL and localhost, and uses Neon's shared Google app, so there is no Google redirect to register. A new URL needs `neonctl neon-auth domain add`.
Migrations run in the Vercel build (`vercel.json`: `pnpm db:migrate && pnpm build`), so they apply before the new code goes live; `DATABASE_OWNER_URL` (direct, unpooled) is set for the Production scope only, and the app uses the restricted role's pooled URL. Migrations stay additive; read the generated SQL before committing.
GitHub Actions (`.github/workflows/ci.yml`) runs lint, test and build on pull requests and pushes to main; Vercel deploys.

## Versions
- Node 22.23.3, pnpm 12.18.0
- next 16.4.5, react / react-dom 19.3.1, typescript 5.9.3
- @neon/auth 0.8.2, drizzle-orm 0.45.4, @neondatabase/serverless 1.2.0
- drizzle-kit 0.31.11, zod 4.6.7, next-themes 0.4.6
- tailwindcss / @tailwindcss/turbopack 4.3.5
- shadcn 4.23.0 (CLI, radix base): radix-ui 1.8.1, cn 0.5.2, class-variance-authority 0.7.1, lucide-react 1.70.0
- vitest 5.1.0, eslint 9.39.5, eslint-config-next 16.4.5
- @types/node 22.20.5, @types/react / @types/react-dom 19.3.0

## Risks
- Neon Auth is young and recently rebuilt on Better Auth; its packages and APIs may change. Mitigation: keep auth in one module.
- RLS depends on every query going through the per-request transaction helper; a stray owner-role connection would bypass it.
- Budget history depends on reading the latest limit row at or before each month; never read a category’s limit without the month.
- Dates and "this month" must use the user's timezone (Asia/Manila) rather than the server's UTC.
