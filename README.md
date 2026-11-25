# agent-sdlc

Skills, slash commands, and a multi-agent handoff protocol for an end-to-end SDLC (plan, code, QA, ship, incident response). Installs into Claude Code, Codex, Antigravity, Cursor, OpenCode, or any local LLM. TypeScript, no runtime dependencies.

## Why

Long sessions, bloated global instructions, full test logs, and whole chat histories passed between subagents all burn tokens. This package keeps the always-loaded part small and moves the detail into files that load only when needed:

- **Small baseline**: each skill loads only its YAML frontmatter up front; the full playbook and its 8 `references/` load when the task calls for them. Slash commands load their one-line description until you invoke them.
- **9 slash commands**: `/spec`, `/start`, `/handoff`, `/pickup`, `/handoff-pr`, `/adr`, `/qa`, `/review`, `/ship`.
- **Covers repo setup to production**: milestone slicing, 5-state frontend checklist, QA pyramid, bugfix vs production hotfix, CI/CD, and Expand & Contract database migrations.
- **Orchestrator protocol**: fresh-context worker briefings and worker reports under 30 lines.

---

## Quick Start

```bash
# Auto-detect installed agents on your machine
npx github:sumitroajiprabowo/agent-sdlc

# Not published to npm yet. Once it is:
npx sdlc-kit
```

### Install for Specific Agents

```bash
# Claude Code only (skills + 9 slash commands)
npx github:sumitroajiprabowo/agent-sdlc --claude

# Claude Code + token-saving preset: adds opusplan (only if you have no model set),
# 200k context cap, tool search, auto-compact, and a statusline. Existing values are kept.
npx github:sumitroajiprabowo/agent-sdlc --claude --optimize

# Codex only
npx github:sumitroajiprabowo/agent-sdlc --codex

# Antigravity only
npx github:sumitroajiprabowo/agent-sdlc --antigravity

# Cursor or OpenCode (skills + 9 slash commands)
npx github:sumitroajiprabowo/agent-sdlc --cursor
npx github:sumitroajiprabowo/agent-sdlc --opencode

# Local LLMs (Ollama / OpenCode / Aider / Cline) -> <800-token prompt
npx github:sumitroajiprabowo/agent-sdlc --local

# Scaffold a project repository (docs/INDEX.md, ADR template, PR template, AGENTS.md + CLAUDE.md bridge, .gitignore)
npx github:sumitroajiprabowo/agent-sdlc --project

# Run a read-only health & token-efficiency audit
npx github:sumitroajiprabowo/agent-sdlc --doctor

# Install to all agents at once
npx github:sumitroajiprabowo/agent-sdlc --all
```

### Alternative Install Methods

```bash
# Via skills CLI
npx skills add sumitroajiprabowo/agent-sdlc

# Via Claude Code plugin marketplace
/plugin marketplace add sumitroajiprabowo/agent-sdlc
/plugin install agent-sdlc@agent-sdlc
```

---

## CLI Options

| Flag | Description |
|---|---|
| `--claude` | Install skills & 9 slash commands into `~/.claude/` |
| `--codex` | Install skills into `~/.codex/skills/` and `~/.agents/skills/` |
| `--antigravity` | Install skills into `~/.agents/skills/` |
| `--cursor` | Install skills into `~/.cursor/skills/` and commands into `~/.cursor/commands/` |
| `--opencode` | Install skills into `~/.config/opencode/skills/` and `~/.agents/skills/`, commands into `~/.config/opencode/command/` |
| `--local` | Install a compact prompt (`<800` tokens) to `~/.agent-sdlc/LOCAL_PROMPT.md` |
| `--project` | Scaffold non-destructive project templates (`docs/`, PR template, `AGENTS.md`, `CLAUDE.md -> @AGENTS.md`, `.gitignore`) |
| `--all` | Install across `claude`, `codex`, `antigravity`, `cursor`, `opencode`, and `local` |
| `--optimize` | With `--claude`: backs up `~/.claude/settings.json` (the original `.bak` is never overwritten), then adds only the keys you haven't set: `opusplan` model, 200k context cap, tool search, auto-compact at 70%, bounded outputs, and a context statusline. Run `--claude --uninstall` to revert just those keys |
| `--doctor` | Run a read-only health & token-efficiency audit |
| `--no-orchestrator` | Skip installing `sdlc-orchestrator` (single-agent workflow only) |
| `--dry-run` | Preview actions without writing any files |
| `--force` | Overwrite or remove files even if they were not installed (or were edited after install) |
| `--uninstall` | Remove only files `agent-sdlc` installed and you haven't edited; reverts the settings `--optimize` added |

---

## Daily Developer Workflow

```text
[0] Repo Setup   -> Thin AGENTS.md/CLAUDE.md (<4 KB) + docs/INDEX.md + path-scoped rules
[1] Plan         -> /spec (big features) -> /start #123 (1 Issue = 1 PR)
[2] Code         -> Planner designs -> Executor codes + targeted tests
[3] Handoff      -> ctx >=70%: /handoff -> /clear -> /pickup   (team: /handoff-pr)
[4] Ship & QA    -> /qa -> /review -> /ship -> CI gate -> SemVer release -> Prod
[5] Incident     -> Bug: fix/#id + regression test | Prod outage: hotfix/ from tag, minimal diff, back-merge
```

