# Tasks

## T-01: Walking skeleton
Status: done
- [x] `pnpm install` and `pnpm dev` run without errors; `pnpm test` passes one Vitest test
- [x] Signing in with Google lands on an Overview page showing the signed-in email; signed-out visits redirect to sign-in
- [x] One query runs against Neon as the restricted (non-BYPASSRLS) role inside the per-request transaction helper
- [x] `pnpm build` succeeds

## T-02: App shell and accounts
Status: done
- [x] Sidebar shows all v1 pages and a light/dark toggle; at 375px wide it becomes a horizontal scrolling top bar and the page never scrolls sideways
- [x] Create, rename and delete an account with a starting balance; Accounts table lists each balance and a net worth total
- [x] Editing an account's balance to X changes its starting balance so the shown balance equals X
- [x] A second Google user sees none of the first user's accounts (RLS), shown by a test or by signing in as both
- [x] Money is stored as integer centavos and shown with tabular numbers

## T-03: Categories and activity
Status: done
- [x] Settings lets me add, rename and delete spending and income categories
- [x] Record income, expense, and transfer (from/to) with date, amount, category and payee; each appears in Activity
- [x] Account balances follow starting + income − expenses + transfers in − transfers out (Vitest unit test covers all four)
- [x] Filter Activity by type; delete an entry and the affected balances update

## T-04: Recurring bills and pixel progress bar
Status: done
- [x] Create a bill with amount, next due date and repeat (weekly, every 2 weeks, monthly, every 3 months, yearly); due date editable anytime
- [x] Record payment from an account (partial allowed): an expense linked to the bill is saved, and the bill's 12-block progress bar fills by the paid share of this cycle
- [x] Paying the cycle in full rolls the next due date in the same DB transaction; unit tests cover each repeat, including Jan 31 → Feb 28/29
- [x] Progress bar matches docs/design.md: drop-in blocks, clay when complete, flash on completion, no animation under reduced motion
- [x] Overdue bills show a clay warning badge

## T-05: Debts
Status: done
- [x] Create a debt with total, deadline and paid-before-tracking amount
- [x] Record payment from an account: an expense linked to the debt is saved, and the progress bar shows (paid before + payments) / total
- [x] Debt detail shows payment history; the bar turns clay and flashes when fully paid

## T-06: Goals
Status: done
- [x] Create a goal with target, deadline, saved-in account and already-saved amount
- [x] Add money moves funds by recording a transfer linked to the goal into its saved-in account; both account balances update
- [x] Progress = already saved + linked transfers; history lists each transfer with from/to; the bar turns clay and flashes at target

## T-07: Budget
Status: done
- [x] Set optional monthly limits on spending categories; Budget page shows this month's budget, spent and left per category and in total
- [x] Spent counts expenses in spending categories only; payments linked to bills or debts are excluded (unit test)
- [x] Over-budget categories show clay diagonal stripes on their bar
- [x] Each month's limits are snapshotted; past months appear in history with budget, spent and saved per month and per category, and changing a limit doesn't change past months (unit test)
- [x] "This month" uses Asia/Manila dates (unit test around the month boundary)

## T-08: Overview
Status: done
- [x] Four stat cards: net worth, income this month, expenses this month, bills due in 7 days
- [x] Mini tables for accounts, upcoming bills, goals, debts and recent activity, each linking to its page
- [x] Every page has an empty state telling the user what to do next

## T-09: First-run setup and settings
Status: done
- [x] A new user is sent to setup: currency, accounts with today's balance, spending and income categories with optional budgets, then optional bills, goals and debts
- [x] Finishing setup lands on Overview with the entered data; a returning user skips setup
- [x] Settings can change currency (PHP or USD)
- [x] A fresh account completes setup with 3 accounts and 5 categories in under 5 minutes (timed by me)

