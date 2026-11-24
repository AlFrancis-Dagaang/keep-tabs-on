# Category icons: a stored key from a fixed list

## Context
The phone cards (T-28) show an icon tile beside each activity row, Budget row and category picker. Categories have only a name and a kind.

## Options
- **A (chosen):** one nullable `categories.icon` text holding a key from a fixed list of about 16 lucide icons in `lib/category-icons.ts`. Null shows a generic tag icon.
- B: guess the icon from the category name. Rejected: a wrong match is silent, and renaming a category would change its icon (the same reasons account icons rejected it).
- C: let users upload an image. Rejected: storage and checks for a one-user app.

## Decision
Option A, copying account icons (`2026-11-16-account-icons.md`). `parseCategoryIcon` accepts only keys on the list, and `saveCategory` runs the form value through it, so the column can't hold an arbitrary string. The migration only adds the column; existing categories stay null and show the generic icon until picked in Settings.

## Consequences
- One additive migration; production migrates on deploy (`2026-11-14-migrate-in-vercel-build.md`).
- Adding an icon later is one line in the list; removing a key makes those categories fall back to generic.
