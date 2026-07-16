import ArtBrowser from "./apps/art-browser.mjs";
import {registerTokenDrop} from "./lib/token-drop.mjs";
import {registerCompendiumImportButton} from "./lib/compendium-import-button.mjs";

const MODULE_ID = "content-importer";

registerTokenDrop();
registerCompendiumImportButton();

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "rootPath", {
    name: "CONTENT-IMPORTER.Settings.RootPath.Name",
    hint: "CONTENT-IMPORTER.Settings.RootPath.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    filePicker: "folder"
  });

  game.settings.register(MODULE_ID, "collapsedFolders", {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });
});

Hooks.on("getSceneControlButtons", controls => {
  const tokens = controls.tokens;
  if (!tokens) return;
  tokens.tools["content-importer-browser"] = {
    name: "content-importer-browser",
    order: tokens.tools.target ? tokens.tools.target.order + 1 : 100,
    title: "CONTENT-IMPORTER.Controls.OpenBrowser",
    icon: "fa-solid fa-images",
    button: true,
    onChange: () => {
      const app = ArtBrowser.instance ??= new ArtBrowser();
      app.render({force: true});
    }
  };
});
