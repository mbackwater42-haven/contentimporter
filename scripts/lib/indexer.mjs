const MODULE_ID = "content-importer";

const _VIDEO_EXTENSIONS = new Set(Object.keys(CONST.VIDEO_FILE_EXTENSIONS));
const _IMAGE_EXTENSIONS = new Set(Object.keys(CONST.IMAGE_FILE_EXTENSIONS));

/**
 * @typedef {object} ArtIndexNode
 * @property {string} name
 * @property {string} path
 * @property {ArtIndexNode[]} dirs
 * @property {{name: string, path: string, folder: string, isVideo: boolean, isOther: boolean}[]} files
 */

/** @type {{tree: ArtIndexNode, files: {name: string, path: string, folder: string}[]} | null} */
let _index = null;

/** @type {Promise<typeof _index> | null} */
let _building = null;

export function getIndex() {
  return _index;
}

/**
 * Build (or rebuild) the art index from the configured root path.
 * Concurrent calls share the same in-flight build.
 * @param {boolean} force  Rebuild even if an index already exists.
 */
export async function buildIndex(force = false) {
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
  const root = game.settings.get(MODULE_ID, "rootPath")?.trim().replace(/\/+$/, "");
  const tree = {name: root ? root.split("/").pop() : "", path: root ?? "", dirs: [], files: []};
  const files = [];
  if (root) await _walk(root, tree, files);
  return {tree, files};
}

async function _walk(target, node, files) {
  const FilePicker = foundry.applications.apps.FilePicker.implementation;
  const extensions = Object.keys(CONST.TEXTURE_FILE_EXTENSIONS).map(ext => `.${ext}`);
  let result;
  try {
    result = await FilePicker.browse("data", target, {extensions});
  } catch (err) {
    console.warn(`${MODULE_ID} | failed to browse "${target}"`, err);
    return;
  }

  for (const filePath of result.files) {
    const ext = filePath.split(".").pop().toLowerCase();
    const entry = {
      name: filePath.split("/").pop(),
      path: filePath,
      folder: target,
      isVideo: _VIDEO_EXTENSIONS.has(ext),
      isOther: !_IMAGE_EXTENSIONS.has(ext) && !_VIDEO_EXTENSIONS.has(ext)
    };
    node.files.push(entry);
    files.push(entry);
  }
  node.files.sort((a, b) => a.name.localeCompare(b.name));

  for (const dirPath of result.dirs) {
    const childNode = {name: dirPath.split("/").pop(), path: dirPath, dirs: [], files: []};
    node.dirs.push(childNode);
    await _walk(dirPath, childNode, files);
  }
  node.dirs.sort((a, b) => a.name.localeCompare(b.name));
}
