# Contributing to `sdlc-kit`

Keep this project small, with no runtime dependencies.

## Rules
1. **Zero runtime dependencies**: use Node.js >=20 built-ins only (`node:*`). `typescript` and `@types/node` are dev-only.
2. **Follow `agentskills.io` spec**:
   - `skills/*/SKILL.md` must stay `<= 100` lines (use `references/` for deep guides).
   - Quote YAML `description:` values and avoid `<` / `>` characters.
   - Include `license: MIT` and `"Use when ..."` triggers in `description`.
3. **No private references**: never add company-specific or machine-local paths; a test enforces this.
4. **Tests required**: run `npm test` before opening a PR; all tests must run hermetically in temporary directories.

## Workflow
- Branch from `main`, open a pull request, keep it to one concern. Fill in the PR template.
- Run before pushing: `npm run typecheck && npm test && node dist/bin/cli.js --help && node dist/bin/cli.js --doctor && npm pack --dry-run`.

## Adding or changing things
- **New subagent**: add `agents/<name>.md` (frontmatter `name`, quoted `description`, `tools`; <=30 lines) **and** list it in `AGENT_FILES` in `lib/installer.ts`; update the counts in `README.md` and `bin/cli.ts`.
- **New slash command**: add `commands/<name>.md` (with a `description:` frontmatter line, <=30 lines) **and** list it in `COMMAND_FILES` in `lib/installer.ts`; update the command counts in `README.md` and `bin/cli.ts`.
- **New skill reference**: add it under `skills/<skill>/references/` and link it from that skill's `SKILL.md` and the README.
- **Orchestration references**: `team-protocol.md` <=120 lines, `team-dispatch.md` <=90, `team-debate.md` <=60 (tests enforce). A new workflow step type, run status or board `TYPE` must also update `lib/check-run.ts` and its tests.
- **Installer changes**: files go through `installManagedFile` / `uninstallManagedFile` so the manifest stays accurate; add a test that uses `fs.mkdtempSync`. A new project gitignore entry goes in `PROJECT_GITIGNORE_ENTRIES` and in the `--doctor` check. `lib/statusline.ts` must stay self-contained (it is copied to `~/.claude/` as-is).
- **Releases**: bump `version` in `package.json` and `.claude-plugin/plugin.json`, add a matching `## [x.y.z]` section to `CHANGELOG.md` (a test checks all three), then push a `vx.y.z` tag. The release workflow publishes to npm through trusted publishing (OIDC, no token) and skips a version that already exists on npm.
- **README demo**: `assets/demo.svg` is hand-edited (animated CSS, no tooling); keep it <15 KB and in sync with the command names.
