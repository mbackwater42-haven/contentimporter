# Status: (contentimporter)

_Last updated: 2026-07-11_

## Current State
Phase 1 (image import / Art Browser) built and **verified end-to-end in a live browser**
session against the real Foundry server (Playwright MCP, headed Chrome) in world
`cursed-dragon-of-phandelver`. All core paths confirmed working:

- Toolbar button opens the floating Art Browser window (Token controls group).
- Folder tree + live search filter both work correctly.
- Plain drag → finds/creates backing Actor (type `npc`, art + prototype token set,
  filed into `Content Importer/monsters/oozes`) → real linked Token dropped on canvas.
- Repeat drag of the same image → same Actor reused (dnd5e `actorLink: false` default
  means each Token still tracks its own HP independently) — confirms the "squad of
  identical guards" design goal with zero duplicate Actors.
- Alt+Drag → plain art Tile, no Actor created.
- Ctrl+Drag → forces a new, independent Actor (see bug fixed below).
- Module manifest, settings registration, and scene-control hook all load cleanly with
  zero console errors in a real world.

## Bug found and fixed during testing
**Extension filter used unfiltered `CONST.IMAGE_FILE_EXTENSIONS` keys** (`"png"`) against
the server's `path.extname()` check (`".png"`, with dot) — every file was silently
filtered out of every folder, so the browser always showed folders but zero images ("No
Images Found"). Fixed in `scripts/lib/indexer.mjs` by prefixing each extension with `.`.

**Ctrl+Drag (force new Actor) could never complete**: `ensureActorForImage(path,
{forceNew: true})` always ignored any in-progress/just-finished creation on retry, so
each retry of the same drag gesture spawned *another* orphaned Actor and the drag never
resolved — confirmed by reproducing it (2 orphaned "Gray Ooze (2)"/"(3)" Actors, zero
successful drops). Fixed in `scripts/lib/actor-link.mjs`: added a `_forceNewPending` map
so a dragstart retry picks up the actor that's already being created (or already ready)
instead of starting a new one; `releaseForceNewActor()` clears it once a drag actually
consumes it, so the *next* deliberate Ctrl+Drag still starts fresh. Re-verified after the
fix: first attempt still shows "preparing" (expected — creation is inherently async),
retry succeeds and places the Token, and a subsequent fresh Ctrl+Drag correctly starts a
new Actor rather than reusing the consumed one.

Both fixes verified live (not just re-read) via direct DOM `DragEvent` dispatch against
the real thumbnail and the real `#board` canvas element, which exercises our actual
`#onThumbDragStart` handler and core Foundry's real canvas drop handler — this was
necessary because Playwright's native OS-level mouse-drag simulation proved unreliable
against the PIXI canvas (worked once, then failed 3 times in a row); the DOM-event
approach is deterministic and still a legitimate test since it's the same event path a
real user's drag produces.

## File type support
Indexer now scans against `CONST.TEXTURE_FILE_EXTENSIONS` (all image formats including
webp, plus video: webm/mp4/m4v/ogv, plus basis/ktx2 compressed textures) instead of just
`CONST.IMAGE_FILE_EXTENSIONS` — matches everything Foundry itself accepts as Token/Tile
art. Thumbnails render as `<img>` for images, `<video>` (muted/loop/autoplay) for video
formats, and a generic file icon for basis/ktx2 (not natively browser-previewable, but
still fully draggable/usable). Drag-preview sizing handles both `naturalWidth/Height`
(image) and `videoWidth/Height` (video). Re-verified live with a real `.webp` file
end-to-end (Actor + Token created correctly) plus dummy `.webm`/`.ktx2` files to confirm
all three thumbnail render paths work without errors.

## Test debris — cleaned up
All test Actors/Tokens/Tiles/Folder created during verification were deleted from world
`cursed-dragon-of-phandelver` (scene "ODB"), the sample `assets/tokenart/` folder was
removed from disk, and the `rootPath` setting was reset to blank. World is back to its
pre-testing state.

Note for real use: the user's `assets/Images/Monsters` and `assets/Images/Tokens` folders
(already present in their Data directory, unrelated to our sample tree) look like natural
candidates to point `rootPath` at for real testing.

## Environment additions made this session
- Installed Playwright MCP server (`claude mcp add playwright -s user`) + Chromium and
  Chrome-channel browser binaries, to enable live browser testing. No sudo/system changes
  beyond `apt install google-chrome-stable` (done automatically by Playwright's own
  installer, not manually).
- Restarted the `pm2` `foundry` process once (no world was active at the time — verified
  via Setup screen "no active game" state first) so it would pick up the new module
  symlink.

## Blockers
None currently. Ready for the user to do a real manual playtest and decide on Phase 2
(audio/text/animation import) scope, or leave as-is.
