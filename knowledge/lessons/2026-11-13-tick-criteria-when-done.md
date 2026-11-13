# Tick a task's acceptance criteria when it's marked done
Date: 2026-11-13   Task: T-06

## What happened
T-06 was set to `Status: done` with its three criteria still `[ ]` in docs/tasks.md and in
knowledge/tasks/T-06.md. The owner caught it before the commit; T-02 to T-05 had the same gap.

## Root cause
/validate's step 9 sets the Status line and says to change nothing else in docs/tasks.md, and /apply
only ticks plan steps. No step owns the criteria boxes, so they stayed empty on every task after T-01.

## Rule
A change that sets `Status: done` also ticks that task's criteria `[x]` in docs/tasks.md and under
"## Acceptance criteria" in its plan file.

## Applies when
/validate closing a task; any edit to docs/tasks.md or knowledge/tasks/T-xx.md that marks a task done.
