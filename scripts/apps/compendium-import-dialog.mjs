import {buildCompendiumActorIndex, getCompendiumActorIndex} from "../lib/compendium-actor-index.mjs";

const MODULE_ID = "content-importer";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export default class CompendiumImportDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} options
   * @param {Actor} options.actor  The Actor whose sheet this dialog will overwrite.
   */
  constructor(options) {
    super(options);
    this.actor = options.actor;
    this._query = options.actor?.name ?? "";
    this._selected = null;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "content-importer-compendium-import",
    classes: ["content-importer", "compendium-import-dialog"],
    tag: "div",
    window: {
      title: "CONTENT-IMPORTER.CompendiumImport.Title",
      icon: "fa-solid fa-cloud-arrow-down",
      resizable: true
    },
    position: {
      width: 480,
      height: 600
    },
    actions: {
      import: CompendiumImportDialog.#onImport
    }
  };

  /** @override */
  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/compendium-import-dialog.hbs`,
      scrollable: [".ci-results"]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(_options) {
    let index = getCompendiumActorIndex();
    if (!index) index = await buildCompendiumActorIndex();
    return {
      actorName: this.actor?.name ?? "",
      query: this._query,
      results: this.#filterResults(index, this._query),
      selected: this._selected
    };
  }

  #filterResults(index, query) {
    const q = query?.trim().toLowerCase();
    const matches = q ? index.filter(e => e.name.toLowerCase().includes(q)) : index;
    return matches.slice(0, 100);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const input = this.element.querySelector(".ci-search");
    input?.addEventListener("input", foundry.utils.debounce(this.#onSearchInput.bind(this), 200));
    this.element.querySelector(".ci-results")?.addEventListener("click", this.#onResultClick.bind(this));
  }

  #onSearchInput(event) {
    this._query = event.target.value;
    this._selected = null;
    this.render();
  }

  #onResultClick(event) {
    const row = event.target.closest("[data-uuid]");
    if (!row) return;
    this._selected = row.dataset.uuid;
    this.render();
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  /**
   * @this CompendiumImportDialog
   */
  static async #onImport(_event, _target) {
    if (!this._selected || !this.actor) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CONTENT-IMPORTER.CompendiumImport.ConfirmTitle")},
      content: `<p>${game.i18n.format("CONTENT-IMPORTER.CompendiumImport.ConfirmBody", {actor: this.actor.name})}</p>`,
      rejectClose: false
    });
    if (!confirmed) return;

    const source = await fromUuid(this._selected);
    if (!source) {
      ui.notifications.error(game.i18n.localize("CONTENT-IMPORTER.CompendiumImport.NotFound"));
      return;
    }

    await this.actor.update({
      name: source.name,
      type: source.type,
      system: source.system.toObject(),
      "prototypeToken.name": source.name
    });

    const itemIds = this.actor.items.map(i => i.id);
    if (itemIds.length) await this.actor.deleteEmbeddedDocuments("Item", itemIds);
    const itemData = source.items.map(i => i.toObject());
    if (itemData.length) await this.actor.createEmbeddedDocuments("Item", itemData);

    const effectIds = this.actor.effects.map(e => e.id);
    if (effectIds.length) await this.actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);
    const effectData = source.effects.map(e => e.toObject());
    if (effectData.length) await this.actor.createEmbeddedDocuments("ActiveEffect", effectData);

    ui.notifications.info(game.i18n.format("CONTENT-IMPORTER.CompendiumImport.Success", {name: source.name}));
    this.close();
  }
}
