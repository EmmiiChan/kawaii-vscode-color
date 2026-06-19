const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createSettingsMessageController
} = require("../../out/src/extensionHost/controllers/SettingsMessageController");
const {
  createSettingsCommandController
} = require("../../out/src/extensionHost/controllers/SettingsCommandController");
const {
  createSettingsStateService
} = require("../../out/src/extensionHost/services/SettingsStateService");
const {
  createSettingsBundleService
} = require("../../out/src/extensionHost/services/SettingsBundleService");
const {
  createSettingsEffectsService
} = require("../../out/src/extensionHost/services/SettingsEffectsService");

test("SettingsMessageController dispatches host messages and preserves legacy payload names", async () => {
  const calls = [];
  const controller = createSettingsMessageController({
    handlers: createHandlers(calls),
    isNeonE2ETestHookEnabled: () => false,
    isSettingsE2ETestHookEnabled: () => false,
    reportError: async (error) => calls.push(["error", error.message]),
    logError: () => {}
  });

  await controller.handleMessage({ type: "ready" });
  await controller.handleMessage({ type: "open-link", url: "https://example.test" });
  await controller.handleMessage({ type: "enable-neon" });
  await controller.handleMessage({
    type: "update-color",
    section: "workbench",
    id: "editor.background",
    value: "bad",
    themeVariantId: "dark"
  });
  await controller.handleMessage({
    type: "apply-neon-customizations",
    editorBackgroundOpacity: 0.2,
    editorBackgroundFit: "left",
    emptyEditorLogoOpacity: 0.7
  });

  assert.deepEqual(calls, [
    ["state"],
    ["openLink", "https://example.test"],
    ["enableNeon"],
    ["neonStatus", "Enable request sent. Follow the VS Code notification to restart the editor."],
    ["updateColor", "workbench", "editor.background", "bad", "dark"],
    ["state"],
    ["applyNeonCustomizations", 0.2, "left", 0.7],
    ["applyAllEffects"],
    ["state"]
  ]);
});

test("SettingsMessageController keeps test-only message gates at the boundary", async () => {
  const calls = [];
  const controller = createSettingsMessageController({
    handlers: createHandlers(calls),
    isNeonE2ETestHookEnabled: () => false,
    isSettingsE2ETestHookEnabled: () => false,
    reportError: async (error) => calls.push(["error", error.message]),
    logError: (methodName, error, context) => calls.push(["log", methodName, error.message, context.message.type])
  });

  await controller.handleMessage({ type: "e2e-apply-settings-bundle", bundle: { schema: "test" } });
  await controller.handleMessage({ type: "e2e-set-test-fixtures", fixtures: { settingsExportPath: "x" } });

  assert.deepEqual(calls, [
    [
      "log",
      "handleSettingsMessage",
      "E2E settings bundle import is only available while KAWAII_E2E_ALLOW_NEON_PATCH=1.",
      "e2e-apply-settings-bundle"
    ],
    [
      "error",
      "E2E settings bundle import is only available while KAWAII_E2E_ALLOW_NEON_PATCH=1."
    ],
    [
      "log",
      "handleSettingsMessage",
      "E2E test fixtures are only available while KAWAII_E2E_TEST_HOOKS=1 or KAWAII_E2E_ALLOW_NEON_PATCH=1.",
      "e2e-set-test-fixtures"
    ],
    [
      "error",
      "E2E test fixtures are only available while KAWAII_E2E_TEST_HOOKS=1 or KAWAII_E2E_ALLOW_NEON_PATCH=1."
    ]
  ]);
});

test("SettingsMessageController posts effects warnings only for successful imports", async () => {
  const calls = [];
  const handlers = createHandlers(calls);
  handlers.importSettingsFromVsSync = async () => {
    calls.push(["importVsSync"]);
    return false;
  };
  handlers.importSettingsBundle = async () => {
    calls.push(["importFile"]);
    return true;
  };
  const controller = createSettingsMessageController({
    handlers,
    isNeonE2ETestHookEnabled: () => true,
    isSettingsE2ETestHookEnabled: () => true,
    reportError: async (error) => calls.push(["error", error.message]),
    logError: () => {}
  });

  await controller.handleMessage({ type: "import-settings-from-vssync" });
  await controller.handleMessage({ type: "import-settings" });

  assert.deepEqual(calls, [
    ["importVsSync"],
    ["state"],
    ["importFile"],
    ["state"],
    ["effectsPending", "Settings imported. Click Apply Effects, then reload VS Code to refresh image-backed effects."]
  ]);
});

