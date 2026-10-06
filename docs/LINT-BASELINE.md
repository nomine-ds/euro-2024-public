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

This baseline does not certify the disabled rules as safe or resolve functional issues discovered while reviewing lint output.

## Lint Warning Threshold Debt

`frontend/package.json` currently defines `lint` as `eslint` without `--max-warnings`. C-00 requires a zero-error lint baseline, but warning-count enforcement is deferred rather than changing the existing command in this follow-up.

## Frontend Test Baseline (C-01-pre)

Date: 2026-10-06

- Runner: Vitest 5.0.3, React Testing Library, jsdom.
- Tests: 7 passing across 4 files.
- Coverage: lines 1.59%, functions 1.65%, branches 1.09%, statements 1.37%.
- Targets: lines 30% by Sprint 2 and 60% by Sprint 3. This run remains below both targets.
- Production UI coverage remains excluded from the numeric report. The chatbot has response/error interaction tests, and Next.js async Server Components are not covered because Vitest does not support them.
- Network calls in the API tests are mocked with `fetch`; MSW is installed for future request-level tests.
