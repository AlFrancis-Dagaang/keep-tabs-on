# Account icons: a stored key from fixed lists

## Context
The first design said accounts show a generic lucide icon, with no brand logos and no stored icon. The owner's Overview mock (T-19) shows bank logos (BPI, GCash, Maya, UnionBank, and later GSave and MariBank) and wants a fallback for users who don't have a logo.

## Options
- **A (chosen):** one nullable `accounts.icon` text holding a logo key (`bpi`), a colour tile (`tile:red`), `cash`, or null. Logos and tiles come from fixed lists in `lib/account-icons.ts`; logo files live in `public/banks/`. Null shows a generic lucide icon.
- B: guess the logo from the account name. Rejected: a wrong or missing match is silent, and renaming an account would change its icon.
- C: let users upload an image. Rejected: storage, size checks and moderation for a one-user app.

## Decision
Option A. `parseIcon` accepts only keys on the lists; the account action refuses anything else, so the column can't hold an arbitrary string. A logo is added to the list only once its file exists and the owner has accepted it. A colour tile shows the first letter of the account name on one of about 8 fixed colours. The migration only adds the column, so existing accounts stay null. This replaces the "no stored icon" line in `docs/design.md`.

## Consequences
- One additive migration; production migrates on deploy.
- The setup wizard and account dropdowns keep showing text only.
- Logos are the banks' trademarks, shown to identify the user's own accounts in a personal app.
