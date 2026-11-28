# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2026-11-28

### Added
- `--check-run <dir>` validator (`lib/check-run.ts`): validates `run.json` schema, step `needs` dependencies, user-only gate approval (`approvedBy: "user"`), `sessions`, `sendbacks`, and `board.md` line format, message `TYPE` enum, roster membership, and strikes.

### Changed
- Gates in `team-protocol.md` now run `npx sdlc-kit --check-run .claude/tasks/<slug>` and fix every error before presenting a gate.
- Live-thread `board.md` lines in `team-debate.md` now use `[live-thread] <from> → <to>: <TYPE> <text>` with the message `TYPE` enum.
- `run.json` example in `team-protocol.md` documents `"approvedBy": "user (gates only)"`.

## [0.8.1] - 2026-11-28

### Fixed
- Setup **Model probe** in `team-dispatch.md` now checks each CLI's resume flag in `--help` and records `resume: false` in the roster when missing (closing the gap where `team-debate.md` Fallback referenced an undocumented probe).
- `resume <slug>` in `team-protocol.md` now reuses recorded role sessions in `sessions` (with fallback to `team-debate.md` Live Threads Fallback on failure).

## [0.8.0] - 2026-11-28

### Added
- Live Threads in `team-debate.md`: one persistent session per role per run (`run.json` `sessions`), immediate verbatim peer `QUESTION`/`OBJECTION` relay (max 2 rounds), mode preservation (`answer only, do not edit` for write roles), and fresh-session fallback.
- Per-CLI resume templates in `team-dispatch.md` for `agy` (`--conversation`), `codex` (`codex exec resume`), and `opencode` (`--session`).
- `sessions` map in the `run.json` schema in `team-protocol.md`.

### Notes
- Resume ids are captured from each CLI's first-run output (`opencode` rejects custom ids; `codex` resume takes the sandbox via `-c sandbox_mode`).

## [0.7.1] - 2026-11-27

### Fixed
- Added `Peer Messages` in `team-debate.md` and narrowed `QUESTION` routing in `team-protocol.md` so workers address owning roles directly, the lead relays peer lines verbatim (never paraphrasing) and answers only process questions, and workers may read `board.md` directly (read-only).
- Added `Lead Limits` in `team-debate.md` and clarified `Gates` in `team-protocol.md` so only the user approves a gate (non-interactive or unattended runs stop at `waiting-gate`) and every solo lead decision is recorded as `DECISION` with reason.
- Required every downstream verification step (`checks`, `review`, `security`, `qa`) to rerun by dispatching its role after any code-changing send-back; the lead may not skip a step or substitute its own judgment or a passing test suite for a role's verdict.
- Enforced in `team-debate.md` that `CONTRACT` messages from any role other than `tech-lead` must be addressed to `tech-lead` or incur a strike and re-routing.
- Enforced in `team-debate.md` that any worker report whose status line is not exactly `Status: <VALUE>` at line start incurs a strike rather than being silently normalized.

## [0.7.0] - 2026-11-27

### Added
- `design-review` panel step in `team-debate.md` and `feature.json` where `backend`, `frontend`, `mobile`, and `qa` critique `plan.md` and `contracts/api.md` in parallel before `gate-design`.
- Bounded debate threads (`#<n>`, max 2 rounds) with `tech-lead` arbitration and evidence-backed closure.
- Non-blocking `DISSENT` messages surfaced at every gate for user ruling.
- Strict `Message Enum` block pasted into every worker brief with strike tracking and invalid-report reruns.
- Design-review panelists must check backward compatibility of existing consumer surfaces they own (HTTP responses and client-library method signatures/return shapes) and state that check in their reply.

### Changed
- `feature` workflow `gate-design` now depends on `design-review`.
- `board.md` `TYPE` enum in `team-protocol.md` gains `OBJECTION` and `DISSENT`.

## [0.6.0] - 2026-11-27

