# Status: (contentimporter)

_Last updated: 2026-08-03_

## Current State: v1.0 released

`module.json` version `1.0.0`. Committed and pushed to
`github.com/mbackwater42-haven/contentimporter` (`main` branch, default). `v1.0.0` tag
points at the current HEAD (moved forward from the initial tag to include the search fix
and install-manifest fix below).

**Repo is public** (required — see Install section below).

### Install / reinstall
The `/mnt/foundryvtt/data/modules/` folder was deleted entirely at one point (see
Incidents below), which led to settling on this as the supported install path instead of
manual folder placement:

- **Setup → Install Module**, manifest URL: `https://cdn.jsdelivr.net/gh/mbackwater42-haven/contentimporter@v1.0.1/module.json`
  Use the jsDelivr URL, not `raw.githubusercontent.com` directly — GitHub's raw CDN cached
  a stale (pre-fix) copy of `module.json` for an extended period after a repo edit;
  jsDelivr reflected the update immediately. Pinned to the `v1.0.1` tag now instead of
  `main` — `module.json`'s own `manifest`/`download` fields point at the same tag, so bump
  both together on each release.
- `module.json` carries `manifest` + `download` fields (the latter pointing at GitHub's
  `main` branch zipball) — both are required for Foundry's direct-URL install flow; a bare
  manifest URL without `download` fails with "does not provide a download URL that can be
  installed".
- The dev bind mount (`/mnt/foundryvtt/data/modules/content-importer` →
  `~/Projects/contentimporter`) survived the reinstall — Foundry's ZIP install wrote
  through it since it's transparent at the filesystem level, and the content matched
  exactly (same commit), so live-editing still works with zero reconciliation needed.
  Not persisted across reboots — no fstab entry added yet; if the server reboots, recreate
  with `sudo mount --bind ~/Projects/contentimporter /mnt/foundryvtt/data/modules/content-importer`.

### Art Browser
Toolbar button (Token controls group) opens a floating Art Browser window over the
configured "Art Collection Folder".

- Folder tree mirrors disk structure, collapsible per-folder, state persisted per-client
  (defaults to fully collapsed on first-ever open, then remembers where you left it) —
  plus a Collapse/Expand All toggle.
- Search-on-submit (Enter or the search button), not per-keystroke — Foundry core's
  `SearchFilter` reassigns the input's value on every keystroke, which was dropping focus
  on the user's real (loaded/no-GPU) machine. Fixed by not calling it at all; filtering
  only runs on explicit submit now.
- Three drag modes, verified live against the real world (`cursed-dragon-of-phandelver`):
  - **Plain drag** → decorative Token with `actorId: null`. No sheet, no Actors sidebar
    entry — for background NPCs players won't interact with.
  - **Alt+drag** → art-only Tile, no Token/Actor at all.
  - **Ctrl+drag** → Actor-backed Token. Actor created flat at the Actors sidebar root (no
    folder nesting — user sorts manually into scene-specific folders).
- Supports all `CONST.TEXTURE_FILE_EXTENSIONS` (images, video, basis/ktx2).

### Compendium Import
Header button on any Actor sheet (edit mode only; respects dnd5e's Play/Edit toggle where
present, falls back to generic edit-permission for other systems) — hooks Foundry's core
`renderActorSheetV2`/`renderActorSheet`, not any system-specific hook, so it should carry
over to non-dnd5e systems (e.g. Pathfinder) later.

- Search dialog pre-fills with the Actor's current name, live-filters against a combined
  index of every Actor compendium in the world (not just DDB-sourced ones).
  Manual re-search handles cases where the auto-match is wrong (e.g. a file named
  "riverdrakeland" that's actually a Green Dragon).
- Import overwrites `name`, `type`, `system`, `items`, `effects` from the selected
  compendium Actor. Leaves `img`/token art untouched.
  Two-step confirm (select → Import → Yes/No dialog) before anything destructive happens.
- Search-on-submit (Enter or the search button), not per-keystroke — same root cause as the
  Art Browser fix (debounced `input` listener + full re-render was dropping focus). Fixed
  2026-08-03.
- Verified live end-to-end: real click-through (search → select → import → confirm)
  against the DDB Monsters compendium, correcting a filename-derived name
  ("Dragon Amethyst") to the real stat block ("Young Amethyst Dragon", 168 HP, 10 items),
  keeping the original portrait art.

## Known non-issues (investigated, not module bugs)
- Token/prototype-token resize "reverting" turned out to be a browser cache issue on the
  user's end, not a module bug. Confirmed via direct API testing that both placed-token
  and prototype-token width/height updates persist correctly.
- Terminal/browser crashes on the user's desktop traced to `libvulkan_lvp.so` (Mesa
  software Vulkan/llvmpipe) segfaulting under load — this VM has no real GPU. Unrelated to
  Foundry or the module; no fix applied per user's call (not a priority).

## Incidents
- **2026-07-30: entire `/mnt/foundryvtt/data/modules/` folder deleted** (all 12 installed
  modules, not just this one). Root cause of removal itself unconfirmed. Recovery:
  - Rebuilt the module list from the world's `core.moduleConfiguration` setting (still
    present in the world's LevelDB even with folders gone) — read via Foundry's own
    `classic-level` package directly, since raw `strings`/grep on the `.ldb` file
    truncated mid-value.
  - Restoring the folder (symlink, then a bind mount after ruling out symlink-avoidance)
    was **not enough** — Foundry's local package discovery kept silently excluding
    content-importer even after full process restarts, despite the manifest being valid,
    readable, and correctly named at every filesystem-level check. Root cause not
    conclusively identified (suspect a discovery-cache layer not invalidated by a plain
    folder restore).
  - Resolved by reinstalling through Foundry's actual supported flow instead
    (Setup → Install Module → manifest URL), which sidesteps whatever that local-discovery
    issue was. Required making the repo public + adding `manifest`/`download` fields to
    `module.json` (see Install section above).

## Environment notes
- Git repo initialized this session (didn't exist before); local identity set to
  `mbackwater42-haven` / user's email, scoped to this repo only (not global).
- Playwright MCP used for live verification through v1.0. Dropped as of 2026-08-03 per user
  request — user is normally logged into the world live and tests changes themselves;
  Playwright also risks colliding with the single GM session slot. CLAUDE.md's Default
  behavior section updated accordingly.
- `gh` CLI installed and authenticated (device-flow, plaintext token storage — no desktop
  secret-service available on this headless server). `gh auth setup-git` wires git to use
  it automatically, so no more pasting PATs into chat for push/pull.
- A PAT was pasted into a failed shell command early in setup (before `gh` was in place)
  and is exposed in chat history; it has since been revoked on GitHub by the user.
- Remote branch cleanup: GitHub's auto-created `main` (just a README) was merged with our
  `master` history (`--allow-unrelated-histories`, no conflicts), pushed as `main`, set as
  the repo's default branch, and the old `master` branch was deleted from GitHub.

## Blockers
None. Ready for real-world use.
