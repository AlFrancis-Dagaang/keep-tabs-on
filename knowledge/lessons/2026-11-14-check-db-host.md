# Check the database host before any DB command, and never run against production

Date: 2026-11-14   Task: none

## What happened
docs/arch.md said Neon had a production branch plus a dev branch for local work, but only production existed. Migrations, RLS tests and scratch scripts all ran against production until the owner asked why sessions kept calling production fine.

## Root cause
The docs described an intended setup, and no session checked it against reality. Nothing in CLAUDE.md said to use a dev branch, so "the DB works" passed as good.

## Rule
Before any db:migrate, test or script, read the host in .env.local and confirm it is the dev endpoint (ep-rough-sea-ao6no8lf), not production (ep-steep-base-ao0q4xxw); if arch.md names an environment you can't find, say so instead of assuming it exists.

## Applies when
Any task that runs db:migrate, pnpm test (the RLS tests), a DB script, or edits .env.local, db/ or drizzle.config.ts.
