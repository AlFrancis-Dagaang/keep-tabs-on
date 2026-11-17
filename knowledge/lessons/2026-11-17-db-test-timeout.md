# Give DB-backed tests an explicit timeout
Date: 2026-11-17   Task: T-20
## What happened
The "refuses another user's item" test in `lib/set-aside.test.ts` timed out at Vitest's 5 s default on 3 of 4 runs, which blocked /validate. After `testTimeout: 30_000` it passed 4 of 4.
## Root cause
The test makes many round trips to the remote Neon dev branch, and I didn't check its runtime when I wrote it. I think latency is the cause, but I didn't prove it.
## Rule
A test that touches the database runs under the 30 s `testTimeout` in `vitest.config.mts`; run it 3 times before calling it green.
## Applies when
Any new or changed test that uses `withUser` or a real DB connection.