## T-10: Ship and the done signal
Status: todo
- [ ] Production deploy on Vercel with Neon production branch; Google sign-in works on the production URL
- [ ] App installs to the home screen on iOS and Android from app/manifest.ts
- [ ] I log every transaction for one full month (two paydays); at month end every account balance matches my real bank and e-wallet apps
- [ ] At least one bill completes a cycle and rolls to the correct next due date, and one past month appears in budget history

## T-11: Debts owed to you
Status: done
- [x] A debt has a direction, "You owe" or "Owed to you", chosen when creating or editing it, on the Debts page and in setup; the name label reads "Who you owe" or "Who owes you"; every existing debt shows "You owe" and behaves as before; direction can't be changed once a debt has payments or receipts
- [x] Debts stays one page and one list; each row shows its direction label, and the Overview Debts table shows the same label
- [x] On an "Owed to you" debt, Receive adds the amount to the chosen account's balance, shows an income entry linked to the debt in Activity, and fills the progress bar (received / total); it can't go over what is still owed; paying a "You owe" debt works as before
- [x] Net worth stays the sum of account balances, on Overview and on Accounts; debts in either direction don't change it, and a received repayment raises it by the amount received
- [x] A received repayment doesn't change the Budget page

## T-12: Account history and Activity filters
Status: done
- [x] Each account has a history page, opened from the Accounts page, listing every entry that touches it (income, expense, transfer in and out) with the account's running balance after each entry; entries from before a deleted category or payee still show
- [x] The account history and Activity can be filtered by month, a single day, or a date range; on Activity it works together with the type filter
- [x] On Activity, filtering by a type shows only the columns that fit it: expense shows category and payee; income shows source; transfer shows from and to. The "All" view keeps one shared set of columns
- [x] Dates use Asia/Manila, with a unit test at a month boundary and a test that the running balance ends at the account's current balance
- [x] Account balances, Budget and Overview figures are unchanged for the same data (display only, no balance math touched)

## T-13: Exclude accounts from net worth
Status: done
- [x] An account has an "Include in net worth" option, on by default, set when creating or editing it on the Accounts page
- [x] Net worth on Overview and Accounts counts only included accounts; an excluded account still shows its balance, history, and works in transfers, bills, debts and goals as before
- [x] The Accounts page marks excluded accounts, so the lower total is explained
- [x] Existing accounts stay included; no balance, budget or entry changes; a unit test covers the net worth sum with and without an excluded account

## T-14: Installments, outside transfers and notes
Status: done
- [x] Installments: a new Installments page lists fixed-term purchases, each with a name, total, number of months, monthly amount, due day and paying account. Pay logs an expense from that account linked to the installment, with no category, like a bill payment. The row shows "3 of 12 paid" with the pixel bar and the next due date, and is marked finished after the last payment
- [x] Outside transfers: a transfer's "To" accepts one of your accounts or a free-text name. A transfer to a name takes the amount from the paying account, so net worth drops, shows in Activity as "Account → name", and does not count in Income this month, Expenses this month or Budget. Transfers between your own accounts work as before
- [x] Notes: an optional note (up to 200 characters) on entries, debts, goals, installments and recurring bills, set in each create/edit form and shown as a muted line in the lists. Setup is unchanged
- [x] Existing rows keep working with no balance, budget or entry changes; the migration is additive only; unit tests cover installment progress and the outside-transfer balance effect, and a transfer to a name can't make a balance negative
- [x] The account history page (Accounts, per account) shows an entry's note as a muted line under its details
- [x] Loading: every page's Suspense fallback shows a centered 12-block pixel loading bar (a clay run moving across the blocks) instead of the "Loading…" text; still, with a screen-reader label, when the user prefers reduced motion
- [x] App icon: a row of 5 square blocks, 3 white and 2 darker orange, on the clay background, in `icon-192.png`, `icon-512.png`, `apple-icon.png` and `favicon.ico`, inside the maskable safe zone
- [x] Sign-in page: a centered card with the app icon, the name in the serif font, the tagline and a clay "Continue with Google" button, in light and dark mode
- [x] Sign out: a "Sign out" button at the bottom of the sidebar (icon only in the phone top bar) ends the session and returns to the sign-in page

