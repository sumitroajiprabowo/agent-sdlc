# Contributing to `agent-sdlc`

Thank you for contributing! Keep this project lean, universal, and zero-dependency.

## Rules
1. **Zero external npm dependencies**: use Node.js >=18 built-ins only (`node:*`).
2. **Follow `agentskills.io` spec**:
   - `skills/*/SKILL.md` must stay `<= 100` lines (use `references/` for deep guides).
   - Quote YAML `description:` values and avoid `<` / `>` characters.
   - Include `license: MIT` and `"Use when ..."` triggers in `description`.
3. **Keep it universal**: never add company-specific, private, or machine-local paths.
4. **Tests required**: run `npm test` before opening a PR; all tests must run hermetically in temporary directories.
