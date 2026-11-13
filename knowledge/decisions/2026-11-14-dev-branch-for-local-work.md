# Use a Neon dev branch for local work

## Context
docs/arch.md always said Neon has a production branch plus a dev branch for local work and previews, but only production existed. Local dev, migrations and scratch tests all ran against production, and sessions had no rule saying not to.

## Options
- **A (chosen):** a Neon `dev` branch (br-broad-base-ao5cp0ko) created from production after it was wiped; `.env.local` points at it.
- B: a local Postgres. Rejected: it can't reproduce Neon Auth, RLS roles or the serverless driver.

## Decision
Option A. Production data was wiped first (all tables empty, sign-in accounts kept). Production connection strings now live only in Vercel (T-10).

## Consequences
- Migrations are applied to dev first; production gets them at deploy.
- Neon Auth on the dev branch and its redirect URLs are unchecked.
- A second `dev` is not a staging copy: production changes still need migrating by hand until the deploy does it.
