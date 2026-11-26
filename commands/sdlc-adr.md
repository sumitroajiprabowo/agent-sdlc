---
description: "Record a concise Architecture Decision Record (docs/adr/ADR-NNN-*.md) and update docs/INDEX.md"
---

Record an Architecture Decision Record for `$ARGUMENTS`:

1. Check existing files in `docs/adr/` to determine the next 3-digit sequence number (`ADR-001`, `ADR-002`, etc.); create `docs/adr/` if it does not exist.
2. Write a tight 25–40 line ADR at `docs/adr/ADR-NNN-<kebab-slug>.md` with these sections:
   - `# ADR-NNN: <Title>`
   - `**Status**: Accepted (YYYY-MM-DD)`
   - `## Context`
   - `## Decision`
   - `## Rationale`
   - `## Consequences`
3. If `docs/INDEX.md` exists, append a 1-line link to the new ADR. Keep it concise so it stays cheap to read on-demand.