## T-15: Activity polish, dates in words and editing entries
Status: done
- [x] Dates: every date the app shows is in words, like "Jan 2, 2027", on Activity, account history, Overview, Recurring bills, Installments, Goals, Debts and Budget, through one helper with a unit test (including a month boundary and a date-only string in Asia/Manila); form date inputs stay native
- [x] Wording: every user-facing "Delete" is "Remove" (buttons, dialog titles, confirmations, screen-reader labels), on every page; behaviour is unchanged
- [x] Icons: simple lucide icons on each sidebar page and on the action buttons (Add, Edit, Remove, Pay); every icon-only button has an accessible name
- [x] Month picker: the From/To inputs and the "This month" and "Last month" pills become a grid month picker (a button showing "November 2026" that opens a year header with previous and next arrows, a 4×3 month grid and a "This month" row); months before the earliest entry and after the current month (Asia/Manila) are dimmed and can't be picked, and the current month is easy to find; From/To stay under a small "Custom range" for single days and ranges; it works with the Activity type filter and on the account history pages
- [x] Activity time: Activity and the account history list show the time each entry was logged beside its date, from the entry's created time, labelled as logged time; no schema change
- [x] Edit entries: an income, expense or transfer can be edited from Activity and the account history page (type, account, amount, date, category, payee, note); an edit that would take an account below zero is refused, balances stay correct on both sides of a transfer (including to a name), and entries linked to a bill, debt, goal or installment are not editable; a unit test covers the balance effect of an edit, and the rule is proved on dev
- [x] Existing entries, balances, Budget and Overview figures are unchanged for the same data; the migration, if any, is additive only

## T-16: Mobile layout, cards and a drawer
Status: done
- [x] Below 768px every table page shows each row as a card: title, labelled fields, amount top right, then actions. Pages: Activity, account history, Accounts, Recurring bills, Installments, Goals, goal detail, Debts, debt detail, Budget, Settings. From 768px up they stay tables, unchanged
- [x] The cards come from the shared `components/ui/table.tsx` plus a `data-label` on each cell, not from a second card list per page. The header row is hidden visually but stays for screen readers; the table roles are set explicitly so `display: block` rows are still announced as rows
- [x] Below 768px the sidebar becomes a top bar with a hamburger that opens a sheet drawer: the nine page links with icons (current page marked), the theme toggle and Sign out; it closes on navigate, on the backdrop, and on Esc. From 768px up the sidebar is unchanged
- [x] The Overview mini-tables become compact lists below 768px (no labels)
- [x] At 360px wide no page scrolls sideways; buttons and links in cards and the drawer are at least 44px tall
- [x] Display only: no balance, budget, entry or schema change; `pnpm lint`, `pnpm test` and `pnpm build` pass
- [x] Looked at on a phone or at 390px, signed in, light and dark, on every page above

## T-17: Bill and installment detail pages
Status: done
- [x] Bills: each row on Recurring bills links to `/bills/[id]` (the name is the link, same as Debts). The page shows the amount, repeat, next due date, this cycle's pixel progress and the Pay button, then a history of every payment (date, paying account, amount, note), newest first. Paying a bill, installment, debt or goal has an optional Note saved on the payment and shown in its history. A bill with no payments shows a short empty message; an unknown id, or another user's, gives a 404
- [x] Installments: each row on Installments links to `/installments/[id]`. The page shows "3 of 12 paid" with the pixel bar, the monthly amount, due day, paying account and the next due date (or "Finished"), then the payment history like the bill page (the pay dialog also has the optional Note), with the months paid before tracking as a muted line
- [x] Date filter: both history lists use the shared month picker and Custom range, driven by the URL. The progress and totals at the top stay over all payments; the filter only hides history rows, as on the account history page
- [x] No schema, balance, budget or due-date change; the only write change is the optional payment note (`transactions.note` already exists); below 768px the histories show as cards from the shared table; `pnpm lint`, `pnpm test` and `pnpm build` pass
- [x] Mobile cards: below 768px, Edit and Remove move into a "⋯" menu on every card that has them (Accounts, Bills, Debts, Goals, Installments, Activity, Settings, Budget), with an `aria-label` naming the item and a tap target of about 44px; the main action (Pay, Add money, Add entry) stays visible, Remove keeps its confirm dialog, desktop rows are unchanged; any new dependency is approved before it is installed
- [x] Looked at signed in on dev with real payments, light and dark, at 390px and desktop, including a 404 for a made-up id

