# Pin Vercel functions to sin1

## Context
Supersedes 2026-11-14-vercel-and-neon-same-region, which ruled region out because runtime logs said `region=sin1`. That field is the request's region. The production deployment record said `regions: ["iad1"]` (Washington DC) while Neon is in Singapore (`ap-southeast-1`), so each query crossed the Pacific (roughly 200 ms a round trip, about 15 round trips per signed-in page). Pages loaded slowly.

## Options
- A: set Function Region in the Vercel dashboard. Rejected: lives outside the repo, easy to lose.
- **B (chosen):** `"regions": ["sin1"]` in `vercel.json`.

## Decision
Option B. Functions run in `sin1`, next to Neon.

## Consequences
- Check it worked: the next deployment's `regions` (get_deployment) must read `["sin1"]`. If pages are still slow, the Neon compute waking from idle and cold starts are still the suspects.
- If the Neon region ever changes, change this with it.
- Lesson: knowledge/lessons/2026-11-15-check-deployment-region.md.
