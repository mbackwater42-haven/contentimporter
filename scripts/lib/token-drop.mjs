import {nameFromFilename} from "./actor-link.mjs";

const MODULE_ID = "content-importer";

/** Custom dataTransfer "type" for a plain drag: a decorative Token with no backing Actor. */
export const TOKEN_DROP_TYPE = `${MODULE_ID}:token`;

/**
 * Register the canvas drop handler for plain (non-Ctrl) drags. Returning false tells core
 * Foundry to skip its own drop handling, since this custom "type" isn't one it recognizes.
 */
export function registerTokenDrop() {
  Hooks.on("dropCanvasData", (canvas, data) => {
    if (data.type !== TOKEN_DROP_TYPE) return;
    _createUnlinkedToken(data);
    return false;
  });
}

/**
 * Create a Token with no actorId — renders on the canvas but has no sheet, no HP tracking,
 * and never appears in the Actors sidebar. Intended for decorative/background NPCs that
 * players won't interact with.
 * @param {{path: string, x: number, y: number}} data
 */
async function _createUnlinkedToken(data) {
  const gridSize = canvas.scene?.grid?.size ?? 100;
  const tokenData = {
    name: nameFromFilename(data.path),
    texture: {src: data.path},
    x: data.x - gridSize / 2,
    y: data.y - gridSize / 2,
    width: 1,
    height: 1
  };
  await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
}
