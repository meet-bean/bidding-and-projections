# Superior + Stratagraph — workspace root

This folder is the git root (remote: `meet-bean/bidding-and-projections`). The actual app lives in a subfolder — read its CLAUDE.md before working on it.

## Which app is live (read before editing)

- **The live, running app is `work/stratagraph-main/`** (Vite app at `apps/web`, dev on localhost:5173). Its full CLAUDE.md is at [work/stratagraph-main/CLAUDE.md](work/stratagraph-main/CLAUDE.md).
- **This repo contains duplicate and dead code copies.** Before editing any file, confirm it belongs to the live app (`work/stratagraph-main/apps/web/src/...`), not a stale copy. Past sessions wasted rounds editing a dead JSX copy and answering from the wrong codebase.
- If you can't tell which file is actually rendered, verify the import path the dev server uses before changing anything.

## Version control

- The git root is this top-level folder. **Never commit data dirs, archives, or extracted dumps** — `*.zip`, `work/sop-platform`, `node_modules`, `Screenshots/`, `.superpowers/` are gitignored; keep it that way.
- Standard closing ritual after a change: verify it renders in the browser → run lint/typecheck → commit and push to `main`. The `/ship` skill packages this.
