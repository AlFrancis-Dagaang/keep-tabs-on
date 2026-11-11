# Never model owed money as a negative account balance
Date: 2026-11-10   Task: T-02

## What happened
The T-02 design let account balances go negative (e.g. a credit card as an account).
The owner corrected it: accounts are money you have; credit cards and loans are Debts (T-05).

## Root cause
The model was taken from generic finance apps instead of the brief, which already keeps
Debts as their own entity (total, deadline, payments) separate from accounts.

## Rule
Account balances and starting balances are >= 0; parseMoney rejects negatives, and anything
owed goes in the debts table, never as a negative account.
Shown balances stay >= 0 (exactly zero is fine); when a balance is edited, the starting balance may go below
zero as an adjustment (T-03 decision).

## Applies when
Accounts, money parsing (lib/money.ts), transactions/transfers that lower a balance (T-03),
debts (T-05), net worth on the overview (T-08).
