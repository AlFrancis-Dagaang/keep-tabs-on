# bill-me

<!-- Each section is filled by the skill named under its heading. Placeholders count as missing. -->

## What this is
<!-- owner: /brief — 2–3 lines: problem, user, core loop. Details live in docs/brief.md. -->
Run /brief.

## Stack
<!-- owner: /architect — one line per layer. Exact versions live in docs/arch.md. -->
Run /architect.

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
