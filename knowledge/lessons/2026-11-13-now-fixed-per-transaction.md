# Seed cycle rows and their payments in separate transactions
Date: 2026-11-13   Task: T-08

## What happened
A scratch flow test inserted a bill and its payment inside one withUser transaction. The Overview's
paid-this-cycle join (created_at > cycle_start) left the payment out, so the test failed (₱9,500 left
instead of ₱9,000) until the payment moved into its own transaction.

## Root cause
Postgres now() is the transaction's start time, so every default-now() column written in one transaction
gets the same timestamp. created_at equalled cycle_start, and the strict > comparison correctly excluded it.
The 2026-11-11 timestamp lesson covers comparing in SQL, not that now() stands still inside a transaction.

## Rule
When a test or action writes a row and a later event that's compared to it by timestamp
(bill → payment, cycle roll → next payment), write them in separate withUser calls, as the app's requests do.

## Applies when
Scratch flow tests and seeds against Neon; any action that creates a cycle row and records against it
in the same transaction (bills, budget months, goals and debts later).
