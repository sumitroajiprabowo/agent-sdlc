# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-25

### Added
- Universal `sdlc-workflow` skill with 8 on-demand references (`architecture-checklist.md`, `monolith-and-microservices.md`, `clean-code.md`, `quality-gates.md`, `security-checklist.md`, `database-hygiene.md`, `incident-response.md`, `developer-habits.md`).
- Token-safe `sdlc-orchestrator` multi-agent protocol skill.
- 9 zero-overhead slash commands (`/spec`, `/start`, `/handoff`, `/pickup`, `/handoff-pr`, `/adr`, `/qa`, `/review`, `/ship`).
- Zero-dependency CLI installer (`bin/cli.mjs`) supporting `--claude` (+ `--optimize`), `--codex`, `--antigravity`, `--cursor`, `--opencode`, `--local`, `--project`, `--doctor`, `--dry-run`, `--uninstall`.
- Claude Code plugin & marketplace manifests (`.claude-plugin/`).
