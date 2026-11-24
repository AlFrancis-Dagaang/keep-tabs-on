# Remember that pushing to main migrates production through the Vercel build
Date: 2026-11-24   Task: T-28

## What happened
The T-28 plan said production had to be migrated by hand before any push, and asked the owner to approve that step. vercel.json already sets buildCommand to `pnpm db:migrate && pnpm build`, and decision 2026-11-14-migrate-in-vercel-build.md records it. The owner corrected the plan.

## Root cause
I planned from memory of the earlier manual process and did not read vercel.json or the decisions folder before writing a deploy-order step.

## Rule
Before writing a deploy-order or production-migration step, read vercel.json and knowledge/decisions/2026-11-14-migrate-in-vercel-build.md. A push to main migrates production through the build, so an additive migration needs no manual production step and I never touch the production host.

## Applies when
A plan adds or changes a migration or `db/schema.ts`, or mentions deploy order, pushing to main, or production.
