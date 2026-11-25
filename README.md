# agent-sdlc

Universal, token-efficient SDLC workflow **skills**, **slash commands**, and **multi-agent orchestrator protocol** for **Claude Code**, **Codex**, **Antigravity**, and **Local LLMs** — zero external dependencies, pure Node.js.

## Why `agent-sdlc`?

AI coding agents burn tokens when they carry bloated global instructions, run marathon sessions, dump full test logs, or pass entire chat histories between subagents. `agent-sdlc` packages proven engineering habits into lightweight, on-demand artifacts:

- **Low baseline overhead**: `sdlc-workflow` + `sdlc-orchestrator` use tiny YAML frontmatter and load full playbooks (and 8 on-demand `references/`) only when relevant.
- **Slash commands stay 0-token until invoked**: `/spec`, `/start`, `/handoff`, `/pickup`, `/handoff-pr`, `/adr`, `/qa`, `/review`, `/ship`.
- **Full 0 → Production SDLC**: repo setup, milestone slicing, 5-state frontend design, QA pyramid, bug vs prod hotfix, CI/CD, and zero-downtime DB migrations (*Expand & Contract*).
- **Token-safe multi-agent orchestration**: fresh-context worker briefings and `<30-line` handoffs.

---

## Quick Start

```bash
# Auto-detect installed agents on your machine
npx github:sumitroajiprabowo/agent-sdlc

# Or after publishing to npm:
npx agent-sdlc
```

### Install for Specific Agents

```bash
# Claude Code only (skills + 9 slash commands)
npx github:sumitroajiprabowo/agent-sdlc --claude

# Claude Code + token-saving preset (opusplan, 200k cap, tool search, statusline)
npx github:sumitroajiprabowo/agent-sdlc --claude --optimize

# Codex only
npx github:sumitroajiprabowo/agent-sdlc --codex

# Antigravity only
npx github:sumitroajiprabowo/agent-sdlc --antigravity

# Cursor or OpenCode
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
| `--cursor` | Install skills into `~/.cursor/skills/` |
| `--opencode` | Install skills into `~/.config/opencode/skills/` and `~/.agents/skills/` |
| `--local` | Install ultra-compact prompt (`<800` tokens) to `~/.agent-sdlc/LOCAL_PROMPT.md` |
| `--project` | Scaffold non-destructive project templates (`docs/`, PR template, `AGENTS.md`, `CLAUDE.md -> @AGENTS.md`, `.gitignore`) |
| `--all` | Install across `claude`, `codex`, `antigravity`, `cursor`, `opencode`, and `local` |
| `--optimize` | With `--claude`: backs up `~/.claude/settings.json` (preserving original `.bak`) and enables `opusplan`, 200k context cap, tool search, auto-compact at 70%, bounded outputs, and context statusline |
| `--doctor` | Run a read-only health & token-efficiency audit |
| `--no-orchestrator` | Skip installing `sdlc-orchestrator` (single-agent workflow only) |
| `--dry-run` | Preview actions without writing any files |
| `--uninstall` | Remove `agent-sdlc` managed files from selected targets |

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
- **Cursor**: Skills in `~/.cursor/skills/` are discovered automatically; reference `sdlc-workflow` or `sdlc-orchestrator` in chat/rules.
- **OpenCode**: Skills in `~/.config/opencode/skills/` and `~/.agents/skills/` are discovered automatically.
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

## Development & Tests

```bash
npm test
```

## License

MIT
