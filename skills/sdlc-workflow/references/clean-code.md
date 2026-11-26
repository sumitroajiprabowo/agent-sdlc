# Clean Code & LLM Coding Discipline (On-Demand)

Consult this reference when writing or reviewing code (`/sdlc-review`).

## 1. Four Coding Discipline Principles (Anti-Over-Engineering)
1. **Think Before Coding**: State assumptions explicitly; surface ambiguities and tradeoffs instead of guessing silently; push back when a simpler approach exists.
2. **Simplicity First**: Write the minimum code that solves the problem. No speculative features, unrequested configurability, or single-use abstractions. If 200 lines can be 50, simplify.
3. **Surgical Changes**: Touch only lines that trace directly to the request. No drive-by refactors or unrelated reformatting. Clean up only unused imports/code created by your own edits.
4. **Goal-Driven Execution**: Turn tasks into verifiable criteria before coding (bugfix → failing regression test first; feature → explicit verification check per step).

## 2. Pragmatic Clean Code
- **Clean Layer Boundaries**: Separate **Transport/UI** (HTTP handlers, CLI, components) → **Usecase / Business Logic** → **Data / Infra** (SQL, external APIs). Never put raw SQL in HTTP handlers or domain rules inside UI components.
- **Rule of Three**: Prefer small, clear duplication over premature wrong abstractions; extract shared helpers only after a pattern repeats ≥3 times with identical intent.
- **Explicit Error Handling**: Never silently swallow errors; wrap errors with context and clearly distinguish client/domain errors (4xx) from infrastructure failures (5xx).
- **Readability First**: Use intention-revealing names, shallow nesting via early returns, and small single-purpose functions.
