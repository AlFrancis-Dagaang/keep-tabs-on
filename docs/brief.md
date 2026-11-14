# Brief

## Problem
People who keep money in several places (bank, GCash/Maya, savings, cash) can't see their real total or where it went. They track bills, installments and savings goals in their heads, in notes or in messy spreadsheets. So they miss due dates, overspend, and can't tell whether they're saving.

## User
Young Filipino employees (about 20–30) in their first or second job. They're paid monthly or twice a month and split their money across 3–6 accounts. For now I'm the only user; friends come later, no date set.

## Core loop
1. Log money as it moves: income, expense, or a transfer between my own accounts.
2. Pay a recurring bill or debt from an account and watch its progress bar fill.
3. Add money to a goal by transferring between accounts.
4. Check the overview: net worth, account balances, budget left this month, upcoming bills.

## v1 scope
- **Setup:** currency, accounts with today's balance, spending and income categories (monthly budgets optional), and optional bills, goals and debts.
- **Accounts:** balance = starting + income − expenses + transfers in − transfers out. Shows a net worth total; an account can be left out of it (still listed, still usable). Editing a balance adjusts the starting balance. Each account has its own history page with a running balance and a date filter.
- **Activity:** income, expense and transfer entries, each with a category, a payee, an optional note and an optional link to a bill, debt, goal or installment. A transfer can go to one of my accounts or to someone else (a free-text name): the money leaves the account and counts as neither expense nor budget. Filter by type and by date (month, day or range), delete entries.
- **Recurring bills:** amount, next due date, and a repeat interval (weekly, every 2 weeks, monthly, every 3 months, yearly). Partial payments are allowed. Paying in full rolls the next due date forward; the due date can always be edited.
- **Debts:** money you owe or money owed to you, in one list with a type label. Total, deadline, amount paid (or received) before tracking, linked payments or receipts, progress and history. Receiving a repayment adds it to an account.
- **Installments:** a fixed-term purchase paid monthly: monthly amount, number of months, months already paid, due day and the account it's paid from. Recording a payment logs an expense, shows "3 of 12 paid" and rolls the due date; it finishes after the last payment.
- **Notes:** bills, debts, goals, installments and entries can each carry an optional note (up to 200 characters).
- **Goals:** target, deadline, the account the money is saved in, and the amount already saved. Progress comes from linked transfers; history shows from and to.
- **Budget:** monthly limits on spending categories only (bill and debt payments don't count). Shows the current month with a total. Past months are kept with budget, spent and saved per month and per category, and each month's budget amounts are saved as they were.
- **Settings:** currency, manage categories.
- **Sign-in:** Google sign-in. Each user sees only their own data.

## Non-goals
- Exploring with sample data during setup.
- Pausing recurring bills.
- Bank or e-wallet syncing, statement or CSV import.
- Envelopes or jars inside accounts, holding accounts, funding per payday.
- A payday wizard or custom budget periods (monthly only).
- AI chat, charts beyond progress bars, reports.
- Investments, more than one currency per user, shared or family budgets.
- Native iOS/Android apps and push notifications (an installable web app is enough).

## Done signal
- I use it daily for one full month (two paydays) and log every transaction. At month end, every account balance in the app matches my real bank and e-wallet apps.
- At least one recurring bill finishes a cycle and rolls to the correct next due date, and one past month shows up in budget history.
