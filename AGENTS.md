# agent-sdlc — Project Instructions

## Stack & Commands
- **Runtime**: Node.js >=20 ESM (`0` external dependencies)
- **Test**: `npm test` (`node --test test/*.test.mjs`)
- **CLI Smoke**: `node bin/cli.mjs --help && node bin/cli.mjs --doctor`
- **Package Check**: `npm pack --dry-run`

## Conventions
- Keep `lib/installer.mjs` dependency-free (`node:crypto`, `node:fs`, `node:os`, `node:path`, `node:url`).
- All tests in `test/cli.test.mjs` must use `fs.mkdtempSync` temp dirs — never touch real `~/.claude` or `~/.agents`.
- Keep `skills/*/SKILL.md` under 100 lines and compliant with `agentskills.io` frontmatter rules.
- New slash commands must be added to `COMMAND_FILES` in `lib/installer.mjs` and counted in `README.md` / `bin/cli.mjs`.
- Never commit private/internal references; the leakage test enforces this automatically.
