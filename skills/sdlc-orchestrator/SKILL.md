---
name: sdlc-orchestrator
description: "Token-safe multi-agent orchestrator protocol where a Planner decomposes tasks, scoped Workers execute in fresh contexts with compact under-30-line handoffs, and a Verifier checks diffs and tests. Use when coordinating subagents, swarms, or multi-model pipelines."
license: MIT
---

# SDLC Orchestrator Protocol (Token-Safe Multi-Agent)

Follow this contract whenever coordinating multiple agents (subagents, swarms, or Planner/Worker/Verifier pipelines) so context never explodes.

## 1. Roles & Model Tiering

- **Planner / Orchestrator** (strongest reasoning model): reads Issue/spec, writes `docs/plans/<id>.md` if needed (working artifacts in gitignored `.claude/tasks/<slug>/`), splits work into independent subtasks, reviews final diffs.
- **Worker** (fast, cost-effective model — e.g., Sonnet, Codex, Local LLM): implements **exactly 1 subtask** in a fresh context, runs targeted tests, returns a `<30-line` report.
- **Verifier / QA** (fast model): inspects `git diff`, runs lint/typecheck/tests, checks 5 UI states (if FE) and security hygiene, returns `PASS` or `FAIL` with exact failing lines.

## 2. Fresh-Context Briefing Rule (Critical)

NEVER forward the orchestrator's full conversation history to a worker. Every worker brief must contain ONLY:
1. **Subtask goal** (1–3 sentences)
2. **Owned files / directories** (explicit paths)
3. **Contract / Acceptance Criteria** (3–5 bullets)
4. **Exact verification command** (e.g., `go test ./internal/auth -run TestLogin`)

## 3. Concurrency & Git Isolation

- Parallel workers MUST own **disjoint files** or run in **isolated git worktrees / branches**.
- Never merge two workers' changes without running targeted verification on the combined state.

## 4. Standard Worker Report (<30 Lines)

Every worker must reply using this compact format:

```markdown
- **Status**: DONE | BLOCKED
- **Files Modified**: `path/a`, `path/b`
- **Verification**: `<command>` -> PASS/FAIL (<=10 lines output)
- **Notes / Risks**: 1–2 lines (or "None")
```

## 5. Escalation Circuit Breaker

- If a worker fails the same verification **twice**, STOP retrying.
- Return the exact error (<=15 lines) to the Planner/User rather than looping until the context window fills up.

## 6. Multi-CLI Team

- To run each SDLC role on its own CLI and model (e.g. `claude`, `codex`, `agy`, `opencode`) in isolated git worktrees, use `/sdlc-start-orchestration`.
- Load `references/team-dispatch.md` for the role catalog, `~/.sdlc-kit/team.json` / `.sdlc/team.json` schema, headless invocations, and safety rules.
- Load `references/team-protocol.md` and `references/workflows/` for the file-based message board, shared `contracts/`, workflow gates with send back, and `resume <slug>`.
