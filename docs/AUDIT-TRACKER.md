# Audit Remediation Tracker

| ID | Title | Sprint | Status | Commit | Date | Notes |
|---|---|---:|---|---|---|---|
| B-05 | Hide docs in production | 1 | Closed | `cc08eb1` | 2026-10-02 | |
| C-00 | Lint baseline cleanup | 0 | Closed | `f910477` | 2026-10-02 | |
| C-01-pre | Frontend test scaffold | 0 | Closed | `6f4636f` | 2026-10-02 | Coverage baseline: 0.56% lines |
| R-02-pre | npm vulnerability remediation | 1 | In progress | — | 2026-10-06 | Removed unused JupyterLite packages and upgraded Next/Vitest. Five high findings remain in the Next ESLint dependency chain; npm offers only a breaking Next 14 downgrade. |
| H-01 | Minimal CI workflow | 1 | Closed | — | 2026-10-06 | GitHub Actions runs backend/frontend checks and Gitleaks; production dependency audit is included. |
| B-12 | CORS origin validation | 1 | Closed | — | 2026-10-06 | Origins now come from CORS_ORIGINS; wildcard is rejected in production. |
| B-13 | Rate-limit key spoofing | 1 | Queued | — | — | |
| B-01+B-02 | Async boundary + timeout | 1 | Queued | — | — | Combined finding |
| AI-01 | Pin embedding model | 1 | Queued | — | — | |
| AI-02 | Chroma backup | 1 | Queued | — | — | |
| AI-04 | Token cap | 1 | Queued | — | — | |
| R-01 | Secret scan | 1 | Closed | — | 2026-10-06 | Gitleaks runs in CI. |
| D-01 | Alembic | 1 | Queued | — | — | |
| D-04 | Backup drill | 1 | Queued | — | — | |