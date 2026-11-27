# Multi-CLI Team Dispatch Reference

Dispatch each SDLC role as a separate, fresh-context headless CLI process so every role runs on the CLI and model best suited to its work.

## Role Catalog

| Role | Responsibility | Write access | Default tier |
|---|---|---|---|
| `tech-lead` | Orchestrator; plan, split, ADR, integrate, final diff review | Lead branch / integration | Strongest |
| `backend` | API, domain logic, DB, unit/integration tests | Owned paths | Fast / cost |
| `frontend` | UI, 5 UI states, accessibility | Owned paths | Fast / cost |
| `qa` | SDET, test pyramid, new tests | Test files only | Fast |
| `security` | AppSec, OWASP + `ai-security-checklist.md` from `sdlc-workflow`, secrets, deps | Read-only | Strong |
| `devops` | CI/CD, IaC, observability, `release-plan` (flag, migration, observability, rollback) | Infra paths | Fast |
| `reviewer` | Independent diff review | Read-only | Strong |

Custom roles (e.g. `mobile`, `data`) can be added with the same schema, and any role can be disabled (`"enabled": false`).

## Team Config Schema

Loaded from global `~/.sdlc-kit/team.json`, with project `.sdlc/team.json` overriding per role:

```json
{
  "version": 1,
  "roles": {
    "tech-lead": { "cli": "claude", "model": "claude-opus-5-5", "enabled": true, "paths": [] },
    "backend": { "cli": "agy", "model": "gemini-4-neon-medium", "enabled": true, "paths": ["src/api/", "src/domain/"] },
    "frontend": { "cli": "codex", "model": "gpt-astra", "enabled": true, "paths": ["src/web/"] },
    "qa": { "cli": "opencode", "model": "opencode/deepseek-v4.1-flash-free", "enabled": true, "paths": ["tests/"] },
    "security": { "cli": "claude", "model": "claude-opus-5-5", "enabled": true, "paths": [] },
    "reviewer": { "cli": "claude", "model": "claude-opus-5-5", "enabled": true, "paths": [] }
  }
}
```

## Headless Invocations

Pass the brief as the prompt argument `"$(cat .claude/tasks/<slug>/<role>-brief.md)"` (represented below as `"<brief>"`) rather than stdin, run with the role's worktree as `cwd`, and cap output with `| tail -n 50`. For `codex`, the trailing `-` form is only needed if stdin is used; prefer passing `"<brief>"` directly. For `agy`, `-p` must be last with the prompt attached as its value:

| CLI | Write roles (`backend`, `frontend`, `qa`, `devops`) | Read-only roles (`reviewer`, `security`) |
|---|---|---|
| `claude` | `claude -p --model M --permission-mode acceptEdits "<brief>"` | `claude -p --model M --permission-mode plan "<brief>"` |
| `codex` | `codex exec -m M -s workspace-write "<brief>"` | `codex exec -m M -s read-only "<brief>"` |
| `agy` | `agy --model M --mode accept-edits -p "<brief>"` | `agy --model M --mode plan -p "<brief>"` |
| `opencode` | `opencode run -m provider/model "<brief>"` | `opencode run -m provider/model --agent plan "<brief>"` |

Example write dispatch (`.claude/tasks/` is gitignored and lives only in the main checkout, so use an absolute path):

```bash
TASKS="$PWD/.claude/tasks/<slug>"
(cd ../<repo>-backend && agy --model gemini-4-neon-medium --mode accept-edits -p "$(cat "$TASKS/backend-brief.md")") \
  | tail -n 50 > "$TASKS/backend-report.md"
```

## Worker Sandbox Rules

- **Inline context**: inline the relevant `contracts/` files and the scoped board lines into `<role>-brief.md`. Some headless CLIs deny reads outside the worktree, so never rely on paths into the main checkout.
- **Edit-only workers**: write roles edit files only. The lead runs lint/typecheck/test in the worktree after the worker returns. Headless CLIs may deny shell commands, and some sandboxes block network `listen`.
- **Empty means FAIL**: treat an exit code 0 with no `Status:` line, or a "no output produced" / permission-denied message, as `FAIL` (it counts toward the circuit breaker).
- **Report extraction**: keep only the final report block, from the last `Status:` line to the end, in `<role>-report.md`.
- **Model probe**: before saving a role, probe its CLI+model with a one-line read-only call (e.g. reply `PONG`). On error, ask the user for another model. Account plans may not support every model.

## Worktree Isolation Recipe

1. Create a worktree per write role:
   `git worktree add ../<repo>-<role> -b <branch>-<role>`
2. Run the role's headless CLI with `../<repo>-<role>` as the working directory and save its `<30-line` report to `.claude/tasks/<slug>/<role>-report.md`.
3. Merge verified role branches into the integration branch, run `reviewer` → `security` → `qa`, then clean up:
   `git worktree remove ../<repo>-<role>`

## Safety & Cost Rules

- **No permission bypasses**: Never pass permission-bypass or auto-approve-all flags to any worker CLI.
- **Blocked escalation**: If a worker is blocked by permissions, it must return `Status: BLOCKED` so the lead can ask the user.
- **Fresh context only**: Never forward the lead's conversation history; send only `.claude/tasks/<slug>/<role>-brief.md`.
- **Bounded output**: Always pipe worker stdout through `| tail -n 50` to keep the lead's context small.
- **Cost tiering**: Reserve the strongest model for `tech-lead`, `reviewer`, and `security`; use fast, cost-effective models for write workers.
- **Checks before AI review**: Run deterministic lint/typecheck/test checks before dispatching `reviewer` or `security`.
