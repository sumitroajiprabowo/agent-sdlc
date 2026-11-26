---
description: "Start a task or issue cleanly: inspect targeted context, propose a branch, and draft a concise plan"
---

Start the task cleanly (`$ARGUMENTS`) without scanning the whole repository:

1. Run `git status -sb && git branch --show-current` in one shell call.
   - If `$ARGUMENTS` is an issue number/URL (e.g. `#123` or `123`), inspect it via `gh issue view <num>` (or `glab issue view <num>` if GitLab).
   - If `$ARGUMENTS` mentions a milestone, list open issues (`gh issue list --milestone "<name>" --state open`).
2. Read ONLY targeted context: check `docs/INDEX.md` or relevant `docs/adr/` if present.
3. **Scope check**: If the task clearly spans multiple PRs/days, propose splitting into smaller issues (`1 Issue = 1 PR = 1 Session`) before coding.
4. **Branch**: Propose a branch name (e.g. `feat/<slug>` or `fix/<slug>`) synced from the latest base branch (ask before switching if the working tree is dirty).
5. Output a concise plan (<35 lines):
   - **Goal**
   - **Files to Touch**
   - **Steps**
   - **Verification Command**
   - **Risks / Questions**

For complex tasks, switch to Plan Mode / your stronger reasoning model before approving execution on a faster model. Wait for user approval before editing code.
