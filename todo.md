# Todo: (contentimporter)

## Done (v1.0)
- [x] Art Browser: browse/search/drag (plain Token, Alt Tile, Ctrl Actor-backed Token) —
      verified live.
- [x] Collapsible, state-persisted folder tree + Collapse/Expand All.
- [x] Plain drag no longer creates Actors (decorative Token only); Ctrl+drag Actors land
      flat at Actors sidebar root instead of mirroring image folders.
- [x] Compendium Import: header button on Actor sheets, system-agnostic, searches all
      world Actor compendiums, overwrites name/stats/items/effects, keeps token art.
- [x] Real-world playtest with actual token art collection (`assets/images/import`).
- [x] Git repo initialized, committed, pushed to GitHub.
- [x] Tagged v1.0.
- [x] `gh` CLI installed + authenticated; git wired to use it (no more pasting tokens).
- [x] Exposed PAT revoked on GitHub.
- [x] `main` set as default branch (merged with GitHub's auto-init README); stale
      `master` branch deleted from GitHub.
- [x] Search-on-submit fix (was filtering per-keystroke, dropping input focus).
- [x] Recovered from `/mnt/foundryvtt/data/modules/` deletion (all modules, not just
      ours); reinstalled via Setup → Install Module manifest URL, repo made public,
      `manifest`/`download` fields added to `module.json`. See status.md Incidents.
- [x] `v1.0.0` tag moved to current HEAD to cover the above fixes.
- [x] Search-on-submit fix applied to the Compendium Import dialog too (same debounced
      per-keystroke re-render bug, found in a second spot after the Art Browser fix).

## Consider for later
- [ ] Persist the dev bind mount across reboots (add `/etc/fstab` entry) — currently
      manual after any server restart.
- [ ] `raw.githubusercontent.com` served a stale `module.json` for an extended period
      after edits; jsDelivr (`cdn.jsdelivr.net/gh/...`) worked immediately and is now the
      documented install URL. Worth rechecking raw.githubusercontent's behavior later —
      may just have been unlucky cache timing tied to the private→public transition.

## Phase 2 (not started)
- [ ] Audio import
- [ ] Text/JournalEntry import
- [ ] Animation import
