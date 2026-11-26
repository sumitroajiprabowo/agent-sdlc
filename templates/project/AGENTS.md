# Project Agent Instructions

Keep this file concise (<4 KB). Store deep docs in `docs/` (see `docs/INDEX.md`) and read on-demand.

## Stack & Commands
- **Build**: `<fill in>`
- **Test (targeted)**: `<fill in>`
- **Lint / Typecheck**: `<fill in>`

## Workflow & Token Discipline
- Follow `sdlc-workflow` (`1 Issue = 1 PR = 1 Session`).
- For files >200 lines, search symbols first and read targeted line ranges.
- Bound noisy command output (`| tail -n 50`) and run targeted tests.
- Save short session handoffs to `.claude/HANDOFF.md` (<60 lines) before clearing context.
- Keep per-task artifacts (plan/review/qa) in `.claude/tasks/<slug>/` (gitignored); the first line of HANDOFF.md records `Task | Stage | Size`.
- Never run destructive commands directly against production; all prod changes go via PR -> CI -> CD.
