import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  createSettingsMessageController
} = requireOut<typeof import("../../src/extensionHost/controllers/SettingsMessageController")>(
  "extensionHost",
  "controllers",
  "SettingsMessageController"
);
const {
  createSettingsCommandController
} = requireOut<typeof import("../../src/extensionHost/controllers/SettingsCommandController")>(
  "extensionHost",
  "controllers",
  "SettingsCommandController"
);
const {
  createSettingsStateService
} = requireOut<typeof import("../../src/extensionHost/services/SettingsStateService")>(
  "extensionHost",
  "services",
  "SettingsStateService"
);
const {
  createSettingsBundleService
} = requireOut<typeof import("../../src/extensionHost/services/SettingsBundleService")>(
  "extensionHost",
  "services",
  "SettingsBundleService"
);
const {
  createSettingsEffectsService
} = requireOut<typeof import("../../src/extensionHost/services/SettingsEffectsService")>(
  "extensionHost",
  "services",
  "SettingsEffectsService"
);

type Call = unknown[];
type Calls = Call[];
type TestMessage = any;

interface TestContext {
  readonly id: string;
}

interface TestWebview {
  readonly id: string;
}

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

function record(calls: Calls, ...entry: Call): void {
  calls.push(entry);
}

function getContextId(context: unknown): string {
  return (context as TestContext).id;
}

function getWebviewId(webview: unknown): string {
  return (webview as TestWebview).id;
}

