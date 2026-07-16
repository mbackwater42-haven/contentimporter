import {buildIndex, getIndex} from "../lib/indexer.mjs";
import {ensureActorForImage, peekForceNewActor, releaseForceNewActor} from "../lib/actor-link.mjs";
import {TOKEN_DROP_TYPE} from "../lib/token-drop.mjs";

const MODULE_ID = "content-importer";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class ArtBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {ArtBrowser|null} Singleton instance opened from the scene controls toolbar. */
  static instance = null;

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "content-importer-art-browser",
    classes: ["content-importer", "art-browser"],
    tag: "div",
    window: {
      title: "CONTENT-IMPORTER.Browser.Title",
      icon: "fa-solid fa-images",
      resizable: true,
      contentClasses: ["content-importer-content"]
    },
    position: {
      width: 720,
      height: 560
    },
    actions: {
      rescan: ArtBrowser.#onRescan,
      toggleAllFolders: ArtBrowser.#onToggleAllFolders
    }
  };

  /** @override */
  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/art-browser.hbs`,
      scrollable: [".art-grid"]
    }
  };

  /** @type {string|null} Active folder filter; null means "All". */
  _activeFolder = null;

  /**
   * Folder paths currently collapsed in the tree. Null until loaded from the persisted
   * client setting (or defaulted, on first-ever open, to "everything collapsed").
   * @type {Set<string>|null}
   */
  _collapsedFolders = null;

  /** @type {boolean} */
  _loading = false;

  #search = new foundry.applications.ux.SearchFilter({
    inputSelector: ".art-search",
    contentSelector: ".art-grid",
    callback: this._onSearchFilter.bind(this)
  });

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(_options) {
    const rootPath = game.settings.get(MODULE_ID, "rootPath")?.trim();
    const index = getIndex();
    if (index) await this.#ensureCollapsedFoldersLoaded(index.tree);
    return {
      rootPath,
      loading: this._loading && !index,
      treeNodes: index ? this.#flattenTree(index.tree) : [],
      files: index?.files ?? []
    };
  }

  /* -------------------------------------------- */

  /** @override */
  async render(options, _options) {
    await super.render(options, _options);
    const rootPath = game.settings.get(MODULE_ID, "rootPath")?.trim();
    if (rootPath && (options?.reloadData || !getIndex())) this.#refreshIndex(!!options?.reloadData);
    return this;
  }

  /**
   * Rebuild the index and re-render once complete.
   * @param {boolean} force
   */
  async #refreshIndex(force) {
    this._loading = true;
    await buildIndex(force);
    this._loading = false;
    this.render();
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#search.bind(this.element);
    this.element.querySelector(".art-tree")?.addEventListener("click", this.#onTreeClick.bind(this));
    const grid = this.element.querySelector(".art-grid");
    grid?.addEventListener("dragstart", this.#onGridDragStart.bind(this));
  }

  /** @override */
  _tearDown(options) {
    super._tearDown(options);
    this.#search.unbind();
  }

  /* -------------------------------------------- */
  /*  Tree / Filtering                             */
  /* -------------------------------------------- */

  /**
   * Flatten the nested folder tree into a depth-annotated list for rendering, skipping the
   * synthetic root node itself (its direct children become the top-level categories).
   * @param {object} root
   */
  #flattenTree(root) {
    const out = [];
    const walk = (node, depth) => {
      out.push({
        path: node.path,
        name: node.name,
        indent: depth * 14,
        depth,
        hasChildren: node.dirs.length > 0,
        collapsed: this._collapsedFolders.has(node.path),
        hidden: this.#hasCollapsedAncestor(node.path)
      });
      for (const child of node.dirs) walk(child, depth + 1);
    };
    for (const top of root.dirs) walk(top, 0);
    return out;
  }

  /**
   * Load the persisted collapse state on first use. If nothing has ever been saved for this
   * client, default to every folder collapsed and persist that as the starting state.
   * @param {object} tree
   */
  async #ensureCollapsedFoldersLoaded(tree) {
    if (this._collapsedFolders) return;
    const saved = game.settings.get(MODULE_ID, "collapsedFolders");
    if (saved) {
      this._collapsedFolders = new Set(JSON.parse(saved));
      return;
    }
    this._collapsedFolders = new Set(this.#allFolderPaths(tree));
    await this.#saveCollapsedState();
  }

  /**
   * @param {object} node
   * @returns {string[]} Paths of every folder (at any depth) that has subfolders.
   */
  #allFolderPaths(node) {
    const out = [];
    const walk = n => {
      for (const child of n.dirs) {
        if (child.dirs.length) out.push(child.path);
        walk(child);
      }
    };
    walk(node);
    return out;
  }

  async #saveCollapsedState() {
    await game.settings.set(MODULE_ID, "collapsedFolders", JSON.stringify([...this._collapsedFolders]));
  }

  /**
   * @param {string} path
   */
  #hasCollapsedAncestor(path) {
    const parts = path.split("/");
    for (let i = parts.length - 1; i >= 1; i--) {
      if (this._collapsedFolders.has(parts.slice(0, i).join("/"))) return true;
    }
    return false;
  }

  #onTreeClick(event) {
    const toggle = event.target.closest("[data-toggle]");
    if (toggle) {
      this.#onTreeToggle(toggle);
      return;
    }
    const item = event.target.closest("[data-folder-path]");
    if (!item) return;
    this._activeFolder = item.dataset.folderPath || null;
    for (const el of this.element.querySelectorAll(".art-tree .active")) el.classList.remove("active");
    item.classList.add("active");
    this.#search.filter(null, this.#search.query);
  }

  /**
   * Collapse/expand a folder in place, without a full re-render, so scroll position and
   * search state are preserved.
   * @param {HTMLElement} toggleEl
   */
  #onTreeToggle(toggleEl) {
    const item = toggleEl.closest(".tree-item");
    const path = item.dataset.folderPath;
    const collapsing = !this._collapsedFolders.has(path);
    if (collapsing) this._collapsedFolders.add(path);
    else this._collapsedFolders.delete(path);
    toggleEl.classList.toggle("fa-caret-right", collapsing);
    toggleEl.classList.toggle("fa-caret-down", !collapsing);

    const items = [...this.element.querySelectorAll(".art-tree .tree-item[data-depth]")];
    const startIdx = items.indexOf(item);
    const startDepth = Number(item.dataset.depth);
    for (let i = startIdx + 1; i < items.length; i++) {
      const el = items[i];
      if (Number(el.dataset.depth) <= startDepth) break;
      el.hidden = collapsing ? true : this.#hasCollapsedAncestor(el.dataset.folderPath);
    }
    this.#saveCollapsedState();
  }

  #inActiveFolder(folder) {
    if (!this._activeFolder) return true;
    return folder === this._activeFolder || folder.startsWith(`${this._activeFolder}/`);
  }

  _onSearchFilter(_event, query, rgx, content) {
    if (!content) return;
    const SearchFilter = foundry.applications.ux.SearchFilter;
    for (const thumb of content.querySelectorAll(".art-thumb")) {
      const matchesText = !query || rgx.test(SearchFilter.cleanQuery(thumb.dataset.path));
      thumb.hidden = !(matchesText && this.#inActiveFolder(thumb.dataset.folder));
    }
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                                */
  /* -------------------------------------------- */

  #onGridDragStart(event) {
    const thumb = event.target.closest(".art-thumb");
    if (!thumb) return;
    this.#onThumbDragStart(event, thumb);
  }

  #onThumbDragStart(event, thumb) {
    const path = thumb.dataset.path;

    if (event.altKey) {
      const tileSize = canvas?.dimensions?.size ?? 100;
      const dragData = {type: "Tile", texture: {src: path}, tileSize};
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    } else if (event.ctrlKey) {
      const actor = peekForceNewActor(path);
      if (!actor) {
        ui.notifications.warn(game.i18n.localize("CONTENT-IMPORTER.Notifications.PreparingActor"));
        ensureActorForImage(path);
        event.preventDefault();
        return;
      }
      releaseForceNewActor(path);
      event.dataTransfer.setData("text/plain", JSON.stringify({type: "Actor", uuid: actor.uuid}));
    } else {
      // Plain drag: a decorative Token with no backing Actor — never appears in the
      // Actors sidebar, no sheet, nothing for players to interact with.
      event.dataTransfer.setData("text/plain", JSON.stringify({type: TOKEN_DROP_TYPE, path}));
    }

    const media = thumb.querySelector("img, video");
    if (media && canvas?.ready) {
      const DragDrop = foundry.applications.ux.DragDrop.implementation;
      const w = (media.naturalWidth || media.videoWidth || 100) * canvas.stage.scale.x;
      const h = (media.naturalHeight || media.videoHeight || 100) * canvas.stage.scale.y;
      const preview = DragDrop.createDragImage(media, w, h);
      event.dataTransfer.setDragImage(preview, w / 2, h / 2);
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  /**
   * @this ArtBrowser
   */
  static async #onRescan(_event, _target) {
    this._activeFolder = null;
    await this.#refreshIndex(true);
  }

  /**
   * Collapse everything if any folder is currently expanded; otherwise expand everything.
   * @this ArtBrowser
   */
  static async #onToggleAllFolders(_event, _target) {
    const index = getIndex();
    if (!index) return;
    const allPaths = this.#allFolderPaths(index.tree);
    const allCollapsed = allPaths.every(p => this._collapsedFolders.has(p));
    this._collapsedFolders = new Set(allCollapsed ? [] : allPaths);
    await this.#saveCollapsedState();
    this.render();
  }
}
