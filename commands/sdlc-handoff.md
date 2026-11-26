---
description: "Save concise session state to .claude/HANDOFF.md so you can safely /clear"
---

Write (overwrite) `.claude/HANDOFF.md` in the current project root with a concise handoff note (strictly under 60 lines):

- **State** (first line): `Task: <slug> | Stage: SPEC|PLAN|IMPLEMENT|REVIEW|QA|SHIP | Size: S|M|L`, then `Artifacts:` listing files in `.claude/tasks/<slug>/`
- **Goal**: What we are building/fixing
- **Done**: Completed steps with exact file paths
- **Modified Files**: Output of `git status -sb` (short list only)
- **Key Decisions**: Non-obvious choices and why
- **Open Issues / Last Error**: Any failing test or blocker (1–3 lines)
- **Exact Next Step**: What the next session should do first

Do not include full code dumps or long logs. After writing `.claude/HANDOFF.md`, tell the user it is ready and remind them to run `/clear` then `/sdlc-pickup`.
