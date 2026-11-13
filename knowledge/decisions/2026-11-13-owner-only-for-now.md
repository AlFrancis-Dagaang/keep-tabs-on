# Owner is the only user for now

## Context
The brief assumed the owner plus 3–5 friends. The owner is the only user for now, and friends are deferred with no date.

## Options
- **A (chosen):** Docs say owner-only; the multi-user code (RLS, setup, `app_user` role) stays.
- B: Strip the multi-user code. Rejected: it's already built and tested, and removing it costs more than keeping it.

## Decision
Option A. The "3 friends" criterion leaves the brief and T-10. Friends return as their own task when the owner picks a date.

## Consequences
- T-10's done signal is the owner's month of use alone.
- The 2026-11-09 stack decision stays as written (append-only).
- `docs/brief.md` line 23 and `docs/arch.md` still need the later `/architect` pass.
