# Tasks

## T-01: Walking skeleton
Status: done
- [x] `pnpm install` and `pnpm dev` run without errors; `pnpm test` passes one Vitest test
- [x] Signing in with Google lands on an Overview page showing the signed-in email; signed-out visits redirect to sign-in
- [x] One query runs against Neon as the restricted (non-BYPASSRLS) role inside the per-request transaction helper
- [x] `pnpm build` succeeds

## T-02: App shell and accounts
Status: done
- [ ] Sidebar shows all v1 pages and a light/dark toggle; at 375px wide it becomes a horizontal scrolling top bar and the page never scrolls sideways
- [ ] Create, rename and delete an account with a starting balance; Accounts table lists each balance and a net worth total
- [ ] Editing an account's balance to X changes its starting balance so the shown balance equals X
- [ ] A second Google user sees none of the first user's accounts (RLS), shown by a test or by signing in as both
- [ ] Money is stored as integer centavos and shown with tabular numbers

## T-03: Categories and activity
Status: done
- [ ] Settings lets me add, rename and delete spending and income categories
- [ ] Record income, expense, and transfer (from/to) with date, amount, category and payee; each appears in Activity
- [ ] Account balances follow starting + income − expenses + transfers in − transfers out (Vitest unit test covers all four)
- [ ] Filter Activity by type; delete an entry and the affected balances update

## T-04: Recurring bills and pixel progress bar
Status: todo
- [ ] Create a bill with amount, next due date and repeat (weekly, every 2 weeks, monthly, every 3 months, yearly); due date editable anytime
- [ ] Record payment from an account (partial allowed): an expense linked to the bill is saved, and the bill's 12-block progress bar fills by the paid share of this cycle
- [ ] Paying the cycle in full rolls the next due date in the same DB transaction; unit tests cover each repeat, including Jan 31 → Feb 28/29
- [ ] Progress bar matches docs/design.md: drop-in blocks, clay when complete, flash on completion, no animation under reduced motion
- [ ] Overdue bills show a clay warning badge

## T-05: Debts
Status: todo
- [ ] Create a debt with total, deadline and paid-before-tracking amount
- [ ] Record payment from an account: an expense linked to the debt is saved, and the progress bar shows (paid before + payments) / total
- [ ] Debt detail shows payment history; the bar turns clay and flashes when fully paid

## T-06: Goals
Status: todo
- [ ] Create a goal with target, deadline, saved-in account and already-saved amount
- [ ] Add money moves funds by recording a transfer linked to the goal into its saved-in account; both account balances update
- [ ] Progress = already saved + linked transfers; history lists each transfer with from/to; the bar turns clay and flashes at target

## T-07: Budget
Status: todo
- [ ] Set optional monthly limits on spending categories; Budget page shows this month's budget, spent and left per category and in total
- [ ] Spent counts expenses in spending categories only; payments linked to bills or debts are excluded (unit test)
- [ ] Over-budget categories show clay diagonal stripes on their bar
- [ ] Each month's limits are snapshotted; past months appear in history with budget, spent and saved per month and per category, and changing a limit doesn't change past months (unit test)
- [ ] "This month" uses Asia/Manila dates (unit test around the month boundary)

## T-08: Overview
Status: todo
- [ ] Four stat cards: net worth, income this month, expenses this month, bills due in 7 days
- [ ] Mini tables for accounts, upcoming bills, goals, debts and recent activity, each linking to its page
- [ ] Every page has an empty state telling the user what to do next

## T-09: First-run setup and settings
Status: todo
- [ ] A new user is sent to setup: currency, accounts with today's balance, spending and income categories with optional budgets, then optional bills, goals and debts
- [ ] Finishing setup lands on Overview with the entered data; a returning user skips setup
- [ ] Settings can change currency; "Start over" deletes all of the user's data after a confirmation and reopens setup
- [ ] A fresh account completes setup with 3 accounts and 5 categories in under 5 minutes (timed by me)

## T-10: Ship and the done signal
Status: todo
- [ ] Production deploy on Vercel with Neon production branch; Google sign-in works on the production URL
- [ ] App installs to the home screen on iOS and Android from app/manifest.ts
- [ ] I log every transaction for one full month (two paydays); at month end every account balance matches my real bank and e-wallet apps
- [ ] At least one bill completes a cycle and rolls to the correct next due date, and one past month appears in budget history
- [ ] 3 friends finish setup in under 5 minutes without help and are still logging after 2 weeks
