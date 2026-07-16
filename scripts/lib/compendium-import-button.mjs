const BUTTON_CLASS = "content-importer-compendium-import";

/**
 * Inject a header button on any Actor sheet (any game system) that opens the compendium
 * import dialog, but only while the sheet is editable. Hooks both the modern ApplicationV2
 * render hook and the legacy V1 hook so this works across systems regardless of which sheet
 * architecture they've adopted.
 */
export function registerCompendiumImportButton() {
  Hooks.on("renderActorSheetV2", _onRenderActorSheet);
  Hooks.on("renderActorSheet", _onRenderActorSheet);
}

function _onRenderActorSheet(app) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.documentName !== "Actor") return;

  const root = app.element instanceof HTMLElement ? app.element : app.element?.[0];
  if (!root) return;

  root.querySelector(`.${BUTTON_CLASS}`)?.remove();

  // dnd5e2-style sheets have a Play/Edit mode toggle; respect it if present. Systems
  // without that concept just fall back to the sheet's generic edit permission.
  const hasModeToggle = !!root.querySelector('[data-action="changeMode"]');
  const isEditMode = hasModeToggle ? root.classList.contains("editable") : true;
  if (!app.isEditable || !isEditMode) return;

  const header = root.querySelector(".window-header");
  if (!header) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `unbutton control-button header-control ${BUTTON_CLASS}`;
  btn.dataset.tooltip = game.i18n.localize("CONTENT-IMPORTER.CompendiumImport.ButtonTooltip");
  btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down" inert></i>`;
  btn.addEventListener("click", async () => {
    const {default: CompendiumImportDialog} = await import("../apps/compendium-import-dialog.mjs");
    new CompendiumImportDialog({actor}).render(true);
  });

  const anchor = header.querySelector(".header-elements");
  const closeBtn = header.querySelector('[data-action="close"]');
  if (anchor) anchor.prepend(btn);
  else if (closeBtn) header.insertBefore(btn, closeBtn);
  else header.appendChild(btn);
}
