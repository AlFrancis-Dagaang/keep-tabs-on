# kinsenas

Personal finance tracker: see your real total across banks, e-wallets and cash, and stay on top of bills, debts and goals.

## Prerequisites
- Node 22 and pnpm 12 (`corepack enable`)
- A Neon project with Auth enabled and Google turned on

## Setup
1. `pnpm install`
2. In the Neon SQL editor, as `neondb_owner`, run `db/roles.sql` with a real password. It creates `app_user`, which cannot bypass row-level security.
3. `cp .env.example .env.local` and fill it:
   - `NEON_AUTH_BASE_URL`: Neon Console → Auth → Configure
   - `NEON_AUTH_COOKIE_SECRET`: `openssl rand -base64 32`
   - `DATABASE_URL`: the pooled connection string with `app_user` and its password
   - `DATABASE_OWNER_URL`: the direct (not pooled) `neondb_owner` connection string, for migrations only
4. `pnpm db:migrate` creates the tables

## Run
- `pnpm dev`, then open http://localhost:3000 and sign in with Google

## Test
- `pnpm test`, `pnpm lint`, `pnpm build`. The RLS test in `lib/rls.test.ts` runs against the database in `.env.local` and skips without it.

Planned with polly; see `docs/` for the brief, architecture and tasks.
