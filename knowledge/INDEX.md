# Knowledge index

One line per file, newest last: `- [Title](path) — one-line hook`

## Lessons
- [Never model owed money as a negative account balance](lessons/2026-11-10-no-negative-balances.md) — balances >= 0; owed money goes in debts
- [Compare database timestamps in SQL, never against a JS Date](lessons/2026-11-11-compare-timestamps-in-sql.md) — JS Date drops microseconds; compare columns in SQL
- [Tick a task's acceptance criteria when it's marked done](lessons/2026-11-13-tick-criteria-when-done.md) — Status: done also ticks the criteria in tasks.md and the plan
- [Seed cycle rows and their payments in separate transactions](lessons/2026-11-13-now-fixed-per-transaction.md) — now() is fixed per transaction; write timestamp-compared rows in separate withUser calls
- [Wrap usePathname() in a layout in Suspense under cacheComponents](lessons/2026-11-13-suspense-around-usepathname.md) — layout hooks reading request data need a Suspense boundary with a same-UI fallback
- [State the exact scope in an option's label when asking the owner to choose](lessons/2026-11-13-state-scope-in-option-labels.md) — put the list or count in the label; ask open scope as its own question
- [Check the database host before any DB command, and never run against production](lessons/2026-11-14-check-db-host.md) — read .env.local host; dev endpoint only
- [Show a headline figure on the owner's real data before planning how it's defined](lessons/2026-11-14-show-figure-on-real-data.md) — worked example with real numbers, approved before building
- [Read the deployment's regions field to see where functions run, not the region in the logs](lessons/2026-11-15-check-deployment-region.md) — get_deployment regions, not log region; state what evidence cannot show
- [Show a mock of the placement before building a new UI element](lessons/2026-11-16-mock-placement-first.md) — when the plan doesn't name a position, show 2–3 placements and get a pick first
- [Qualify the outer table in raw SQL subqueries](lessons/2026-11-17-qualify-outer-table.md) — Drizzle may render the column unqualified; spell out "table"."col"
- [Give DB-backed tests an explicit timeout](lessons/2026-11-17-db-test-timeout.md) — 30 s testTimeout in vitest.config.mts; run 3 times before calling it green
- [Remember that pushing to main migrates production through the Vercel build](lessons/2026-11-24-push-migrates-production.md) — read vercel.json before planning a deploy-order step; no manual production migration

## Decisions
- [Stack](decisions/2026-11-09-stack.md) — Next.js + Neon/Drizzle + Neon Auth on Vercel; RLS via restricted role and per-request transaction
- [RLS policy claims](decisions/2026-11-10-rls-policy-claims.md) — policies read request.jwt.claims directly; auth.user_id() isn't installed
- [Rename to Keep tabs on](decisions/2026-11-13-rename-keep-tabs-on.md) — app renamed from Kinsenas; repo and folder keep-tabs-on
- [Owner-only for now](decisions/2026-11-13-owner-only-for-now.md) — friends deferred, no date; multi-user code stays
- [Dev branch for local work](decisions/2026-11-14-dev-branch-for-local-work.md) — Neon dev branch for local work and tests; production only in Vercel
- [Migrate in the Vercel build](decisions/2026-11-14-migrate-in-vercel-build.md) — build runs db:migrate before next build; additive-only migrations
- [Architecture update](decisions/2026-11-14-stack-2.md) — budget limits as a log, settings table, dev branch; updates the 2026-11-09 stack record
- [Vercel and Neon share a region](decisions/2026-11-14-vercel-and-neon-same-region.md) — functions run in sin1 next to Neon; region ruled out as the cause of slow loads
- [Pin Vercel functions to sin1](decisions/2026-11-15-pin-functions-to-sin1.md) — supersedes the same-region decision; deployment regions was iad1, vercel.json now pins sin1
- [Edit and undo linked payments](decisions/2026-11-16-edit-and-undo-payments.md) — which payment fields change, due-date roll-back via one marker column, amount locks on bills
- [Account icons](decisions/2026-11-16-account-icons.md) — a nullable icon key per account from fixed logo and colour-tile lists, no uploads

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
- [T-10](tasks/T-10.md) — Ship and the done signal: PWA manifest and icons, production migrate and Vercel deploy, month of real use
- [T-11](tasks/T-11.md) — Debts owed to you: debt direction, Receive as linked income, net worth stays the account sum
- [T-12](tasks/T-12.md) — Account history and Activity filters: per-account history with running balance, date filters, columns by type
- [T-13](tasks/T-13.md) — Exclude accounts from net worth: per-account include switch, net worth counts included accounts only
- [T-14](tasks/T-14.md) — Installments, outside transfers and notes: fixed-term purchases, transfers to a name, optional notes on five forms
- [T-15](tasks/T-15.md) — Activity polish, dates in words and editing entries: month picker, logged time, Remove wording, icons, edit plain entries
- [T-16](tasks/T-16.md) — Mobile layout, cards and a drawer: tables become cards below 768px, sidebar becomes a top bar with a drawer
- [T-17](tasks/T-17.md) — Bill and installment detail pages: payment history with date filter, linked from the list rows
- [T-18](tasks/T-18.md) — Edit or undo linked payments: edit from the history rows, due-date roll-back on remove, one additive marker column
- [T-19](tasks/T-19.md) — Overview redesign and account icons: four stat cards, five lists, pills, logo or colour tile per account, one additive column
- [T-20](tasks/T-20.md) — Set aside by linked transfers: a transfer can link to a bill, debt, installment or goal; separate Set aside figure next to Paid
- [T-21](tasks/T-21.md) — Set aside before tracking: an optional starting amount on bills, debts, installments and goals that counts in the Set aside bar
- [T-22](tasks/T-22.md) — Set aside summary page: one flat table of everything set aside, biggest first, Total of Set aside only
- [T-23](tasks/T-23.md) — Goals are a jar and installment payments pick their account: Add money removed, one goal figure from For transfers, From account chosen when paying (planned)
- [T-24](tasks/T-24.md) — Mark goals done: done_at column, Mark done and Reopen, done goals drop out of Set aside and Overview (planned)
- [T-25](tasks/T-25.md) — Phone bottom bar and Activity opens on today: tab bar plus More sheet replace the burger drawer, picker loses Month to date and Custom range (planned)
- [T-26](tasks/T-26.md) — Phone polish: full-screen Add entry sheet with account and category pickers, tinted account cards with a ⋯ menu

## Retros
- [T-01 to T-11](retros/2026-11-14-t01-t11.md) — whole-project retro: what shipped, lessons, recurring follow-ups, flaky RLS tests
- [T-12 to T-17](retros/2026-11-16-t12-t17.md) — scope grew in T-17, show-before-build pattern, month of use started 14 Nov
- [T-18 to T-24](retros/2026-11-18-t18-t24.md) — docs lagging code, production migrations unconfirmed, Set aside added to the brief
- [T-27](tasks/T-27.md) — Insights: where the money goes this month, by category, with a 6-month trend and a written summary (numbers only, no AI)
- [T-28](tasks/T-28.md) — Phone cards part 1: category icons, hero block, icon cards on Overview and Activity, Add entry hero
