---
description: "Pressure-test scope and draft a concise feature spec plus issue breakdown for big features"
---

Use this command for **big or cross-service features** (3+ issues or multi-day work). For small 1-PR tasks or bugfixes, skip `/spec` and run `/start` directly.

1. Challenge scope and assumptions for `$ARGUMENTS` by asking 3–5 sharp questions first (user problem, explicit non-goals, edge cases, backward-compatible DB/API contract, and 5 UI states if frontend is involved).
2. Wait for answers, then write a concise spec (under 80 lines) to `docs/plans/<kebab-slug>.md` covering: **Goal**, **Non-Goals**, **Data & API Contract**, **UI 5-States** (if applicable), **Risks**, and **Rollout / Feature Flag**. For critical services/mutations or service boundaries, cross-check `sdlc-workflow/references/architecture-checklist.md` and `monolith-and-microservices.md` (modular monolith vs extraction, idempotency, timeouts, failure modes).
3. If a major architectural trade-off was decided, remind the user to run `/adr`.
4. Propose a Milestone and ordered small issues (`1 Issue = 1 PR = 1 Session`: Data -> Backend -> Frontend behind Feature Flag -> E2E/Go-Live). Ask confirmation before creating issues via `gh` / `glab`.
5. Remind the user to run `/clear` before starting Issue 1 with `/start #<id>`.
