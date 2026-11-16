# Edit and undo linked payments

## Context
Bill, installment, debt and goal payments are `transactions` rows with `billId`, `installmentId`, `debtId` or `goalId`. They drive progress and due dates, so T-15 made them read-only on Activity. Remove already works from Activity, but it never rolls a due date back: removing the payment that closed a bill cycle leaves the bill on the next cycle with the old one unpaid.

A bill's cycle is the payments with `created_at > bills.cycleStart`. The payment that fills a cycle sets `nextDueDate` forward and `cycleStart = now()` in the same transaction, so its `created_at` equals the new `cycleStart`. That equality is the only trace of "the payment that rolled it".

## Options
- **A (chosen):** store, on the rolling payment, the `cycleStart` it replaced (one nullable `transactions.rolled_cycle_start`). The previous due date is computed by inverting `nextDueDate` (exact from `repeat` and `dueDay`). Installments need no marker: they are monthly and the due date follows the payment count.
- B: derive the previous `cycleStart` from earlier payments. Rejected: bills can change amount and earlier rollers are unmarked, so the answer can be wrong.
- C: let an edit also finish or reopen a bill cycle. Rejected: more code and more ways to be wrong; "Record payment" finishes a cycle.

## Decision
Option A. Editable on all four kinds: amount, date, account, note. Not editable: which bill, debt, goal or installment it belongs to, type, payee. The due date and cycle never follow a payment's date field; they follow the cycle and the count. Every edit rechecks all accounts and refuses with "This would take X below zero."

| | Edit | Remove |
|---|---|---|
| Bill, payment in the current open cycle | Amount free while the cycle total stays below the bill amount; date, account, note free | Cycle total drops; no date change |
| Bill, the payment that closed the last cycle | Amount locked; date, account, note free | Rolls back: due date back one repeat, cycle reopens with the stored `rolled_cycle_start` |
| Bill, older closed-cycle payment | Amount locked; date, account, note free | Removed; no date change |
| Installment | Amount free (> 0), progress counts payments; date, account, note free | Count drops by one, due date back one month; if it was the final payment (which did not roll) the due date stays |
| Debt (owe: expense, owed: income) | Amount free while all payments stay <= total - paid-before; account, date, note free | Progress follows; refused if the receiving account would go below zero |
| Goal (transfer into the goal's account) | Amount free while all stay <= target - saved-before; "from" account can't be the goal's account; date, note free | Progress follows; same below-zero refusal |

Activity keeps Edit read-only on linked rows (edit from the owning page). Remove stays on Activity and runs the same roll-back. Removing a payment that closed a cycle is also refused while the next cycle has payments ("Remove those first"), because reopening the old cycle would pull them into it. A cycle closed before this column existed has no stored `rolled_cycle_start`; removing it is refused with a clear message.

## Consequences
- One additive migration: a nullable column on `transactions`, no backfill.
- A bill payment that closed a cycle can't have its amount changed; the owner removes it and records it again.
- A bill payment that closed a cycle before this task has no marker, so it can't be removed (it can still have its date, account and note edited). Acceptable for the few rows from before this task; the count on dev is checked when applying.
