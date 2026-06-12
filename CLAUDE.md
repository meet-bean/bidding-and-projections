# Superior + Stratagraph — workspace root

This folder is the git root (remote: `meet-bean/bidding-and-projections`). The actual app lives in a subfolder — read its CLAUDE.md before working on it.

## Which app is live (read before editing)

- **The live, running app is `work/stratagraph-main/`** (Vite app at `apps/web`, dev on localhost:5173). Its full CLAUDE.md is at [work/stratagraph-main/CLAUDE.md](work/stratagraph-main/CLAUDE.md).
- **The only app code in this repo is `work/stratagraph-main/`.** The dead `projections-app/` JSX copy, ffmpeg binaries, and root zip archives were deleted on 2026-06-12. `Superior  Construction/` now holds only source data (Vista worksheets, transcripts, docs) — never app code. `work/sop-platform/` is a separate gitignored project.
- If you can't tell which file is actually rendered, verify the import path the dev server uses before changing anything.

## Version control

- The git root is this top-level folder. **Never commit data dirs, archives, or extracted dumps** — `*.zip`, `work/sop-platform`, `node_modules`, `Screenshots/`, `.superpowers/` are gitignored; keep it that way.
- Standard closing ritual after a change: verify it renders in the browser → run lint/typecheck → commit and push to `main`. The `/ship` skill packages this.
