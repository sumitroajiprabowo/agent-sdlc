---
description: "Resume work from .claude/HANDOFF.md in a fresh low-token session"
---

Resume work efficiently without scanning the whole repository:

1. Read `.claude/HANDOFF.md` in the current project root (if missing, say so and stop).
2. Run `git status -sb && git log --oneline -5` in one shell call.
3. Summarize the current state and next step in 3–5 bullet points, then immediately proceed with the Exact Next Step (or ask for confirmation if the next step is destructive or ambiguous).
