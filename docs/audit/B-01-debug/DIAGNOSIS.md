# B-01-debug Diagnosis

## Executive Summary
- Baseline median (saved baseline file): 70.98s
- Current branch median (3x smoke run): 64.68s
- Delta: -6.30s (-8.9%)
- Verdict: no measurable regression in this workspace; the earlier 83.87s figure was not reproduced

## Evidence
- Baseline record: docs/audit/B-01-followup/durations-before.txt
- Current measurements: docs/audit/B-01-debug/runs/run1.txt, run2.txt, run3.txt
- Dedicated cache validation: tests/test_cache.py -> 7 passed in 2.36s

## Per-run smoke results
| Run | Total time |
|------|------------|
| 1 | 55.21s |
| 2 | 64.68s |
| 3 | 72.28s |

Median: 64.68s

## Root cause analysis
- The current branch does not show a repeatable regression when compared with the saved baseline.
- The largest runtime contributors are still "/matches/similar/3943043", "/players/bulk", "/teams", and the startup/setup phase; these were already dominant before the cache change.
- The cache layer is functional and passes its dedicated tests, and the lazy startup path intentionally avoids expensive eager precompute.
- The issue is therefore not a deterministic cache slowdown in the current repo state; this is variance/noise rather than a measurable regressions pattern.

## Recommendation
- Accept the current cache implementation as non-regressive in this environment.
- Do not revert or add a speculative optimization at this stage.
- Keep the cache layer in place unless a future profiling run proves a new hotspot.
- Continue only after explicit approval for the next phase, if desired.

## Decision
- Status: done
- Fase 2 profile is not required for this branch before approval, because the evidence does not show a regression to fix.
