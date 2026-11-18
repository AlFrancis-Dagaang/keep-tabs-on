# Brief

## Problem
People who keep money in several places (bank, GCash/Maya, savings, cash) can't see their real total or where it went. They track bills, installments and savings goals in their heads, in notes or in messy spreadsheets. So they miss due dates, overspend, and can't tell whether they're saving.

## User
Young Filipino employees (about 20–30) in their first or second job. They're paid monthly or twice a month and split their money across 3–6 accounts. For now I'm the only user; friends come later, no date set.

## Core loop
1. Log money as it moves: income, expense, or a transfer between my own accounts.
2. Pay a recurring bill or debt from an account and watch its progress bar fill.
3. Fill a goal by making a transfer and picking the goal under For.
4. Check the overview: net worth, income and expenses this month, bills due soon, account balances, goals and debts.

## v1 scope
- **Setup:** currency, accounts with today's balance, spending and income categories (monthly budgets optional), and optional bills, goals and debts.
- **Accounts:** balance = starting + income − expenses + transfers in − transfers out. Shows a net worth total; an account can be left out of it (still listed, still usable). Editing a balance adjusts the starting balance. Each account has its own history page with a running balance and a date filter, and an optional icon: a bank logo, a colour tile or cash.
- **Activity:** income, expense and transfer entries, each with a category, a payee, an optional note and an optional link to a bill, debt, goal or installment. A transfer can go to one of my accounts or to someone else (a free-text name): the money leaves the account and counts as neither expense nor budget. Filter by type and by date (month, day or range). Edit entries (not ones linked to a bill, debt, goal or installment) and remove them.
- **Recurring bills:** amount, next due date, and a repeat interval (weekly, every 2 weeks, monthly, every 3 months, yearly). Partial payments are allowed. Paying in full rolls the next due date forward; the due date can always be edited. It has a detail page with its payment history and a date filter, like debts.
- **Debts:** money you owe or money owed to you, in one list with a type label. Total, deadline, amount paid (or received) before tracking, linked payments or receipts, progress and history. Receiving a repayment adds it to an account.
- **Installments:** a fixed-term purchase paid monthly: monthly amount, number of months, months already paid and due day. Recording a payment picks the account it comes from, logs an expense, shows "3 of 12 paid" and rolls the due date; it finishes after the last payment. It has a detail page with its payment history and a date filter, like debts.
- **Notes:** bills, debts, goals, installments and entries can each carry an optional note (up to 200 characters). Payments made from a pay dialog carry an optional note too, shown in the payment history.
- **Goals:** a jar with a target, a deadline and an amount already saved. One figure: already saved plus the transfers whose For is the goal; it can pass the target. The goal page lists those transfers, read-only. Mark done (and Reopen) is manual: a done goal shows a "Done" pill, lists below open ones, and leaves Set aside and the Overview Goals list; its page keeps its figure and transfers.
- **Set aside:** a transfer can be tagged For a bill, debt, installment or goal. A Set aside page lists what is parked for each, biggest first, with a Total and a "Ready to pay" or "Full" status. Balances are never split.
- **Editing payments:** on a bill, installment, debt or goal page, a payment can be edited (date, account, note, and the amount where it does not close a bill cycle) or removed. Removing the payment that closed a bill cycle or an installment month rolls the due date back. A change that would take an account below zero is refused.
- **Budget:** monthly limits on spending categories only (bill and debt payments don't count). Shows the current month with a total. Past months are kept with budget, spent and saved per month and per category, and each month's budget amounts are saved as they were.
- **Settings:** currency, manage categories.
- **Sign-in:** Google sign-in. Each user sees only their own data.

## Non-goals
- Exploring with sample data during setup.
- Pausing recurring bills.
- Bank or e-wallet syncing, statement or CSV import.
- Envelopes that split an account's balance, or funding per payday.
- A payday wizard or custom budget periods (monthly only).
- AI chat, charts beyond progress bars, reports.
- Investments, more than one currency per user, shared or family budgets.
- Native iOS/Android apps and push notifications (an installable web app is enough).

## Done signal
- I use it daily for one full month (two paydays, started 14 Nov 2026) and log every transaction. At month end, every account balance in the app matches my real bank and e-wallet apps.
- At least one recurring bill finishes a cycle and rolls to the correct next due date, and one past month shows up in budget history.
