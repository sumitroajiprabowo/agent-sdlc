# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Manifest (`~/.agent-sdlc/manifest.json`) tracking installed files; `--force` flag.
- Slash commands now also install for `--cursor` (`~/.cursor/commands/`) and `--opencode` (`~/.config/opencode/command/`).
- `--doctor` detects outdated installs and plugin + npx duplicate installs.
- Release workflow (tag -> `npm publish --provenance`), macOS in CI matrix, `SECURITY.md`, issue template.

### Changed
- The npm package is published as `@sumitroajiprabowo/agent-sdlc` (the unscoped name is taken). The installed command is still `agent-sdlc`.
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