test("SettingsMessageController dispatches host messages and preserves legacy payload names", async () => {
  const calls: Calls = [];
  const controller = createSettingsMessageController({
    handlers: createHandlers(calls),
    isNeonE2ETestHookEnabled: () => false,
    isSettingsE2ETestHookEnabled: () => false,
    reportError: async (error) => {
      record(calls, "error", error.message);
    },
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
  await controller.handleMessage({
    type: "apply-effects",
    features: {
      foundation: true,
      editorBackground: false,
      noPageLogo: true,
      glow: false
    },
    editorBackgroundOpacity: 0.3,
    editorBackgroundFit: "right",
    emptyEditorLogoOpacity: 0.8
  });
  await controller.handleMessage({
    type: "update-application-settings",
    openNativeWelcomePage: false,
    showEditorTabs: "multiple",
    wrapEditorTabs: true,
    openFoldersInNewWindow: true,
    restoreWindows: false
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
    ["state"],
    ["applyEffects", 0.3, "right", 0.8, {
      foundation: true,
      editorBackground: false,
      noPageLogo: true,
      glow: false
    }],
    ["state"],
    ["applicationSettings", {
      openNativeWelcomePage: false,
      showEditorTabs: "multiple",
      wrapEditorTabs: true,
      openFoldersInNewWindow: true,
      restoreWindows: false
    }],
    ["state"]
  ]);
});

test("SettingsMessageController rejects malformed application settings payloads", async () => {
  const calls: Calls = [];
  const controller = createSettingsMessageController({
    handlers: createHandlers(calls),
    isNeonE2ETestHookEnabled: () => false,
    isSettingsE2ETestHookEnabled: () => false,
    reportError: async (error) => {
      record(calls, "error", error.message);
    },
    logError: () => {}
  });

  for (const message of [
    { type: "update-application-settings", openNativeWelcomePage: true },
    {
      type: "update-application-settings",
      openNativeWelcomePage: true,
      showEditorTabs: "bad",
      wrapEditorTabs: true,
      openFoldersInNewWindow: true,
      restoreWindows: true
    },
    {
      type: "update-application-settings",
      openNativeWelcomePage: true,
      showEditorTabs: "multiple",
      wrapEditorTabs: "yes",
      openFoldersInNewWindow: true,
      restoreWindows: true
    }
  ]) {
    await controller.handleMessage(message);
  }

  assert.deepEqual(calls, []);
});

test("SettingsMessageController persists effect feature switches without posting stale state", async () => {
  const calls: Calls = [];
  const controller = createSettingsMessageController({
    handlers: createHandlers(calls),
    isNeonE2ETestHookEnabled: () => false,
    isSettingsE2ETestHookEnabled: () => false,
    reportError: async (error) => {
      record(calls, "error", error.message);
    },
    logError: () => {}
  });
  const features = {
    foundation: true,
    editorBackground: false,
    noPageLogo: true,
    glow: false
  };

  await controller.handleMessage({ type: "update-effect-features", features });

  assert.deepEqual(calls, [
    ["effectFeatures", features]
  ]);
});

test("SettingsMessageController keeps test-only message gates at the boundary", async () => {
  const calls: Calls = [];
  const controller = createSettingsMessageController({
    handlers: createHandlers(calls),
    isNeonE2ETestHookEnabled: () => false,
    isSettingsE2ETestHookEnabled: () => false,
    reportError: async (error) => {
      record(calls, "error", error.message);
    },
    logError: (methodName, error, context) => record(
      calls,
      "log",
      methodName,
      error instanceof Error ? error.message : String(error),
      (context as { message: { type: string } }).message.type
    )
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
  const calls: Calls = [];
  const handlers = createHandlers(calls);
  handlers.importSettingsFromVsSync = async () => {
    record(calls, "importVsSync");
    return false;
  };
  handlers.importSettingsBundle = async () => {
    record(calls, "importFile");
    return true;
  };
  const controller = createSettingsMessageController({
    handlers,
    isNeonE2ETestHookEnabled: () => true,
    isSettingsE2ETestHookEnabled: () => true,
    reportError: async (error) => {
      record(calls, "error", error.message);
    },
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
  const calls: Calls = [];
  const controller = createSettingsCommandController({
    configureSettingsSync: (context) => record(calls, "sync", getContextId(context)),
    openSettings: async (context, actions) => {
      record(calls, "open", getContextId(context), actions.isNeonEnabled());
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
  const calls: Calls = [];
  const stateService = createSettingsStateService({
    createState: (context, webview) => ({ contextId: getContextId(context), webviewId: getWebviewId(webview) })
  });
  const bundleService = createSettingsBundleService({
    applySettingsBundle: async (context, bundle) => {
      record(calls, "applyBundle", getContextId(context), (bundle as { schema: string }).schema);
    },
    configureSettingsSync: (context) => record(calls, "sync", getContextId(context)),
    exportSettingsBundle: async (context) => {
      record(calls, "export", getContextId(context));
    },
    importSettingsBundle: async (context) => {
      record(calls, "import", getContextId(context));
      return true;
    },
    importSettingsFromVsSync: async (context) => {
      record(calls, "importSync", getContextId(context));
      return false;
    },
    saveSettingsToVsSync: async (context) => {
      record(calls, "saveSync", getContextId(context));
    }
  });
  const effectsService = createSettingsEffectsService({
    applyAllEffects: async () => {
      record(calls, "applyEffects");
    },
    downloadEditorBackgroundImage: async (context) => {
      record(calls, "downloadEditor", getContextId(context));
    },
    downloadEmptyEditorLogoImage: async (context) => {
      record(calls, "downloadLogo", getContextId(context));
    },
    removeEditorBackgroundImage: async (context) => {
      record(calls, "removeEditor", getContextId(context));
      return true;
    },
    removeEmptyEditorLogoImage: async (context) => {
      record(calls, "removeLogo", getContextId(context));
      return false;
    },
    selectEditorBackgroundImage: async (context) => {
      record(calls, "selectEditor", getContextId(context));
      return true;
    },
    selectEmptyEditorLogoImage: async (context) => {
      record(calls, "selectLogo", getContextId(context));
      return false;
    },
    selectRandomNekoEditorBackgroundImage: async (context) => {
      record(calls, "randomEditor", getContextId(context));
    },
    selectRandomNekoEmptyEditorLogoImage: async (context) => {
      record(calls, "randomLogo", getContextId(context));
    },
    updateEditorBackgroundFit: async (context, fit) => {
      record(calls, "fit", getContextId(context), fit);
    },
    updateEditorBackgroundOpacity: async (context, opacity) => {
      record(calls, "editorOpacity", getContextId(context), opacity);
    },
    updateEmptyEditorLogoOpacity: async (context, opacity) => {
      record(calls, "logoOpacity", getContextId(context), opacity);
    }
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

function createHandlers(calls: Calls) {
  return {
    async applyAllEffects() {
      record(calls, "applyAllEffects");
    },
    async applyEffects(message: TestMessage) {
      record(
        calls,
        "applyEffects",
        message.editorBackgroundOpacity,
        message.editorBackgroundFit,
        message.emptyEditorLogoOpacity,
        message.features
      );
    },
    async applyNeonCustomizations(message: TestMessage) {
      record(
        calls,
        "applyNeonCustomizations",
        message.editorBackgroundOpacity,
        message.editorBackgroundFit,
        message.emptyEditorLogoOpacity
      );
    },
    async applySettingsBundle(bundle: unknown) {
      record(calls, "applyBundle", bundle);
    },
    async changeThemeVariant(themeVariantId: unknown) {
      record(calls, "changeTheme", themeVariantId);
    },
    async disableNeon() {
      record(calls, "disableNeon");
    },
    async downloadEditorBackgroundImage() {
      record(calls, "downloadEditor");
    },
    async downloadEmptyEditorLogoImage() {
      record(calls, "downloadLogo");
    },
    async enableNeon() {
      record(calls, "enableNeon");
    },
    async exportSettingsBundle() {
      record(calls, "exportFile");
    },
    async importSettingsBundle() {
      record(calls, "importFile");
      return false;
    },
    async importSettingsFromVsSync() {
      record(calls, "importVsSync");
      return true;
    },
    async openDocumentationLink(url: string) {
      record(calls, "openLink", url);
    },
    postEffectsPendingWarning(message: string) {
      record(calls, "effectsPending", message);
    },
    postNeonEffectStatus(message: string) {
      record(calls, "neonStatus", message);
    },
    async postSettingsState() {
      record(calls, "state");
    },
    async removeEditorBackgroundImage() {
      record(calls, "removeEditor");
      return false;
    },
    async removeEmptyEditorLogoImage() {
      record(calls, "removeLogo");
      return false;
    },
    async resetAllColorCustomizations(themeVariantId: unknown) {
      record(calls, "resetAll", themeVariantId);
    },
    async resetColorCustomization(section: string, id: unknown, themeVariantId: unknown) {
      record(calls, "resetColor", section, id, themeVariantId);
    },
    async saveSettingsToVsSync() {
      record(calls, "saveSync");
    },
    async selectEditorBackgroundImage() {
      record(calls, "selectEditor");
      return false;
    },
    async selectEmptyEditorLogoImage() {
      record(calls, "selectLogo");
      return false;
    },
    async selectRandomNekoEditorBackgroundImage() {
      record(calls, "randomEditor");
    },
    async selectRandomNekoEmptyEditorLogoImage() {
      record(calls, "randomLogo");
    },
    setE2ETestFixtures(fixtures: unknown) {
      record(calls, "fixtures", fixtures);
    },
    async updateColorCustomization(section: string, id: unknown, value: unknown, themeVariantId: unknown) {
      record(calls, "updateColor", section, id, value, themeVariantId);
    },
    async updateEditorBackgroundFit(fit: unknown) {
      record(calls, "fit", fit);
    },
    async updateEditorBackgroundOpacity(opacity: unknown) {
      record(calls, "editorOpacity", opacity);
    },
    async updateEmptyEditorLogoOpacity(opacity: unknown) {
      record(calls, "logoOpacity", opacity);
    },
    async updateApplicationSettings(settings: TestMessage) {
      record(calls, "applicationSettings", {
        openNativeWelcomePage: settings.openNativeWelcomePage,
        showEditorTabs: settings.showEditorTabs,
        wrapEditorTabs: settings.wrapEditorTabs,
        openFoldersInNewWindow: settings.openFoldersInNewWindow,
        restoreWindows: settings.restoreWindows
      });
    },
    async updateEffectFeatures(features: unknown) {
      record(calls, "effectFeatures", features);
    }
  };
}
