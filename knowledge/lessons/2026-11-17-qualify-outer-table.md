# Qualify the outer table in raw SQL subqueries
Date: 2026-11-17   Task: T-20
## What happened
The set-aside correlated subqueries read the wrong id. Drizzle renders a column as unqualified in a single-table select, so the raw subquery bound to its own table. The installment set-aside sum returned 0 instead of 150,000, and a DB test caught it.
## Root cause
I assumed `${table.col}` inside a `sql` template always renders as "table"."col".
## Rule
In a raw `sql` subquery, write the outer table's column with its name spelled out ("bills"."id"); never rely on the interpolated column being qualified.
## Applies when
Correlated subqueries or other raw `sql` that reference an outer table, such as `lib/set-aside.ts` and any new progress or sum helper.