### Added
- Built-in `mobile` role in `team-dispatch.md`, `/sdlc-start-orchestration` setup, and the `feature` workflow (`integrate` now depends on `backend`, `frontend`, and `mobile`).
- Owner-resolved `fix` role (`"role": "owner"`, `fix-report.md`) in the `bugfix` workflow so fixes route automatically to the role owning the failing paths.

### Changed
- Added multi-owner send-back in `team-protocol.md` to reset all owning roles in parallel, reset downstream steps, append one `sendbacks` entry per owner, and post findings as `HANDOFF` messages.
- Clarified contract drift ownership in `team-protocol.md` (deviating consumers own their `FAIL`; wrong contracts route to `tech-lead` via `CONTRACT` and reset affected roles).
- Added `skipped` step status for disabled or missing roles (satisfies `needs` like `done`).
- Updated model examples in `team-dispatch.md` and `README.md` (`gpt-astra` → `gpt-6.2-sol`).
- Clarified **Edit-only workers** in `team-dispatch.md` to allow read-only inspection commands (`cat`, `sed -n`, `rg`, `ls`, `git diff`) while reserving build, test, install, and network commands for the lead.
- Added **Downstream owner** handling in `team-protocol.md` so failures owned by a role downstream of the failing step (e.g. `qa` owning a test failing in `checks`) are dispatched out-of-band in a worktree, merged, and rerun without resetting steps that have not run yet.
- Clarified **Edit-only workers** in `team-dispatch.md` for headless CLIs that deny shell commands (e.g. `agy` `accept-edits`): briefs must instruct "file read/edit tools only, no shell", while read-only inspection commands apply to CLIs that read through their shell (e.g. `codex`).
- Extended **Model probe** in `team-dispatch.md` to handle mid-run quota or usage-limit errors by probing a fallback model, posting a `DECISION` on `board.md`, updating the roster, and rerunning the step (counting the failed attempt toward the circuit breaker).
- Added **Disputed finding** handling in `team-protocol.md`: re-reviews after a send-back inline the full changed files (not only the diff), and if the lead disputes a finding it posts an `ANSWER` with evidence (`path:line`, covering test) for the author to re-decide rather than silently overriding a `FAIL` (unresolved disputes go to the next gate).
- Extended **Edit-only workers** in `team-dispatch.md` to cover `agy` in all headless modes (`accept-edits` and `plan`), instructing read-only roles on CLIs that deny file/shell tools to "do not call any tool; answer from the inlined text".

## [0.5.2] - 2026-11-27

### Fixed
- Hardened multi-CLI worker sandboxing in `team-dispatch.md` based on findings from a real end-to-end multi-CLI run: inline `contracts/` and scoped board lines into briefs, restrict write workers to file edits while the lead runs checks, treat empty or permission-denied exit-0 outputs as `FAIL`, and extract only the final report block from the last `Status:` line.
- Added a one-line read-only model probe during `/sdlc-start-orchestration` setup before saving a role's CLI+model so unsupported models are caught early.
- Checked separation of duties on every loaded team config at the active roster confirmation step, not only during initial setup.
- Normalized inter-role messages in `team-protocol.md` (single known recipient or `all` with alias mapping/splitting, and enum `TYPE` enforcement) and resolved overlapping owner `paths` by longest matching prefix (asking the user on a tie).
- Saved full script step output to `.claude/tasks/<slug>/<step>.log` for owner routing and required rerunning non-reproducing failures once, recording passes as flaky on `board.md` for the next gate.

## [0.5.1] - 2026-11-27

### Changed
- Added owner-based send back (`on_fail: "owner"`) so failed checks, reviews, security scans, and QA route back to the role owning the failing file paths.
- Hardened the `feature` and `bugfix` workflows with an `integrate` step, deterministic `checks` before AI review, and parallel `review` + `security` steps.
- Added a `devops` `release-plan` step covering feature flags, expand/contract migrations, observability, and rollback plans.
- Enforced separation of duties (two-person review across CLI+model), untrusted worker message handling, contract verification against `contracts/api.md`, and `/sdlc-spec` / `/sdlc-adr` routing.

## [0.5.0] - 2026-11-27

