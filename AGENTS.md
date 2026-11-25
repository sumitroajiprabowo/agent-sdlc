# agent-sdlc — Project Instructions

## Stack & Commands
- **Runtime**: Node.js >=20 ESM, written in TypeScript and compiled with `tsc` to `dist/` (`0` runtime dependencies)
- **Typecheck**: `npm run typecheck`
- **Test**: `npm test` (builds, then `node --test dist/test/*.test.js`)
- **CLI Smoke**: `node dist/bin/cli.js --help && node dist/bin/cli.js --doctor`
- **Package Check**: `npm pack --dry-run`

## Conventions
- Keep `lib/installer.ts` dependency-free (`node:crypto`, `node:fs`, `node:os`, `node:path`, `node:url`).
- All tests in `test/cli.test.ts` must use `fs.mkdtempSync` temp dirs — never touch real `~/.claude` or `~/.agents`.
- Keep `skills/*/SKILL.md` under 100 lines and compliant with `agentskills.io` frontmatter rules.
- New slash commands must be added to `COMMAND_FILES` in `lib/installer.ts` and counted in `README.md` / `bin/cli.ts`.
- Never commit private/internal references; the leakage test enforces this automatically.
