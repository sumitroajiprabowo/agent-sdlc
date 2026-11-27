# Team Debate, Design Review & Message Enum

Supplements `team-protocol.md` with pre-implementation design review, bounded debate threads, non-blocking dissent, and strict message enforcement.

## Design Review

- `role: "panel"` in a workflow step fans out to the roles listed in `panel` (skipping disabled or missing roles) and finishes when all reply (`tech-lead` arbitration included).
- Step `design-review` runs after `design`: the lead dispatches each active panelist **read-only, in parallel**, with only `plan.md` and `contracts/api.md`.
- Each panelist replies `Status: PASS | FAIL` plus `OBJECTION` messages to `tech-lead` (one concrete issue each: path/section, why, proposed change). Zero objections is valid, but each panelist must state what it checked.
- Every panelist must check backward compatibility of existing consumer surfaces it owns (HTTP responses and client-library method signatures/return shapes) and state that check in its reply.
- `tech-lead` answers every objection with `DECISION` (accept → revise the contract and bump its version; reject → reason).
- Panelists who were rejected may reply once more (rebuttal). **Max 2 rounds**; anything still open becomes `DISSENT` and goes to `gate-design`.

## Threads

- Every `QUESTION` or `OBJECTION` opens a thread id `#<n>` written in the text (e.g. `OBJECTION #3 ...`); replies reuse the id.
- Flow: ask → answer → at most one rebuttal → answer/`DECISION`. Max 2 rounds per thread, then the lead escalates to the next gate.
- The lead relays replies to the asker in its next brief (scoped briefs include the thread's lines).
- The lead may not close a thread it is a party to without evidence (`path:line`, test, or contract section).

## Dissent

- A role that disagrees with a final `DECISION` posts `DISSENT #<n> <reason>`. Dissent never blocks the run, but every gate lists all open `DISSENT` lines and the user rules on them (approve as-is, or send back).

## Peer Messages

- Workers address the owning role directly (e.g. `frontend` → `backend`), not the lead; questions about another role's owned paths or contract area must be answered by that role (the lead answers only process questions).
- The lead relays peer lines **verbatim** (quote the original board line; never paraphrase) and dispatches the recipient in the next wave (or immediately via Live Threads).
- Workers may read `board.md` directly (read-only) for full thread context; only the lead appends to it.

## Lead Limits

- The lead never approves a gate on the user's behalf (non-interactive or unattended runs stop at `waiting-gate`) and records every decision it makes alone as `DECISION` with reason so it is listed at the next gate.
- After any send-back that changes code, every downstream verification step (`checks`, `review`, `security`, `qa`) reruns by dispatching its role (scoped to the changed files is fine); the lead may not skip one, and may not substitute its own judgment or a passing test suite for a role's verdict.

## Live Threads

- **Session per role per run**: on a role's first dispatch the lead records its session in `run.json` `sessions` (id captured from the first run's output for every CLI); later dispatches of that role resume it instead of starting fresh.
- **Immediate relay**: when a report has a `QUESTION`/`OBJECTION` to a peer, the lead resumes the recipient's session at once with the original line verbatim, then resumes the asker's session with the reply; repeat until the thread closes (max 2 rounds, as in Threads); every turn goes to `board.md` verbatim.
- **Mode preserved**: a resumed role keeps its mode—read-only stays read-only; a write role resumed for a question is told "answer only, do not edit".
- **Fallback**: if resume fails (unknown/expired session) or setup's probe shows the CLI cannot resume, dispatch a fresh session with the thread lines inlined and note it on the board.

## Message Enum

The lead pastes this exact block verbatim into **every** worker brief:

```text
Allowed TYPE: QUESTION | ANSWER | HANDOFF | CONTRACT | BLOCKED | DECISION | OBJECTION | DISSENT
Allowed to: exactly one role from the roster, or all
Line format: - to: <role|all> | <TYPE> | <text>
```

- **Enforcement**: a message with an unknown `TYPE` or recipient is a **strike**. The lead normalizes it (per `team-protocol.md` Normalize messages) and records `strike` on the board line.
- `CONTRACT` from any role other than `tech-lead` must be addressed to `tech-lead` (otherwise it is a **strike** and is re-routed); a report whose status line is not exactly `Status: <VALUE>` at line start is a **strike**.
- Two strikes in one report make that report invalid → rerun the step once with the enum restated (counts toward the circuit breaker).
- Review/QA findings use `OBJECTION` (not `BLOCKER`).
