# Compare database timestamps in SQL, never against a JS Date
Date: 2026-11-11   Task: T-04

## What happened
payBill read bills.cycle_start into a JS Date and compared transactions.created_at against it.
The payment that closed a cycle has created_at equal to the new cycle_start, but the Date had lost
the microseconds, so that payment counted toward the next cycle ("Only ₱300 left this cycle").

## Root cause
Postgres timestamptz keeps microseconds; a JS Date keeps milliseconds. Reading a timestamp into JS
and sending it back as a filter quietly rounds it down, so equal moments compare as "later".
Unit tests didn't catch it because the bug only shows against the real database.

## Rule
Compare one timestamp column with another in SQL (a join or a subquery); never pass a timestamp
read from the database back as a query value. To set one, use sql`now()`, not new Date().

## Applies when
Cycle, period or "since" filters on timestamptz columns (bills now; budget months, goals and debts
later), and any action that reads a row's timestamp and then queries with it.
