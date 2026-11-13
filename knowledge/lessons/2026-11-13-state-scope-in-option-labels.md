# State the exact scope in an option's label when asking the owner to choose
Date: 2026-11-13   Task: T-09

## What happened
The T-09 currency question offered "Short fixed list (Recommended)" and listed PHP, USD, EUR, GBP, SGD, AUD, CAD only in the description. The owner picked it expecting PHP and USD only. After build and validation, the list was cut to two currencies, which needed migration 0007 and edits to the schema, tests and plan. The owner also removed Start over, which the criteria had asked for.

## Root cause
A recommended default was written into the plan as if it were the owner's decision. The question did not check what the owner assumed the scope was. The owner's own criteria were silent on which currencies, and I did not ask that directly.

## Rule
When asking the owner to choose, put the concrete scope (the list, the count, the behaviour) in the option label itself. Before planning a task whose criteria leave a scope open, ask for that scope as its own question. If a built feature drops or narrows something a criterion named, say so and edit the criterion.

## Applies when
/plan-task questions about lists, limits or options (currencies, categories, filters, fields), and any choice that later changes a schema or a constraint.
