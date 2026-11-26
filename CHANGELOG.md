# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