## T-18: Edit or undo bill, debt, goal and installment payments
Status: done
- [x] Design first: a decision in `knowledge/decisions/` says which fields of a linked payment can change, and what happens to the bill's or installment's next due date and to debt and goal progress on an edit and on a remove. I approve it before any code
- [x] A payment can be edited from its row in the history on its bill, installment, debt or goal page (amount, date, account, note). Progress and the next due date follow the edit; an edit that would take an account below zero is refused
- [x] Removing a bill or installment payment rolls the next due date back when that payment was the one that rolled it; debt and goal progress follow a remove, as today
- [x] Linked rows on Activity either get the same edit or keep their read-only rule, as the decision says. A unit test covers the due-date and progress effect, the rules are proved on dev with the real actions, and the migration, if any, is additive only

## T-19: Overview redesign and account icons
Status: done
- [x] Mock first: a one-file HTML mock of the new Overview (light and dark, 390px and desktop) and the account icon picker, approved by the owner before any code
- [x] Overview matches the approved mock and `docs/design.md`: four stat cards (Net worth, Income this month, Expenses this month with % against last month, Bills due in 7 days) each with a pixel bar; lists for Accounts, Upcoming bills, Goals, Debts and Recent activity with "View all"; status pills (Due soon, Upcoming, Today). Budget left no longer shows on Overview
- [x] Account icons: one nullable `icon` column on accounts (additive migration); a logo from the fixed list (BPI, GCash, Maya, UnionBank, GSave, MariBank, files in `public/banks/`), a colour tile from a fixed palette, or the generic lucide icon when null; a picker in the account form; the icon shows in every account list and on the Overview. Logo files that can't be sourced reliably fall back to tiles
- [x] Figures unchanged for the same data; the % change and the 7-day total have unit tests, and are checked on dev data; empty states tell the user what to do next
- [x] At 360px no page scrolls sideways, targets are at least 44px; `pnpm lint`, `pnpm test` and `pnpm build` pass; `docs/design.md` still matches

## T-20: Set aside by linked transfers
Status: done
- [x] Mock first: a one-file HTML mock (`prototypes/set-aside.html`) of the Set aside and Paid bars and the transfer form's For dropdown, with the owner's picks (two labelled bars, For under To) approved before any code
- [x] Transfers: adding or editing a transfer shows an optional "For" dropdown under To, grouped Bills / Debts / Installments / Goals with the kind in each label; the link is saved on the transfer (four additive nullable columns, at most one set, transfers only) and Activity's For column shows "Set aside · <name>". A set-aside transfer stays an ordinary, editable, removable transfer; another user's item id is refused
- [x] Figures: each bill, debt, installment and goal row and detail page shows a "Set aside" pixel bar and figure above its Paid or Saved bar, only when something is linked. Bills count transfers since the cycle start; installments count transfers since the last payment, against the monthly amount; debts and goals are a running sum against the full amount that payments don't reduce. The two figures are never added, and Overview does not show Set aside
- [x] No side effects: a linked transfer changes no paid figure, due date, installment count, account balance, budget or net worth; Pay and Add money behave as before; a full Set aside bar marks nothing paid. Editing or removing a linked transfer updates the figure; deleting the item clears the link and keeps the transfer. A DB-backed test on dev proves these
- [x] Pay "To": the Pay form on bills, debts and installments has an optional "To" name (anyone, max 60 characters; one nullable `paidTo` column, additive); it is saved with the payment, shown in the payment history, editable from the history row, and the payment is still an expense from the From account. Goals' Add money has no To
- [x] `pnpm lint`, `pnpm test` and `pnpm build` pass; the migration is additive and applied to dev only after the DB host check; looked at signed in on dev with a linked transfer on each of the four kinds, at 390px (no sideways scroll) and desktop

