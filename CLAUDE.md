# kinsenas

<!-- Each section is filled by the skill named under its heading. Placeholders count as missing. -->

## What this is
<!-- owner: /brief — 2–3 lines: problem, user, core loop. Details live in docs/brief.md. -->
Personal finance tracker web app. People with money split across banks, e-wallets and cash can't see their real total, and they miss bills and lose track of goals.
First users: young Filipino employees (20–30) with 3–6 accounts, starting with the owner and 3–5 friends.
Core loop: log income/expense/transfer → pay bills and debts → fund goals → check the overview (net worth, budget left, upcoming bills).

## Stack
<!-- owner: /architect — one line per layer. Exact versions live in docs/arch.md. -->
- Framework: Next.js (App Router), TypeScript
- Package / test: pnpm, Vitest
- UI: Tailwind CSS, shadcn/ui, Source Serif 4 + Instrument Sans
- Validation: Zod
- Database: Neon Postgres, Drizzle ORM, RLS per user (restricted role + per-request transaction)
- Auth: Neon Auth (Better Auth), Google
- PWA: Next.js app/manifest.ts
- Hosting: Vercel

## Commands
<!-- owner: /scaffold — install, dev, test, lint, build. Exact commands that work. -->
Run /scaffold.

## Code layout
<!-- owner: /scaffold — top-level folders and what goes where. -->
Run /scaffold.

## Workflow
<!-- owner: polly — tells the EPAV commands where things go. Change only on purpose. -->
- Build loop: `/plan-task T-xx` → my approval → `/apply` → `/validate`. `/code-review` only when I ask.
- Tasks: `docs/tasks.md`. Each is `## T-xx: Title`, a `Status: todo|done` line, and acceptance criteria.
- Plans: `knowledge/tasks/T-xx.md`, one per task, with checkboxes. Start it with the task's acceptance criteria.
- Checks: the commands in the Commands section. Never invent others.
- Done: every acceptance criterion met and every check passes. Then /validate sets `Status: done`
  in `docs/tasks.md` and records the outcome at the end of the plan file.
- Code graph: `graphify-out/`. Built by `/graphify` after /scaffold, refreshed with
  `/graphify . --update` after each validated task. Query it before searching the code.
- Lessons: `knowledge/lessons/`. Decisions: `knowledge/decisions/` (append-only).
- Add one line to `knowledge/INDEX.md` for each new knowledge file.

## Project rules
<!-- owner: me — rules specific to this project. Lessons stay in knowledge/lessons/. -->
