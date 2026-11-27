# Inter-Role Team Protocol

Roles communicate through files in a per-task workspace. The lead session acts as the router ("Main Bot"); workers never call each other directly.

## Task Workspace (`.claude/tasks/<slug>/`)

| Path | Purpose |
|---|---|
| `board.md` | Append-only message board. Line format: `[<step>] <from> → <to\|all>: <TYPE> <text>`. `TYPE` is one of `QUESTION`, `ANSWER`, `HANDOFF`, `CONTRACT`, `BLOCKED`, `DECISION`. |
| `contracts/` | Shared artifacts such as `api.md`, `events.md`, `schema.md`. Producers write them (e.g. design/backend publishes the API contract); consumers read them (e.g. frontend). |
| `<role>-brief.md` | Input brief for a role step. |
| `<role>-report.md` | Output report from a role step. |
| `run.json` | Persistent workflow run state. |

## `run.json` Format

```json
{
  "workflow": "feature",
  "steps": {
    "<id>": { "status": "pending|running|done|failed|waiting-gate", "attempts": 0 }
  },
  "sendbacks": [
    { "from": "review", "to": "backend", "reason": "..." }
  ]
}
```

## Worker Report

Workers return the standard `<30-line` report (`Status: DONE | FAIL | BLOCKED`, modified files, verification result) plus an optional `## Messages` section:

```markdown
## Messages
- to: <role|all> | <TYPE> | <text>
```

After each worker finishes, the lead appends every message line to `board.md` using `[<step>] <from> → <to|all>: <TYPE> <text>`.

## Routing Rules

- **QUESTION**: The lead answers from context if possible. Otherwise it dispatches the target role read-only with only the question plus the relevant contracts, then posts the `ANSWER` to `board.md`.
- **CONTRACT / HANDOFF**: Unblocks dependent steps once the referenced artifact or work is in place.
- **BLOCKED**: Pause the run and ask the user how to proceed.
- **DECISION**: Record it on `board.md` (suggest `/sdlc-adr` if the decision is architectural).
- **Scoped briefs**: Every `<role>-brief.md` includes only the `board.md` lines addressed to that role or to `all`, plus the `contracts/` paths to read. Never forward the lead's conversation history.

## Workflows

Built-in workflows live in `references/workflows/<name>.json`. A project can override or add workflows in `.sdlc/workflows/<name>.json` (project files take precedence).

Each step in `steps` has:

- `id`: unique step identifier
- `type`: `agent`, `script`, or `gate`
- `role` (for `agent`) or `run` (for `script`)
- `needs`: array of step IDs that must be `done` before this step starts
- `artifacts` (optional): array of workspace paths produced by the step
- `on_fail` (optional): step ID to send back to on failure

A step starts when all of its `needs` are `done`. Steps with no dependency between them run in parallel. Note that `test.run` (such as `"npm test"`) in built-in workflows is a placeholder for the project's own test command.

## Gates

When a `gate` step is reached, set its status to `waiting-gate`, present the produced artifacts plus a concise summary of `board.md`, and offer three options:

1. **Approve**: mark the gate `done` and continue.
2. **Add context and rerun**: append the user's context to `board.md` and rerun a specified step.
3. **Send back**: send back to an earlier step, resetting that step and all of its dependents to `pending`, and append `{ "from": "<gate>", "to": "<step>", "reason": "..." }` to `sendbacks` in `run.json`.

## Failure & Circuit Breaker

- On `FAIL`, follow the step's `on_fail` target (resetting the target and its dependents to `pending`, and recording the entry in `sendbacks`).
- **Circuit breaker**: if the same step fails twice (`attempts >= 2`), stop the workflow and ask the user.

## Resume

Running `resume <slug>` reads `.claude/tasks/<slug>/run.json` and continues from the first step whose status is not `done`.