## T-21: Set aside before tracking
Status: done
- [x] Field: the bill, debt, installment and goal forms have an optional "Set aside before tracking" amount, next to "Already saved" or "Paid before tracking" where one exists (one additive `set_aside_before` column per table, default 0, never negative); "Already saved" and "Paid before tracking" keep feeding the Saved and Paid bars and Overview exactly as today
- [x] Figures: the amount is added into that item's Set aside bar and figure. Goals and debts: it counts for good, like their running sum. Bills: it counts until the cycle rolls. Installments: it counts only until the next payment. The Set aside bar shows when the amount is above zero even with no linked transfer; the two figures are still never added, and Overview does not show Set aside
- [x] No side effects: no Saved, Paid, due date, installment count, account balance, budget or net worth changes. A DB-backed test on dev proves that, and that paying an installment or rolling a bill's cycle drops its pre-tracking amount while goals and debts keep theirs
- [x] `pnpm lint`, `pnpm test` and `pnpm build` pass; the migration is additive and applied to dev only after the DB host check; looked at signed in on dev on all four kinds, at 390px (no sideways scroll) and desktop

## T-22: Set aside summary page
Status: done
- [x] Page: a "Set aside" page after Budget in the sidebar and the mobile drawer, matching `prototypes/set-aside-summary.html` (approved): a flat table with Kind, Item, Set aside and Out of, biggest first, one Total row that sums Set aside only (Out of is never summed). Items with nothing set aside are left out, and an empty page tells the user what to do next
- [x] Figures: each row's Set aside is the same figure the item's own page shows, from the four helpers in `lib/set-aside.ts` (bills until the cycle rolls, installments until the next payment, goals and debts for good, before-tracking amounts included). Out of is the goal target, debt total, bill amount or monthly installment. A DB-backed test on dev with one item of each kind proves the rows, the order and the Total
- [x] Read-only, no schema change: nothing it shows or loads changes a Saved, Paid, due date, installment count, balance, budget or net worth; Overview does not show Set aside
- [x] Phone: below 768px each row becomes a card (kind and "out of" under the name, amount top right) with the Total below, using `ui/table.tsx`; no sideways scroll at 390px
- [x] Status: each row ends in a Status pill. When Set aside is at or over Out of it reads "Ready to pay" (bills, installments, debts) or "Full" (goals and debts owed to you); before that it shows the amount still to go. The Total row has no status. A DB test covers the boundary (just under, equal, over)
- [x] `pnpm lint`, `pnpm test` and `pnpm build` pass; `docs/design.md`'s sidebar list is updated; looked at signed in on dev with the real items, at 390px and desktop

## T-23: Goals are a jar, and installment payments pick their account
Status: done
- [x] Goals: Add money is gone. A goal fills only through a transfer whose For is that goal (Activity). The goal bar and its figure are the one Set aside figure, shown the same on Goals, the goal page, Overview and the Set aside page; there is no separate Saved bar
- [x] The goal form loses "Saved in" and "Already saved"; "Set aside before tracking" is renamed "Already saved" for goals. A goal can exceed its target (it shows the real number); the target check against saved goes away
- [x] Data keeps its meaning (one additive migration, applied to dev only after the host check): each goal's old "Already saved" is added into its before-tracking amount, old Add money transfers become For-linked transfers, `goals.account_id` becomes optional and is cleared. Every goal's figure after equals Saved + Set aside as before
- [x] The goal page lists the transfers linked to it (date, from, to, note, amount), read-only; edit and remove happen in Activity
- [x] Accounts no longer block deleting an account because a goal or an installment sits in it; setup still creates goals without an account
- [x] Installments: the form has no Account field and an installment can be saved without one. "Record payment" has a required From account (like Recurring bills) and an optional To: free text with the user's account names as suggestions, saved as `paid_to`, no money moves. The payment is an expense for the monthly amount out of the From account, checked against its balance (never negative); due date, months paid and Set aside behave as today
- [x] `pnpm lint`, `pnpm test` (DB test run 3 times) and `pnpm build` pass; docs updated; looked at signed in on dev at 390px and desktop