### Added
- `/sdlc-start-orchestration` command to run a multi-CLI, multi-model SDLC team (`claude`, `codex`, `agy`, `opencode`) across isolated git worktrees with per-role configs in `~/.sdlc-kit/team.json` and `.sdlc/team.json`.
- `references/team-dispatch.md` in the `sdlc-orchestrator` skill documenting the role catalog, config schema, write vs read-only headless invocations, worktree isolation recipe, and safety/cost rules.
- `references/team-protocol.md` defining the file-based inter-role communication protocol (`board.md`, `contracts/`, `run.json`, message routing, and circuit breaker).
- LOOP-like built-in workflows (`references/workflows/feature.json`, `bugfix.json`, plus `.sdlc/workflows/` project overrides) with agent/script/gate steps, send back, and `resume <slug>` support.
- `## Multi-model team` section in `README.md` with an example roster and setup/usage commands.

## [0.4.2] - 2026-11-27

### Fixed
- `/sdlc-start`, `/sdlc-spec`, and `/sdlc-adr` run without an argument now ask for the task, feature, or decision and stop, instead of working on an empty placeholder.
- `/sdlc-start` stops and asks for the project path when it is not run inside a git repository, instead of scanning the home directory.
- `/sdlc-start` now points to the `sdlc-workflow` skill references for architecture, security, and DB tasks.

## [0.4.1] - 2026-11-27

### Fixed
- `--antigravity` installed no commands. It now installs the 9 commands as explicit-only skills (`disable-model-invocation: true`) in `~/.gemini/config/skills/`, run as `/sdlc-start`, `/sdlc-spec`, ...
- `--opencode` now installs commands into `~/.config/opencode/commands/` (the documented directory) instead of the legacy `command/`, and moves unedited files installed there by older releases.
- `--opencode` no longer copies the shared skills into `~/.config/opencode/skills/`; OpenCode also reads `~/.agents/skills/`, so the copy only duplicated the same skills. Old copies are removed.
- `--doctor` reports the installed Antigravity and OpenCode commands.

## [0.4.0] - 2026-11-27

### Added
- `ai-security-checklist.md` reference in the `sdlc-workflow` skill covering OWASP LLM & Agentic Top 10, prompt injection, guardrails, agent tool policy, red teaming, model supply chain, and LLM monitoring; `/sdlc-spec` and `/sdlc-review` point to it for LLM/agent features.
- SBOM (Syft / CycloneDX) and TruffleHog in the quality gates.

## [0.3.1] - 2026-11-27

### Fixed
- Codex removed custom prompts, so the 0.3.0 `~/.codex/prompts/` commands never loaded. `--codex` now installs the 9 commands as explicit-only skills in `~/.codex/skills/` (run them as `$sdlc-start`, `$sdlc-spec`, ...) and removes the old prompt files it installed.
- `--codex` no longer copies the shared skills into `~/.codex/skills/`; Codex also reads `~/.agents/skills/` and listed them twice.
- `--doctor` reports the installed Codex command skills.

## [0.3.0] - 2026-11-26

### Added
- Size routing (`S` / `M` / `L`) in `/sdlc-start`.
- Explicit approval gate in `/sdlc-spec` before proposing issues or writing code.
- Per-task gitignored artifacts in `.claude/tasks/<slug>/` and `Task | Stage | Size` resume state in `.claude/HANDOFF.md`.
- Session cost (`$0.42`) and input/output token counts in the `--optimize` statusline.
- `sdlc-reviewer` and `sdlc-tester` Claude Code subagents (`~/.claude/agents/`); size M/L tasks delegate review and QA to them.
- `--codex` now installs the 9 commands as Codex prompts in `~/.codex/prompts/`.
- `/sdlc-review` `REQUEST CHANGES` and `/sdlc-qa` `FAIL` set `Stage: IMPLEMENT` in `.claude/HANDOFF.md` so work resumes at the fix.
- `--doctor` reports installed subagents.
- Feature request issue template.

