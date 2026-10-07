# Anti-Slop Audit Rules

When asked to audit code, apply the following rules:

## Audit Mode
- **Always start in Plan Mode.** Report findings as a numbered list.
- **Do not modify any file** until the user approves.
- For each finding, state:
    1. **Type**: (Decorative Separator / Restating the Obvious / Workflow Narration / Empty Label)
    2. **Location**: File and line
    3. **Problem**: Short explanation
    4. **Suggestion**: What should be done

## Slop Categories to Check
1. **Decorative Separator**: Lines like `# ====================` or `# ----------` that serve only as decoration.
2. **Restating the Obvious**: Comments that repeat the name of the function or variable below them, e.g. `# Initialize variable` above `count = 0`.
3. **Workflow Narration**: Numbered comments like `# Step 1: ...`, `# Step 2: ...` that make code read like a checklist.
4. **Empty Label**: Category labels with no informative value, e.g. `# Main logic` or `# Helper function`.

## Comments Worth Keeping
- Comments explaining **WHY** (the reason behind a technical decision).
- Comments providing context not obvious from the code (e.g. a workaround for a library bug).
- Docstrings explaining a function's **behavior**, not just repeating its name.