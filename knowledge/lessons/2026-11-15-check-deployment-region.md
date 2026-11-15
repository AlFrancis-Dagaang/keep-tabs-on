# Read the deployment's regions field to see where functions run, not the region in the logs

Date: 2026-11-15   Task: T-10

## What happened
Slow production pages were blamed on region, then ruled out because every runtime log line said region=sin1 (decision 2026-11-14). The deployment record says regions: ["iad1"] (Washington DC) while Neon is in Singapore, so each database round trip crosses the Pacific.

## Root cause
The log's region field was assumed to be the function's region. It is likely where the request was received, and one entry on the same deployment said sfo1. Nobody checked the deployment's own regions field, and the decision was recorded as settled on that one signal.

## Rule
To decide where functions run, read `regions` from get_deployment (and the project's Function Region); never infer it from the `region` field in runtime logs, and say what the evidence cannot show before recording a decision that rules a cause out.

## Applies when
Any task about slow loads, latency, or Vercel/Neon placement; edits to vercel.json; decisions in knowledge/decisions/ that rule out a cause.
