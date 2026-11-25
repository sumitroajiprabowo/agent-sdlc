---
description: "Run a token-safe CLI-first QA pyramid verification on changed modules before shipping"
---

Verify quality on current branch changes without dumping noisy logs or screenshots into context:

1. Run `git status -sb && git diff --stat` to identify touched layers (backend, frontend, API, DB).
2. Execute the QA pyramid in order with bounded output (`| tail -n 50`):
   - **Quality Gates (Auto-Detected via `references/quality-gates.md` in the `sdlc-workflow` skill)**: Formatter, Lint & Typecheck, Vulnerability Audit, Secret Scan (report `SKIPPED (not installed)` honestly if a tool is missing)
   - **Unit / Component**: targeted test suites covering modified files
   - **API / Contract** (if API/models changed): validation (`400`/`422`), AuthN/AuthZ & tenant isolation (`401`/`403`), idempotency, pagination bounds, and OpenAPI/schema contract match
   - **E2E (critical paths only)**: run via CLI test runner (e.g. `npx playwright test <spec> --reporter=line`) — do NOT take interactive browser screenshots unless explicitly requested
   - **Load / Stress (Staging only)**: for high-traffic or DB-heavy changes, recommend or run `k6` Smoke/Load thresholds in Staging (never against Production)
3. If frontend UI changed, verify code covers all **5 UI States**: Default, Loading, Empty, Error, Responsive/A11y.
4. Output a compact QA matrix (`PASS` / `FAIL` / `SKIPPED` per layer). If a bug is found, report exact failing lines and offer to add a failing regression test before fixing.
