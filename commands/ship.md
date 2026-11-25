---
description: "Pre-PR checklist: targeted tests, diff/secret check, docs-as-code check, and open PR"
---

Run the pre-PR shipping checklist:

1. Run `git status -sb && git diff --stat` to verify no stray debug files, secrets, `.env`, or `.claude/HANDOFF.md` are staged or tracked.
2. Run auto-detected **Quality Gates** (`sdlc-workflow/references/quality-gates.md`: Formatter, Lint & Typecheck, Vulnerability Audit, Secret Scan) and targeted tests ONLY for affected packages with bounded output (e.g. `| tail -n 50`). Report `SKIPPED (not installed)` honestly if a tool is missing; stop and report if any check fails.
3. **Docs-as-Code check (3 conditions)**:
   - API contract / DB schema / env var changed → verify the relevant doc is updated.
   - New architectural decision → remind the user to run `/adr`.
   - Routine internal bugfix or refactor → skip docs.
4. **Commit/PR hygiene**: clean commit messages without AI attribution trailers (unless project policy requires otherwise); offer sync/rebase/squash if needed.
5. Draft a concise PR/MR title & body (**What changed**, **How verified**, **Related issue**), and ask for user confirmation before pushing and opening it (`gh pr create` or `glab mr create`).
6. After shipping, remind the user to remove `.claude/HANDOFF.md` (if finished) and clear context (`/clear`) before starting the next task.
