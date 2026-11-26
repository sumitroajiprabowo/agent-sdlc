---
description: "Create a concise team handoff note (under 40 lines) and optionally post to a PR or Issue"
---

Prepare a clean team handoff (<40 lines, no long logs or code dumps):

1. Run `git status -sb && git log --oneline -5` and check for an active PR/MR (`gh pr view --json number,url,title 2>/dev/null || glab mr view 2>/dev/null || true`).
2. Draft the handoff in this exact format:
   ```markdown
   ## Handoff — <branch or ticket>
   - **Goal**: ...
   - **Done**:
     - [x] ... (`path/to/file`)
   - **Key Decisions**: ...
   - **Blocker / Last Error**: ... (max 2 lines)
   - **Exact Next Step**:
     1. ...
     2. Verify with `<exact test command>`
   ```
3. Show the draft to the user and ask for confirmation before posting via `gh pr comment` / `gh issue comment` / `glab mr note` (or opening a Draft PR/MR if none exists yet). Keep commits and comments free of AI attribution trailers unless requested.