## T-24: Mark goals done
Status: done
- [x] Mark done: a nullable `done_at` column on goals (one additive migration, applied to dev only after the DB host check). "Mark done" and "Reopen" are in the row menu on Goals and on the goal page; Reopen clears it. A done goal shows a "Done" pill, and done goals list below open ones (deadline order inside each group). Marking done is manual only: reaching or passing the target never does it
- [x] Drops out: a done goal is left out of the Set aside page, including its Total, and out of Overview's Goals list. Its own page still shows its figure and its linked transfers. Reopening brings it back to both
- [x] No side effects: marking done or reopening changes no account balance, no transfer, no other goal and the goal's own figure. A DB-backed test on dev proves that, and that the Set aside rows and Total skip a done goal and count it again once reopened
- [x] `pnpm lint`, `pnpm test` (DB test run 3 times) and `pnpm build` pass; `docs/brief.md` and `docs/design.md` mention done goals where they describe goals; looked at signed in on dev at 390px and desktop

## T-25: Phone bottom bar and Activity opens on today
Status: done
- [x] Phone nav: below 768px the top bar, burger and drawer are gone. A bottom tab bar replaces them, matching `prototypes/mobile-bottom-bar.html` (approved): Overview, Accounts, Activity, Bills and More, using the same icons as the sidebar. The current page's tab is lit (Bills stays lit on `/bills/[id]`, and so on for the other tabs)
- [x] More: opens a sheet with Installments, Goals, Debts, Budget, Set aside and Settings. Choosing a page closes it. More is lit on the pages it holds. Sign out and the theme toggle live on the Settings page below 768px (the sidebar keeps them from 768px up, which is unchanged)
- [x] Phone fit: the bar stays at the bottom, page content is never hidden behind it, each tap target is at least 44px, and there is no sideways scroll at 390px
- [x] Activity default: opening `/activity` with no `from`/`to` shows only today's entries (Asia/Manila date). The picker button reads "Today" then; an empty day says so
- [x] Picker: the month grid, Today, This month and All dates. "Month to date" and "Custom range…" are gone, with their form and state. "All dates" still reaches everything, and a link with `from`/`to` in the URL (a month, or an older bookmark) still filters correctly
- [x] Scope: the account, bill and installment pages differ only in that their picker loses Month to date and Custom range; Overview's Income and Expenses cards open Activity on this month and Recent activity's View all on all dates; no balance, query or schema change beyond the Activity default
- [x] `pnpm lint`, `pnpm test` and `pnpm build` pass; `docs/design.md` describes the bottom bar and the new Activity default; looked at signed in on dev at 390px and desktop

## T-26: Phone polish: Add entry sheet and Accounts cards
Status: todo
- [ ] Add entry on phones: below 768px "Add entry" and "Edit" open a full-screen sheet matching `prototypes/mobile-add-entry.html` (approved): Expense, Income and Transfer tabs, a large amount that autofocuses with the numeric keyboard, and a Save button pinned at the bottom
- [ ] Pickers: Account and Category are big buttons that open a bottom sheet of rows (accounts show their balance, the chosen row is ticked). A transfer shows From and To side by side; "Someone else…" is only in To and then asks for a name. A type with no categories says so and links to Settings
- [ ] Rest of the sheet: Date is a full-width row defaulting to Today, the note is full width below it, and Payee and "For (set aside)" sit in a collapsed "More" row. Errors show under their field. Saving, validation and the server action are unchanged
- [ ] Last used: a new entry starts on the account used last, kept in the browser's localStorage, with no schema change. Edit starts on the entry's own account
- [ ] Accounts on phones: below 768px a Net worth card, then a full-width card per account matching `prototypes/mobile-accounts.html` (approved): tinted with its tile color, big balance, "Not in net worth" when left out, a ⋯ with Edit and Remove (Remove still confirms). The card opens the account's page
- [ ] Unchanged: desktop (the Add entry dialog and the Accounts table), the pay and add-money forms on bills, debts, goals and installments, and all balance math and queries
- [ ] Phone fit: every tap target is at least 44px, no sideways scroll at 390px, and the pinned Save stays reachable with the keyboard open
- [ ] `pnpm lint`, `pnpm test` and `pnpm build` pass; `docs/design.md` describes both phone layouts; looked at signed in on dev at 390px and desktop