test("SettingsCommandController delegates settings command actions without owning VS Code internals", async () => {
  const calls = [];
  const controller = createSettingsCommandController({
    configureSettingsSync: (context) => calls.push(["sync", context.id]),
    openSettings: async (context, actions) => {
      calls.push(["open", context.id, actions.isNeonEnabled()]);
    }
  });

  controller.configureSettingsSync({ id: "ctx" });
  await controller.openSettings({ id: "ctx" }, {
    enableNeon: async () => {},
    disableNeon: async () => {},
    isNeonEnabled: () => true
  });

  assert.deepEqual(calls, [
    ["sync", "ctx"],
    ["open", "ctx", true]
  ]);
});

test("settings host services delegate state, bundle, and effects boundaries", async () => {
  const calls = [];
  const stateService = createSettingsStateService({
    createState: (context, webview) => ({ contextId: context.id, webviewId: webview.id })
  });
  const bundleService = createSettingsBundleService({
    applySettingsBundle: async (context, bundle) => calls.push(["applyBundle", context.id, bundle.schema]),
    configureSettingsSync: (context) => calls.push(["sync", context.id]),
    exportSettingsBundle: async (context) => calls.push(["export", context.id]),
    importSettingsBundle: async (context) => {
      calls.push(["import", context.id]);
      return true;
    },
    importSettingsFromVsSync: async (context) => {
      calls.push(["importSync", context.id]);
      return false;
    },
    saveSettingsToVsSync: async (context) => calls.push(["saveSync", context.id])
  });
  const effectsService = createSettingsEffectsService({
    applyAllEffects: async () => calls.push(["applyEffects"]),
    downloadEditorBackgroundImage: async (context) => calls.push(["downloadEditor", context.id]),
    downloadEmptyEditorLogoImage: async (context) => calls.push(["downloadLogo", context.id]),
    removeEditorBackgroundImage: async (context) => {
      calls.push(["removeEditor", context.id]);
      return true;
    },
    removeEmptyEditorLogoImage: async (context) => {
      calls.push(["removeLogo", context.id]);
      return false;
    },
    selectEditorBackgroundImage: async (context) => {
      calls.push(["selectEditor", context.id]);
      return true;
    },
    selectEmptyEditorLogoImage: async (context) => {
      calls.push(["selectLogo", context.id]);
      return false;
    },
    selectRandomNekoEditorBackgroundImage: async (context) => calls.push(["randomEditor", context.id]),
    selectRandomNekoEmptyEditorLogoImage: async (context) => calls.push(["randomLogo", context.id]),
    updateEditorBackgroundFit: async (context, fit) => calls.push(["fit", context.id, fit]),
    updateEditorBackgroundOpacity: async (context, opacity) => calls.push(["editorOpacity", context.id, opacity]),
    updateEmptyEditorLogoOpacity: async (context, opacity) => calls.push(["logoOpacity", context.id, opacity])
  });

  assert.deepEqual(stateService.createSettingsState({ id: "ctx" }, { id: "webview" }), {
    contextId: "ctx",
    webviewId: "webview"
  });
  bundleService.configureSettingsSync({ id: "ctx" });
  await bundleService.saveSettingsToVsSync({ id: "ctx" });
  await bundleService.importSettingsFromVsSync({ id: "ctx" });
  await bundleService.exportSettingsBundle({ id: "ctx" });
  assert.equal(await bundleService.importSettingsBundle({ id: "ctx" }), true);
  await bundleService.applySettingsBundle({ id: "ctx" }, { schema: "bundle" });
  assert.equal(await effectsService.selectEditorBackgroundImage({ id: "ctx" }), true);
  assert.equal(await effectsService.selectEmptyEditorLogoImage({ id: "ctx" }), false);
  await effectsService.updateEditorBackgroundFit({ id: "ctx" }, "top-right");
  await effectsService.updateEditorBackgroundOpacity({ id: "ctx" }, 0.2);
  await effectsService.updateEmptyEditorLogoOpacity({ id: "ctx" }, 0.6);
  await effectsService.applyAllEffects();

  assert.deepEqual(calls, [
    ["sync", "ctx"],
    ["saveSync", "ctx"],
    ["importSync", "ctx"],
    ["export", "ctx"],
    ["import", "ctx"],
    ["applyBundle", "ctx", "bundle"],
    ["selectEditor", "ctx"],
    ["selectLogo", "ctx"],
    ["fit", "ctx", "top-right"],
    ["editorOpacity", "ctx", 0.2],
    ["logoOpacity", "ctx", 0.6],
    ["applyEffects"]
  ]);
});

