# Security Policy

## Scope
`agent-sdlc` copies markdown skills/commands and edits `~/.claude/settings.json` (only with `--optimize`). It has no runtime dependencies and makes no network calls.

## Reporting a vulnerability
Please open a private advisory via GitHub: **Security → Report a vulnerability** on the repository. Do not file public issues for security problems. Expect an initial response within 7 days.

## What counts
- The installer writing, overwriting, or deleting files outside the documented target directories
- Path traversal or unsafe handling of existing user settings
- Shipped templates or scripts that execute unexpected commands
