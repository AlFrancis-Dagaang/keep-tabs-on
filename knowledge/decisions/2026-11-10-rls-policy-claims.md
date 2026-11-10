# RLS policies read the claims setting directly

## Context
The stack decision (2026-11-09) planned RLS policies on `auth.user_id()` via Drizzle `crudPolicy` / `authUid`.
While planning T-02 the database had no `pg_session_jwt` extension, so `auth.user_id()` does not exist.
`withUser` already sets `request.jwt.claims` to `{"sub": <user id>}` inside each transaction. Neon Auth user ids are `uuid`.

## Options
- **A (chosen):** policies compare `user_id` to `(current_setting('request.jwt.claims', true)::json->>'sub')::uuid`, kept as `currentUserId` in `db/schema.ts`, written with Drizzle `pgPolicy`.
- B: install and configure `pg_session_jwt` so `auth.user_id()` and `crudPolicy` work. It adds an extension and JWT setup for the same result.

## Decision
Option A. Every table gets one `pgPolicy("own rows", { for: "all", using, withCheck })` on `user_id = currentUserId`.

## Consequences
- No extension and no JWT verification in the database: the server is trusted to set the claims, which `withUser` does from the Neon Auth session.
- Outside a `withUser` transaction the setting is empty, so `app_user` sees no rows instead of all rows.
- `lib/rls.test.ts` proves the policy against the real database.
