# Status: (contentimporter)

_Last updated: 2026-07-16_

## Current State: v1.0 released

`module.json` version `1.0.0`. Committed and pushed to
`github.com/mbackwater42-haven/contentimporter` (`master` branch).

### Art Browser
Toolbar button (Token controls group) opens a floating Art Browser window over the
configured "Art Collection Folder".

- Folder tree mirrors disk structure, collapsible per-folder, state persisted per-client
  (defaults to fully collapsed on first-ever open, then remembers where you left it) —
  plus a Collapse/Expand All toggle.
- Live search filter across the current folder scope.
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
- Verified live end-to-end: real click-through (search → select → import → confirm)
  against the DDB Monsters compendium, correcting a filename-derived name
  ("Dragon Amethyst") to the real stat block ("Young Amethyst Dragon", 168 HP, 10 items),
  keeping the original portrait art.

## Known non-issues (investigated, not module bugs)
- Token/prototype-token resize "reverting" turned out to be a browser cache issue on the
  user's end, not a module bug. Confirmed via direct API testing that both placed-token
  and prototype-token width/height updates persist correctly.

## Environment notes
- Git repo initialized this session (didn't exist before); local identity set to
  `mbackwater42-haven` / user's email, scoped to this repo only (not global).
- Playwright MCP used for all live verification (real browser, real world).

## Blockers
None. Ready for real-world use.
