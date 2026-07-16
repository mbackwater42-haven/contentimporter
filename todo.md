# Todo: (contentimporter)

## Done
- [x] Manual verification in a live browser session (Playwright) — see status.md for
      full results. All core paths (browse/search/plain-drag/repeat-drag/Alt-drag/
      Ctrl-drag) confirmed working; two real bugs found and fixed (extension-filter dot
      mismatch, Ctrl+Drag retry orphaning Actors).

## Follow-ups
- [x] Test data cleaned up (Actors, Tokens, Tile, Folder, sample tokenart/ folder, and
      rootPath setting all reverted).
- [ ] Real-world playtest with your actual token art collection. `assets/Images/Monsters`
      and `assets/Images/Tokens` (already in your Data dir) look like good candidates to
      point the "Art Collection Folder" setting at.

## Phase 2 (not started)
- [ ] Audio import
- [ ] Text/JournalEntry import
- [ ] Animation import
