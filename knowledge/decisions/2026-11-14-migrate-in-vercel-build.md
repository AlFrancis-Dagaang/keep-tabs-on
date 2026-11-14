# Run migrations in the Vercel build

## Context
Migrations were applied to production by hand. A push to main deploys at once, so a push that needed a new column could go live before the column existed. Production was empty and the owner is its only user, so a bad migration cost little.

## Options
- **A (chosen):** the Vercel build runs `pnpm db:migrate && pnpm build`. `DATABASE_OWNER_URL` is set in Vercel for the Production scope only.
- B: keep running migrations by hand. Rejected: easy to forget before a push, and the order was our job to get right.
- C: migrate from a GitHub Actions job. Rejected: Vercel deploys in parallel and does not wait for it, so the code could still go live first.

## Decision
Option A. The build migrates first, so a failed migration fails the build and the old version stays live.

## Consequences
- The owner password now lives in Vercel (Production only). Preview builds have no owner URL, so a preview build fails at the migrate step; the project works on main, so none run.
- Migrations must be additive only (add a column or table, never drop or rename one in the same change that stops using it), and the generated SQL is read before it is committed.
- Revisit this once production holds a month of real data: a destructive migration would then lose it, so a drop needs a manual step first.
- If a migration succeeds and the build then fails, the schema is ahead of the live code; additive changes make that safe.