### Documentation
- README hero with an animated terminal demo (`assets/demo.svg`) and badges.
- README, skills, project and local templates, and CONTRIBUTING describe the size routing, approval gate, and task state flow.

### Fixed
- Statusline threshold hints now point to `/sdlc-handoff` instead of `/handoff`.

## [0.2.0] - 2026-11-26

### Changed
- **Breaking:** all 9 slash commands are now prefixed with `sdlc-` (`/sdlc-spec`, `/sdlc-start`, `/sdlc-handoff`, `/sdlc-pickup`, `/sdlc-handoff-pr`, `/sdlc-adr`, `/sdlc-qa`, `/sdlc-review`, `/sdlc-ship`) so they no longer clash with built-ins such as `/ship` and `/review`.
- Upgrading removes the old unprefixed command files that sdlc-kit installed and you did not edit; edited or user-owned files are kept (with a warning for edited ones), even with `--force`.

## [0.1.1] - 2026-11-25

First release published from CI via npm trusted publishing (OIDC, with provenance).

### Changed
- GitHub repository renamed from `agent-sdlc` to `sdlc-kit`; the old URL redirects. README now documents `npx sdlc-kit` as the primary install.
- Remaining `agent-sdlc` identifiers renamed to `sdlc-kit`: the Claude plugin and marketplace name (reinstall the plugin with `/plugin install sdlc-kit@sdlc-kit`), the `~/.sdlc-kit/` manifest and local prompt directory, `sdlc-kit-statusline.mjs`, and `settings.json.sdlc-kit.bak`. Installs made with 0.1.0 are migrated on the next run, and `--uninstall` and `--doctor` still recognize the old names.

### Added
- Manifest (`~/.sdlc-kit/manifest.json`) tracking installed files; `--force` flag.
- Slash commands now also install for `--cursor` (`~/.cursor/commands/`) and `--opencode` (`~/.config/opencode/command/`).
- `--doctor` detects outdated installs and plugin + npx duplicate installs.
- Release workflow (tag -> `npm publish --provenance`), macOS in CI matrix, `SECURITY.md`, issue template.

### Changed
- The npm package is published as `sdlc-kit` (the name `agent-sdlc` is taken); the installed command is `sdlc-kit`.
- Source migrated to TypeScript (`strict`), compiled to `dist/` by `tsc`; the `bin` entry is now `dist/bin/cli.js`. No runtime dependencies were added. CI runs `npm run typecheck`.
- The `--optimize` statusline is now a Node script (`~/.claude/sdlc-kit-statusline.mjs`) instead of bash, so it works on Windows without `jq`. `--uninstall` still removes the old `statusline-command.sh` and its settings entry.
- CI now also runs on Windows; `.gitattributes` forces LF line endings.
- Install never overwrites files it did not install (use `--force`); uninstall removes only unmodified managed files.
- `--optimize` keeps your existing `model`/`env`; `--uninstall` reverts only what it added.
- Minimum Node.js is now 20 (18 is EOL).
- Command references now name the `sdlc-workflow` skill explicitly instead of a bare relative path.

### Fixed
- `--doctor` frontmatter parsing on CRLF files.

## [0.1.0] - 2026-11-25

### Added
- `sdlc-workflow` skill with 8 on-demand references (`architecture-checklist.md`, `monolith-and-microservices.md`, `clean-code.md`, `quality-gates.md`, `security-checklist.md`, `database-hygiene.md`, `incident-response.md`, `developer-habits.md`).
- Token-safe `sdlc-orchestrator` multi-agent protocol skill.
- 9 slash commands (`/spec`, `/start`, `/handoff`, `/pickup`, `/handoff-pr`, `/adr`, `/qa`, `/review`, `/ship`).
- Zero-dependency CLI installer (`bin/cli.mjs`) supporting `--claude` (+ `--optimize`), `--codex`, `--antigravity`, `--cursor`, `--opencode`, `--local`, `--project`, `--doctor`, `--dry-run`, `--uninstall`.
- Claude Code plugin & marketplace manifests (`.claude-plugin/`).
