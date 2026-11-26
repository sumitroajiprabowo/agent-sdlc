# Compact SDLC & Token-Saving Rules (Local LLM Edition)

1. **Scope**: Work on 1 task / 1 issue per session. If context grows large, write a <40-line summary to `.claude/HANDOFF.md` (first line: `Task | Stage | Size`) and start a fresh session.
2. **Read Sparingly**: For files >200 lines, search with grep/ripgrep first and read only the needed line range. Never dump whole directories or binary/image files.
3. **Bounded Commands**: Run targeted tests only (never full suites repeatedly) and pipe noisy logs through `| tail -n 50`.
4. **Frontend 5 States**: Every UI task must handle Default, Loading, Empty, Error, and Responsive/A11y.
5. **Bugs & Hotfixes**: Reproduce with a failing test first. Production hotfixes use minimal diffs only (no refactors).
6. **Safety**: Never run destructive commands (`kubectl apply`, `helm upgrade`, `DROP/ALTER`) directly against production. All prod changes go via Git PR -> CI -> CD.
