---
name: sdlc-workflow
description: "Universal, token-efficient SDLC playbook from repo setup to production, covering milestones, feature slicing, frontend 5-state design, QA pyramid, bugfix vs production hotfix, CI/CD, and zero-downtime migrations. Use when planning a feature or milestone, handling a bug or hotfix, setting up a repo, or shipping a PR."
license: MIT
---

# SDLC Workflow (0 to Production — Universal & Token-Safe)

## Command Loop

```text
/sdlc-spec (big features, approve) → /sdlc-start #id (size S/M/L)
  → (complex task: use strong Planner model → approve)
  → Fast Executor model + targeted tests
  → ctx ≥70%: /sdlc-handoff → /clear → /sdlc-pickup   (personal)
  → team handoff: push WIP → /sdlc-handoff-pr     (Draft PR / Issue comment)
  → key arch decision: /sdlc-adr <title>
  → /sdlc-qa → /sdlc-review (fail/changes → back to IMPLEMENT) → /sdlc-ship → CI → merge → /clear
```

## Phase 0 — Repo Foundation

- Keep `CLAUDE.md` / `AGENTS.md` thin (<4 KB): stack, build/test/lint commands, link to `docs/INDEX.md`.
- Maintain `docs/`: `INDEX.md` (1-line per doc), `adr/`, `plans/`, `runbooks/`.
- Path-scope `.claude/rules/*.md` with `paths:` YAML frontmatter so unrelated rules never load.
- `.gitignore`: exclude `.env`, `CLAUDE.local.md`, `.claude/HANDOFF.md`, `.claude/settings.local.json`, `.claude/tasks/`.
- Protect `main`: require PR + green CI + PR template.

## Phase 1 — Planning & Milestone Rule

- **No Milestone**: small feature (1–2 PRs, ≤1 day), routine bug, or hotfix → 1 Issue → `/sdlc-start #id` → `/sdlc-ship`.
- **Use a Milestone**: big feature (≥3 Issues, cross-service DB+BE+FE, or >2–3 days) or team sprint.
- **Big feature slicing** (1 dedicated planning session):
  1. Write short spec in `docs/plans/<feature>.md`, get approval, then `/sdlc-adr` for key decisions.
  2. Split into ordered small issues (`1 Issue = 1 PR = 1–2 Sessions`):
     - Issue 1 (Data): backward-compatible DB migration + model/repo + unit tests.
     - Issue 2 (Backend): API endpoints + logic + integration tests + API spec.
     - Issue 3 (Frontend): UI behind a **Feature Flag** + 5 UI states + component tests.
     - Issue 4 (QA & Go-Live): E2E critical flows + enable Feature Flag.
  3. Clear context (`/clear`) before starting Issue 1.

## Phase 2 — Frontend Design & Contract-First

- Keep design tokens in code (CSS vars / Tailwind / UI kit) + path-scoped design rules.
- Every FE issue must cover **5 UI States**: Default, Loading, Empty, Error, Responsive/A11y.
- Lock API / TypeScript schema first so BE & FE work in parallel.
- **Token rule**: after any visual/screenshot inspection, `/sdlc-handoff` → `/clear` so images do not linger in context.

## Phase 3 — Daily Execution & Token Discipline

- Launch the agent inside the target service directory (not monorepo root unless cross-service).
- For files >200 lines, locate symbols with Grep first or read targeted line ranges (`offset`/`limit`).
- Run targeted tests only (`go test ./pkg -run TestX`, `vitest run file`, `pytest -k test_x`) and bound Bash logs (`| tail -n 50`).
- **Personal handoff**: `/sdlc-handoff` → `/clear` → `/sdlc-pickup` (`.claude/HANDOFF.md`, <60 lines; `Task/Stage/Size` header resumes the right stage).
- **Team handoff**: push WIP branch → `/sdlc-handoff-pr` (<40-line summary to PR/Issue).

## Phase 4 — QA Pyramid (Token-Safe)

1. Static & Typecheck (linters, typecheck, format) — every PR.
2. **~70% Unit & Component tests** — every PR.
3. **~20% API / Contract tests** — every PR.
4. **~10% E2E Critical Flows** via CLI test runner (e.g. `npx playwright test --reporter=line`, NOT interactive browser screenshot dumps) — critical PRs & Staging.
5. **Staging / Preview UAT**: file QA bugs as structured Issues (repro steps, expected vs actual, 5–10 line error).

---

## Phase 5 — Bugs, Hotfixes & Refactors

- **Normal Bug**: `fix/<id>-<slug>` from `main` → reproduce → write failing regression test → fix → `/sdlc-ship`.
- **Prod Hotfix**:
  1. Rollback first if faster to restore service.
  2. Branch `hotfix/<slug>` from the **production release tag** (never from a feature branch).
  3. Minimal diff only (**NO refactors**) + regression test.
  4. Fast-track `/sdlc-ship` → deploy → **back-merge / cherry-pick** into `main` → write 10–15 line post-mortem.
- **Refactor**: separate PR from features; ensure existing tests are green first.

## Phase 6 — CI/CD, Release, Migrations & Prod Guardrails

- **CI PR Gate**: secret scan, lint/typecheck, unit/integration tests, artifact/container build + vulnerability scan. Debug failed CI with `gh run view <id> --log-failed | tail -n 80`.
- **Release**: Build once immutable image/artifact (`sha-<commit>` or `@sha256:...`, **NEVER `:latest`**); Conventional Commits + SemVer.
- **CD**: Auto-deploy Staging → smoke/E2E → Approval Gate → promote exact same artifact/digest to Prod (Rolling Update with readiness probe / Canary) → watch Golden Signals (5xx, latency, traffic, resources) 10–15m.
- **Zero-Downtime DB Migrations (Expand & Contract)**:
  - Release 1: add nullable/default column, write both.
  - Release 2: backfill + switch reads.
  - Release 3: drop old column after old instances are gone.
- **Instant Rollback**: revert GitOps image tag or `rollout undo` — never rebuild during an outage.
- **Hard Safety Rule**: AI agents NEVER run destructive infra or DB commands (`kubectl apply`, `helm upgrade`, `ALTER/DROP`) directly against Production — all prod changes go through Git PR → CI → CD.
- **Production Pillars**: structured logs + alerts, feature flags, encrypted secrets (Vault/SOPS/ESO), automated DB backups + restore drills, automated dependency updates, load tests for high-traffic paths.

## References (On-Demand)
- [architecture-checklist.md](references/architecture-checklist.md) — Idempotency, failure design, backward compatibility, data integrity
- [monolith-and-microservices.md](references/monolith-and-microservices.md) — Modular monolith boundaries, service extraction, outbox, tracing, sagas
- [clean-code.md](references/clean-code.md) — Karpathy coding discipline, layer boundaries, error handling, simplicity
- [quality-gates.md](references/quality-gates.md) — Auto-detect format, lint, vulncheck, secret scan, API & load/stress QA
- [security-checklist.md](references/security-checklist.md) — Multi-tenant isolation, session hygiene, OWASP, PII masking, audit logs
- [ai-security-checklist.md](references/ai-security-checklist.md) — LLM/agent threats: prompt injection, guardrails, tool policy, red teaming, model supply chain
- [database-hygiene.md](references/database-hygiene.md) — Query plans, lock-safe migrations, pooling, short transactions, backups
- [incident-response.md](references/incident-response.md) — SEV1–SEV4 tiers, 5-minute mitigation rule, comms, post-mortems
- [developer-habits.md](references/developer-habits.md) — Observability, blameless post-mortems, code deletion, tech debt budget, DoD
