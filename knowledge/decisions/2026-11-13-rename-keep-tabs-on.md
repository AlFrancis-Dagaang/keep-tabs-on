# Rename the app from Kinsenas to Keep tabs on

## Context
The owner wanted a name that says what the app does: record and watch your money. The app isn't deployed yet (T-10), so no URL, Vercel project or auth domain depends on the old name.

## Options
- **A (chosen):** "Keep tabs on" in sentence case, matching the app's copy rule; `keep-tabs-on` as the package, repo and folder slug.
- B: "Keep Tabs On" in title case. Reads as a brand, but clashes with sentence-case copy everywhere else.

## Decision
Option A. The tab title, sidebar, sign-in heading, README, CLAUDE.md and package name use the new name; the GitHub repo and local folder become `keep-tabs-on`.

## Consequences
- Older knowledge files (the 2026-11-09 stack decision, task plans) still say Kinsenas; decisions are append-only, so they stay as written.
- claude-mem keys notes by folder name, so notes before the rename sit under the project "kinsenas"; the backlog list was copied to the new project.
- Vercel, Neon and the Google sign-in screen still need renaming in their dashboards; none is user-facing until T-10.
