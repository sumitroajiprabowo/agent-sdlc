---
description: "Run a focused senior-engineer code review on current git diff before shipping"
---

Review ONLY the current branch changes (do not scan unrelated files):

1. Run `git status -sb && git diff --stat` and inspect `git diff` (if changes are already committed, detect the default branch via `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/@@' || echo origin/main` and inspect `git diff <base>...HEAD`).
2. Check strictly for high-signal issues:
   - **Correctness & Clean Code**: null/empty handling, off-by-one, error swallowing, concurrency/race conditions, missing idempotency/timeouts on critical mutations, surgical diffs & clean layer boundaries (`references/clean-code.md` in the `sdlc-workflow` skill)
   - **Security**: injection, auth/tenant bypass, exposed secrets, unsafe input handling (`references/security-checklist.md` in the `sdlc-workflow` skill)
   - **Quality Gates**: confirm Formatter, Lint & Typecheck, Vulnerability Audit, and Secret Scan pass (`references/quality-gates.md` in the `sdlc-workflow` skill)
   - **Regressions & Contracts**: breaking API/DB changes, backward-incompatible or table-locking migrations, N+1 queries (`references/database-hygiene.md` in the `sdlc-workflow` skill)
   - **Frontend (if UI touched)**: missing Loading, Empty, Error, or Responsive/A11y states
   - **Tests**: missing unit/regression coverage for changed behavior
3. Report findings grouped by severity (**P0 Blocker**, **P1 Should Fix**, **P2 Minor**) with `file:line` references and concrete fixes, ending with `VERDICT: APPROVE` or `VERDICT: REQUEST CHANGES`.
4. If a task slug exists (`.claude/tasks/<slug>/`), also write the report to `review.md` there.
5. On `REQUEST CHANGES`, set `Stage: IMPLEMENT` in `.claude/HANDOFF.md` (if present), list the P0/P1 items as next steps, and re-run review after the fix.
6. Do NOT edit files during review unless the user asks you to fix findings.
