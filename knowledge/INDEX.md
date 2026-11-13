# Knowledge index

One line per file, newest last: `- [Title](path) — one-line hook`

## Lessons
- [Never model owed money as a negative account balance](lessons/2026-11-10-no-negative-balances.md) — balances >= 0; owed money goes in debts
- [Compare database timestamps in SQL, never against a JS Date](lessons/2026-11-11-compare-timestamps-in-sql.md) — JS Date drops microseconds; compare columns in SQL

## Decisions
- [Stack](decisions/2026-11-09-stack.md) — Next.js + Neon/Drizzle + Neon Auth on Vercel; RLS via restricted role and per-request transaction
- [RLS policy claims](decisions/2026-11-10-rls-policy-claims.md) — policies read request.jwt.claims directly; auth.user_id() isn't installed

## Best practices

## Tasks
- [T-02](tasks/T-02.md) — App shell and accounts: sidebar, theme, accounts CRUD, RLS test
- [T-03](tasks/T-03.md) — Categories and activity: categories in Settings, income/expense/transfer entries, balances from entries
- [T-04](tasks/T-04.md) — Recurring bills: bills CRUD, pay with roll-forward, pixel progress bar, overdue badge
- [T-05](tasks/T-05.md) — Debts: debts CRUD, pay toward total, detail page with history, shared flash hook

## Retros
