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
- settings: currency, setup_done.
- accounts: name, starting_balance.
- categories: name, kind (spending | income), monthly_budget (optional).
- transactions: type (income | expense | transfer), amount, date, account_id, to_account_id (transfers),
  category_id, payee, optional bill_id | debt_id | goal_id.
- bills: name, amount, next_due_date, repeat (weekly | biweekly | monthly | quarterly | yearly).
- debts: name, total, deadline, paid_before.
- goals: name, target, deadline, account_id, saved_before.
- budget_months: month, category_id, budget (snapshot of the limit for that month).
Balances, progress and budget spent are computed from transactions, never stored.

## Deploy
Vercel: production from main, a preview per branch. Neon: a production branch, plus a dev branch for local work and previews.
Migrations run with drizzle-kit over the direct (unpooled) owner connection; the app uses the restricted role's pooled URL.

## Versions
Pinned by /scaffold.

## Risks
- Neon Auth is young and recently rebuilt on Better Auth; its packages and APIs may change. Mitigation: keep auth in one module.
- RLS depends on every query going through the per-request transaction helper; a stray owner-role connection would bypass it.
- The budget month snapshot must be written when a month is first viewed or rolls over; a missed snapshot means history uses current limits.
- Dates and "this month" must use the user's timezone (Asia/Manila) rather than the server's UTC.
