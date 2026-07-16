/** @type {Array<{uuid: string, id: string, name: string, img: string, type: string, packId: string, packLabel: string}>|null} */
let _index = null;

/** @type {Promise<typeof _index>|null} */
let _building = null;

export function getCompendiumActorIndex() {
  return _index;
}

/**
 * Build (or rebuild) a combined searchable index across every Actor compendium in the
 * world, regardless of which game system or module created it.
 * @param {boolean} force
 */
export async function buildCompendiumActorIndex(force = false) {
  if (_building) return _building;
  if (_index && !force) return _index;
  _building = _build();
  try {
    _index = await _building;
    return _index;
  } finally {
    _building = null;
  }
}

async function _build() {
  const packs = game.packs.filter(p => p.documentName === "Actor");
  const entries = [];
  for (const pack of packs) {
    let index;
    try {
      index = await pack.getIndex({fields: ["img", "type"]});
    } catch (err) {
      console.warn(`content-importer | failed to index pack "${pack.collection}"`, err);
      continue;
    }
    for (const doc of index) {
      entries.push({
        uuid: `Compendium.${pack.collection}.${doc._id}`,
        id: doc._id,
        name: doc.name,
        img: doc.img,
        type: doc.type,
        packId: pack.collection,
        packLabel: pack.metadata.label
      });
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}
