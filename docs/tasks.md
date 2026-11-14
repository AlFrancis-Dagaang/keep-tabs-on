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
