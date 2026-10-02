# Lint Baseline

C-00 establishes the repository's repeatable static-check baseline. These checks are intended to catch new regressions while keeping this cleanup behavior-preserving.

## Commands

From the repository root:

```powershell
python -m ruff check .
```

From `frontend/`:

```powershell
npm run lint
npm run typecheck
```

The backend Ruff version is pinned in `requirements.txt`. Frontend lint and typecheck commands are defined in `frontend/package.json`.

## Baseline Policy

Ruff checks `E` and `F` rules. `E402` is ignored because `app/main.py` registers routers after constructing the FastAPI app to avoid circular-import problems. `E501` is ignored for existing long lines; formatting cleanup is outside C-00.

ESLint retains the Next.js configuration. The following legacy rules are disabled while their existing violations remain outside this behavior-preserving baseline: explicit `any`, unused variables, unescaped JSX entities, exhaustive effect dependencies, state updates in effects, and React immutability diagnostics. The TypeScript compiler remains strict, including unused-local and unused-parameter checks.

This baseline does not certify the disabled rules as safe or resolve functional issues discovered while reviewing lint output. In particular, the bot chat currently constructs no rendered assistant response after receiving an answer; that behavior was not changed as part of C-00 and should be addressed separately.
