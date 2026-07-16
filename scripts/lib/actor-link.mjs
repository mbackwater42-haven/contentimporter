const MODULE_ID = "content-importer";
const FLAG_SOURCE_GROUP = "sourceGroup";

/**
 * Pending/ready forceNew (Ctrl+Drag) creations, keyed by path. A dragstart retry for the
 * same path must reuse this entry rather than kick off another Actor.create — otherwise
 * every retry before the first create resolves orphans a new Actor. Cleared explicitly via
 * releaseForceNewActor() once a drag successfully consumes the ready actor.
 * @type {Map<string, {promise: Promise<Actor>, actor: Actor|null}>}
 */
const _forceNewPending = new Map();

/**
 * Synchronously check whether a forceNew Actor requested earlier for this path has
 * finished creating. Used by dragstart to complete on retry without re-triggering creation.
 * @param {string} path
 * @returns {Actor|null}
 */
export function peekForceNewActor(path) {
  return _forceNewPending.get(path)?.actor ?? null;
}

/**
 * Release a ready forceNew Actor after a drag has consumed it, so the next Ctrl+Drag of
 * the same image starts a genuinely new Actor instead of reusing this one forever.
 * @param {string} path
 */
export function releaseForceNewActor(path) {
  _forceNewPending.delete(path);
}

/**
 * Create a new, independent Actor to back a Ctrl+Drag Token — always a fresh Actor, never
 * reused across drags of the same image. Lands at the root of the Actors sidebar (no
 * folder) so the user can sort it into whatever scene-specific folder they want, rather
 * than inheriting the image collection's folder structure.
 * @param {string} path
 * @returns {Promise<Actor>}
 */
export async function ensureActorForImage(path) {
  const pending = _forceNewPending.get(path);
  if (pending) return pending.promise;

  const entry = {promise: null, actor: null};
  entry.promise = _createActor(path)
    .then(actor => {
      entry.actor = actor;
      return actor;
    })
    .catch(err => {
      _forceNewPending.delete(path);
      throw err;
    });
  _forceNewPending.set(path, entry);
  return entry.promise;
}

/* -------------------------------------------- */

async function _createActor(path) {
  const baseName = nameFromFilename(path);
  const name = _dedupeName(baseName);
  const type = game.documentTypes.Actor.includes("npc") ? "npc" : game.documentTypes.Actor[0];

  return Actor.create({
    name,
    type,
    img: path,
    folder: null,
    prototypeToken: {texture: {src: path}},
    flags: {[MODULE_ID]: {[FLAG_SOURCE_GROUP]: path}}
  });
}

/**
 * @param {string} path
 * @returns {string}
 */
export function nameFromFilename(path) {
  const base = path.split("/").pop().replace(/\.[^./]+$/, "");
  const spaced = base.replace(/[-_]+/g, " ").trim() || base;
  return spaced.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function _dedupeName(baseName) {
  const siblings = new Set(game.actors.filter(a => !a.folder).map(a => a.name));
  if (!siblings.has(baseName)) return baseName;
  let i = 2;
  while (siblings.has(`${baseName} (${i})`)) i++;
  return `${baseName} (${i})`;
}