function createHandlers(calls) {
  return {
    async applyAllEffects() {
      calls.push(["applyAllEffects"]);
    },
    async applyNeonCustomizations(message) {
      calls.push([
        "applyNeonCustomizations",
        message.editorBackgroundOpacity,
        message.editorBackgroundFit,
        message.emptyEditorLogoOpacity
      ]);
    },
    async applySettingsBundle(bundle) {
      calls.push(["applyBundle", bundle]);
    },
    async changeThemeVariant(themeVariantId) {
      calls.push(["changeTheme", themeVariantId]);
    },
    async disableNeon() {
      calls.push(["disableNeon"]);
    },
    async downloadEditorBackgroundImage() {
      calls.push(["downloadEditor"]);
    },
    async downloadEmptyEditorLogoImage() {
      calls.push(["downloadLogo"]);
    },
    async enableNeon() {
      calls.push(["enableNeon"]);
    },
    async exportSettingsBundle() {
      calls.push(["exportFile"]);
    },
    async importSettingsBundle() {
      calls.push(["importFile"]);
      return false;
    },
    async importSettingsFromVsSync() {
      calls.push(["importVsSync"]);
      return true;
    },
    async openDocumentationLink(url) {
      calls.push(["openLink", url]);
    },
    postEffectsPendingWarning(message) {
      calls.push(["effectsPending", message]);
    },
    postNeonEffectStatus(message) {
      calls.push(["neonStatus", message]);
    },
    async postSettingsState() {
      calls.push(["state"]);
    },
    async removeEditorBackgroundImage() {
      calls.push(["removeEditor"]);
      return false;
    },
    async removeEmptyEditorLogoImage() {
      calls.push(["removeLogo"]);
      return false;
    },
    async resetAllColorCustomizations(themeVariantId) {
      calls.push(["resetAll", themeVariantId]);
    },
    async resetColorCustomization(section, id, themeVariantId) {
      calls.push(["resetColor", section, id, themeVariantId]);
    },
    async saveSettingsToVsSync() {
      calls.push(["saveSync"]);
    },
    async selectEditorBackgroundImage() {
      calls.push(["selectEditor"]);
      return false;
    },
    async selectEmptyEditorLogoImage() {
      calls.push(["selectLogo"]);
      return false;
    },
    async selectRandomNekoEditorBackgroundImage() {
      calls.push(["randomEditor"]);
    },
    async selectRandomNekoEmptyEditorLogoImage() {
      calls.push(["randomLogo"]);
    },
    setE2ETestFixtures(fixtures) {
      calls.push(["fixtures", fixtures]);
    },
    async updateColorCustomization(section, id, value, themeVariantId) {
      calls.push(["updateColor", section, id, value, themeVariantId]);
    },
    async updateEditorBackgroundFit(fit) {
      calls.push(["fit", fit]);
    },
    async updateEditorBackgroundOpacity(opacity) {
      calls.push(["editorOpacity", opacity]);
    },
    async updateEmptyEditorLogoOpacity(opacity) {
      calls.push(["logoOpacity", opacity]);
    }
  };
}
