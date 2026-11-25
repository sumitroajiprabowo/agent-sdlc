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
- **New slash command**: add `commands/<name>.md` (with a `description:` frontmatter line, <=30 lines) **and** list it in `COMMAND_FILES` in `lib/installer.ts`; update the command counts in `README.md` and `bin/cli.ts`.
- **New skill reference**: add it under `skills/<skill>/references/` and link it from that skill's `SKILL.md` and the README.
- **Installer changes**: files go through `installManagedFile` / `uninstallManagedFile` so the manifest stays accurate; add a test that uses `fs.mkdtempSync`.
- **Releases**: bump `version` in `package.json` and `.claude-plugin/plugin.json`, add a matching `## [x.y.z]` section to `CHANGELOG.md` (a test checks all three), then push a `vx.y.z` tag. The release workflow publishes to npm through trusted publishing (OIDC, no token) and skips a version that already exists on npm.
