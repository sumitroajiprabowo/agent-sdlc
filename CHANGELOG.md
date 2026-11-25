# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-11-25

First release published from CI via npm trusted publishing (OIDC, with provenance).

### Changed
- GitHub repository renamed from `agent-sdlc` to `sdlc-kit`; the old URL redirects. README now documents `npx sdlc-kit` as the primary install.
- Remaining `agent-sdlc` identifiers renamed to `sdlc-kit`: the Claude plugin and marketplace name (reinstall the plugin with `/plugin install sdlc-kit@sdlc-kit`), the `~/.sdlc-kit/` manifest and local prompt directory, `sdlc-kit-statusline.mjs`, and `settings.json.sdlc-kit.bak`. Installs made with 0.1.0 are migrated on the next run, and `--uninstall` and `--doctor` still recognize the old names.

### Added
- Manifest (`~/.agent-sdlc/manifest.json`) tracking installed files; `--force` flag.
- Slash commands now also install for `--cursor` (`~/.cursor/commands/`) and `--opencode` (`~/.config/opencode/command/`).
- `--doctor` detects outdated installs and plugin + npx duplicate installs.
- Release workflow (tag -> `npm publish --provenance`), macOS in CI matrix, `SECURITY.md`, issue template.

### Changed
- The npm package is published as `sdlc-kit` (the name `agent-sdlc` is taken); the installed command is `sdlc-kit`.
- Source migrated to TypeScript (`strict`), compiled to `dist/` by `tsc`; the `bin` entry is now `dist/bin/cli.js`. No runtime dependencies were added. CI runs `npm run typecheck`.
- The `--optimize` statusline is now a Node script (`~/.claude/agent-sdlc-statusline.mjs`) instead of bash, so it works on Windows without `jq`. `--uninstall` still removes the old `statusline-command.sh` and its settings entry.
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