### Usage by Agent

- **Claude Code**: Use `/spec` (for big features), `/start #123`, `/handoff`, `/pickup`, `/handoff-pr`, `/adr`, `/qa`, `/review`, `/ship` directly. With `--optimize`, press `Shift+Tab` twice for Plan Mode (Opus) and approve to execute on Sonnet (`opusplan`).
- **Codex**: Invoke `$sdlc-workflow` or `$sdlc-orchestrator` in your prompt.
- **Antigravity**: Skills in `~/.agents/skills/` are discovered automatically; reference `sdlc-workflow` during `/plan` or `sdlc-orchestrator` for `/swarm` and subagents.
- **Cursor**: Skills in `~/.cursor/skills/` are discovered automatically and the 9 commands are available from `~/.cursor/commands/`.
- **OpenCode**: Skills in `~/.config/opencode/skills/` and `~/.agents/skills/` are discovered automatically; the 9 commands are in `~/.config/opencode/command/`.
- **Local LLMs**: Load `~/.agent-sdlc/LOCAL_PROMPT.md` as your system prompt or project instruction.

---

## Included Playbooks & Docs

- **[sdlc-workflow](skills/sdlc-workflow/SKILL.md)** — 0 → Production SDLC playbook with 8 on-demand references:
  - [architecture-checklist.md](skills/sdlc-workflow/references/architecture-checklist.md) — Idempotency, failure design, backward compatibility, data integrity
  - [monolith-and-microservices.md](skills/sdlc-workflow/references/monolith-and-microservices.md) — Modular monolith boundaries, service extraction, outbox, tracing, sagas
  - [clean-code.md](skills/sdlc-workflow/references/clean-code.md) — Coding discipline, layer boundaries, error handling, simplicity
  - [quality-gates.md](skills/sdlc-workflow/references/quality-gates.md) — Auto-detect format, lint, vulncheck, secret scan, API QA & load/stress testing
  - [security-checklist.md](skills/sdlc-workflow/references/security-checklist.md) — Multi-tenant isolation, session hygiene, OWASP, PII masking, audit logs
  - [database-hygiene.md](skills/sdlc-workflow/references/database-hygiene.md) — Query plans, lock-safe migrations, pooling, short transactions, backups
  - [incident-response.md](skills/sdlc-workflow/references/incident-response.md) — SEV1–SEV4 tiers, 5-minute mitigation rule, comms, post-mortems
  - [developer-habits.md](skills/sdlc-workflow/references/developer-habits.md) — Observability, blameless post-mortems, code deletion, tech debt budget, DoD
- **[sdlc-orchestrator](skills/sdlc-orchestrator/SKILL.md)** — Token-safe multi-agent briefing & handoff protocol
- **[CHANGELOG.md](CHANGELOG.md)** & **[CONTRIBUTING.md](CONTRIBUTING.md)**

---

## What gets installed

| Target | Skills | Slash commands |
|---|---|---|
| `--claude` | `~/.claude/skills/` | `~/.claude/commands/` |
| `--codex` | `~/.codex/skills/`, `~/.agents/skills/` | none |
| `--antigravity` | `~/.agents/skills/` | none |
| `--cursor` | `~/.cursor/skills/` | `~/.cursor/commands/` |
| `--opencode` | `~/.config/opencode/skills/`, `~/.agents/skills/` | `~/.config/opencode/command/` |
| `--local` | `~/.agent-sdlc/LOCAL_PROMPT.md` | none |

Every installed file is recorded with a hash in `~/.agent-sdlc/manifest.json`. The installer skips files it didn't create, and `--uninstall` removes only files that are unchanged since install.

## Troubleshooting

- **"Skipped ... not installed by agent-sdlc"**: a file with that name already exists (e.g. your own `review.md`). Keep it, rename ours, or pass `--force` to overwrite.
- **Slash command name clashes** (`/review`, `/ship`, `/qa` vs. built-ins or other plugins): installed commands never overwrite existing files. If a clash remains, rename the installed `.md` file; plugin installs are namespaced (`/agent-sdlc:review`).
- **Skills load twice**: you have both the Claude plugin and `npx --claude`. `--doctor` flags this; remove one with `npx sdlc-kit --claude --uninstall`.
- **Uninstall left a file**: it was edited after install. Delete it manually or use `--uninstall --force`.
- **Windows, macOS, Linux**: all three are tested in CI on Node 20 and 22. The installer and the `--optimize` statusline need only Node.js (no `bash` or `jq`). Paths use your home directory (`%USERPROFILE%` on Windows). The Cursor and OpenCode directories are unverified on Windows.
- **Requires Node.js >=20.**

## Verifying the token savings yourself

No benchmark numbers are published; measure on your own setup. In Claude Code run `/context` in a fresh session before and after `npx sdlc-kit --claude` and compare the "Skills" and "Slash commands" rows (only frontmatter loads up-front). Run `npx sdlc-kit --doctor` for a baseline audit.

## Development & Tests

```bash
npm test                       # Node >=20, runs in temp dirs only
node dist/bin/cli.js --dry-run --all   # after `npm ci && npm run build`; previews an install without writing
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## License

MIT
