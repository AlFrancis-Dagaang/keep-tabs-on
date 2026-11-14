# Show a headline figure on the owner's real data before planning how it's defined
Date: 2026-11-14   Task: T-11

## What happened
T-11 planned net worth as accounts + owed to you − you owe, and the owner approved the formula in chat. After it was built (a `netWorth` function, three tests, doc edits), the owner saw the numbers on their own data and asked for net worth to stay the account sum, because debts inside it were confusing. The function, tests and doc lines were removed.

## Root cause
The formula was approved in words, not as a number. A figure the owner reads every day was judged in the abstract, and the confusion only showed with their own balances. I also took "should it count toward net worth?" as a yes to the whole formula without confirming what they pictured.

## Rule
When a task changes how a headline figure (net worth, budget left, any Overview stat or total) is calculated or what it includes, put a worked example with the owner's real numbers in the plan questions and get that number approved before building.

## Applies when
/plan-task for any change to an Overview stat card, a total or balance, or what a figure includes or excludes.
