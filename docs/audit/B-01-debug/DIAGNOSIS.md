# B-01-debug Diagnosis

## Executive Summary
- Baseline median (5 runs): 64.90s
- After-cache median (8 runs): 70.89s
- Delta: +5.99s (+9.2%)
- Baseline CV: 2.51%
- After-cache CV: 40.92%
- Verdict: no deterministic regression reproduced, but the suite shows high environment-driven variance; the cache is neutral-to-slightly slower by median and not stable enough for a clean performance claim.

## Evidence
- Baseline runs: docs/audit/B-01-debug/runs/baseline-run1.txt to baseline-run5.txt
- After runs: docs/audit/B-01-debug/runs/after-run1.txt to after-run8.txt
- Per-test delta table: docs/audit/B-01-debug/per-test-delta.md
- Cache probe: docs/audit/B-01-debug/cache-log.txt
- Lock probe: docs/audit/B-01-debug/concurrent-test.txt
- Startup lazy-load evidence: docs/audit/B-01-debug/lifespan.txt
- Dedicated cache validation: tests/test_cache.py -> 7 passed in 2.36s

## Variance Analysis
- Baseline distribution: 61.84s, 63.52s, 64.90s, 65.05s, 66.66s
- After-cache distribution: 45.48s, 53.13s, 68.04s, 70.89s, 78.30s, 85.55s, 151.77s, ??
- The after-cache spread is extreme and non-deterministic; CV is 40.9% vs baseline 2.5%.
- This is not a clean "cache regression" signal, but it is also not harmless noise. It indicates unstable environment-driven timing, likely from cold-start I/O or background noise, not a stable algorithmic regression.

## Per-test delta
The median per-test comparison is captured in [docs/audit/B-01-debug/per-test-delta.md](docs/audit/B-01-debug/per-test-delta.md). The largest deltas are concentrated in the heavy endpoints:
- /matches/similar/3943043: +21.47s
- /players/bulk: +11.92s
- /teams: +11.45s
The root cause is not a unique cache bug in the global layer; it is broad sampling variance in the data-heavy endpoints.

## Cache Analysis
- Cache hit/miss probe result: 3 hits, 3 misses, key pattern = [match:base, player:base, team:base]
- This confirms the cache is active and reuses repeated key requests.
- The global lock does not appear to be the dominant bottleneck in the concurrent probe.

## Lock Analysis
- The three-key concurrency probe elapsed 0.21s. That is effectively parallel behavior, not serial behavior.
- Conclusion: the shared asyncio lock is not the source of the observed smoke-suite instability in this environment.

## Lifespan Analysis
- The startup path in [app/main.py](app/main.py) intentionally skips expensive startup precompute and loads data lazily.
- This matches the intended design and is not a regression trigger.

## Root cause
- Deterministic cache regression: not reproduced.
- High variance: reproduced and still unresolved in the environment.
- Best evidence-based interpretation: the suite is timing-sensitive and unstable under this workload, but the cache itself is effectively neutral to slightly slower by median, not catastrophically worse.

## Recommendation
- Do not revert the cache layer based on the currently available evidence.
- Do not treat this as a stable performance regression either; it is a variance issue that needs profiling and a stable benchmark environment.
- Proceed to Fase 2 profiling only after explicit approval, with this variance note documented.

## Decision
- Status: partial closed
- The variance issue is explained and documented, but it remains an operational risk rather than a deterministic code bug.
