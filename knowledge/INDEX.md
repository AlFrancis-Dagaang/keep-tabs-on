# Knowledge index

One line per file, newest last: `- [Title](path) — one-line hook`

## Lessons
- [Never model owed money as a negative account balance](lessons/2026-11-10-no-negative-balances.md) — balances >= 0; owed money goes in debts
- [Compare database timestamps in SQL, never against a JS Date](lessons/2026-11-11-compare-timestamps-in-sql.md) — JS Date drops microseconds; compare columns in SQL
- [Tick a task's acceptance criteria when it's marked done](lessons/2026-11-13-tick-criteria-when-done.md) — Status: done also ticks the criteria in tasks.md and the plan
- [Seed cycle rows and their payments in separate transactions](lessons/2026-11-13-now-fixed-per-transaction.md) — now() is fixed per transaction; write timestamp-compared rows in separate withUser calls
- [Wrap usePathname() in a layout in Suspense under cacheComponents](lessons/2026-11-13-suspense-around-usepathname.md) — layout hooks reading request data need a Suspense boundary with a same-UI fallback
- [State the exact scope in an option's label when asking the owner to choose](lessons/2026-11-13-state-scope-in-option-labels.md) — put the list or count in the label; ask open scope as its own question

## Decisions
- [Stack](decisions/2026-11-09-stack.md) — Next.js + Neon/Drizzle + Neon Auth on Vercel; RLS via restricted role and per-request transaction
- [RLS policy claims](decisions/2026-11-10-rls-policy-claims.md) — policies read request.jwt.claims directly; auth.user_id() isn't installed
- [Rename to Keep tabs on](decisions/2026-11-13-rename-keep-tabs-on.md) — app renamed from Kinsenas; repo and folder keep-tabs-on
- [Owner-only for now](decisions/2026-11-13-owner-only-for-now.md) — friends deferred, no date; multi-user code stays
- [Dev branch for local work](decisions/2026-11-14-dev-branch-for-local-work.md) — Neon dev branch for local work and tests; production only in Vercel
- [Architecture update](decisions/2026-11-14-stack-2.md) — budget limits as a log, settings table, dev branch; updates the 2026-11-09 stack record

## Best practices

## Tasks
- [T-02](tasks/T-02.md) — App shell and accounts: sidebar, theme, accounts CRUD, RLS test
- [T-03](tasks/T-03.md) — Categories and activity: categories in Settings, income/expense/transfer entries, balances from entries
- [T-04](tasks/T-04.md) — Recurring bills: bills CRUD, pay with roll-forward, pixel progress bar, overdue badge
- [T-05](tasks/T-05.md) — Debts: debts CRUD, pay toward total, detail page with history, shared flash hook
- [T-06](tasks/T-06.md) — Goals: goals CRUD, add money as a linked transfer, detail page with from/to history
- [T-07](tasks/T-07.md) — Budget: limits stored as month snapshots on change, this month vs limits, striped over-budget bars, history
- [T-08](tasks/T-08.md) — Overview: five stat cards incl. budget left, account tiles, mini tables, empty states everywhere
- [T-09](tasks/T-09.md) — First-run setup and settings: settings table, /setup page, currency, start over

## Retros