## T-27: Insights, where the money goes
Status: todo
- [ ] Insights page: a sidebar item and a tab in the phone More sheet, matching `prototypes/insights.html` (approved). A month picker with previous and next arrows (`?month=YYYY-MM`, default this month in Asia/Manila, never after it), then Income, Spent and Left for that month
- [ ] Where it went: the month's expenses grouped by category, biggest first, each with its amount, its share of spending and the change against the month before (hidden when that month has none). Expenses with no category are grouped as Bills, Debts, Installments (their payments) or Uncategorized. Bars use the existing look; no chart library
- [ ] Last 6 months: income and spent bars side by side for the six months ending at the chosen one, the chosen month marked
- [ ] A written line built from the numbers (a template, no AI, no API): spent, change against last month, the top category's share, what is left of income. An empty month says so
- [ ] Money rules: only income and expense entries count; transfers (between accounts, to goals, to someone else) are left out; nothing is stored, no schema change; the figures come from the same entries Activity shows, so they match it
- [ ] Phone fit: every tap target at least 44px and no sideways scroll at 390px
- [ ] `docs/brief.md` no longer lists charts and reports as non-goals ("AI chat" stays); `docs/design.md` describes the page; `pnpm lint`, `pnpm test` and `pnpm build` pass; looked at signed in on dev at 390px and desktop

## T-28: Phone cards, part 1: category icons, hero block, Overview, Activity and Add entry
Status: todo
- [ ] Category icons: a category can have an icon from a fixed list (about 16: food, transport, home, bills, shopping, health, and so on); one nullable `icon` on categories, no uploads; picked in Settings when adding or renaming a category, with a generic icon when none is picked. The activity rows, the Add entry Category picker and Insights/Budget rows show it
- [ ] Phone hero block: below 768px each page this task covers starts with a solid clay block holding the page's one big number, matching `prototypes/mobile-cards.html` (approved): Overview net worth with the % vs last month, Activity spent this month. Text is white; the block works in light and dark
- [ ] Phone icon cards: below 768px the Overview lists and the Activity rows are cards (icon tile, name, one muted line, amount at the right; income green, transfers a swap icon), at least 64px tall
- [ ] Add entry on phones: the amount, with the Expense/Income/Transfer tabs, sits in the hero block; Account and Category are icon cards (the chosen category shows its icon); Save stays pinned
- [ ] Unchanged: desktop (768px and up), all balance math and queries, and the pages T-29 covers; no change to any server action beyond saving a category's icon
- [ ] Phone fit and themes: tap targets at least 44px, no sideways scroll at 390px, light and dark both readable; looked at signed in on dev and on the owner's phone
- [ ] `pnpm lint`, `pnpm test` and `pnpm build` pass; `docs/design.md` and `docs/decisions/` describe the hero block, the cards and the category icons; looked at signed in on dev at 390px and desktop

## T-29: Phone cards, part 2: the other pages
Status: todo
- [ ] Accounts, Bills, Goals, Debts, Installments, Budget, Insights, Set aside and Settings get the same phone hero block and icon cards as T-28, matching `prototypes/mobile-cards.html`. Desktop and all data logic unchanged
- [ ] Planned after T-28 is looked at on a real phone, so what is learned there shapes this
