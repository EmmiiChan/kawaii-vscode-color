const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { createSettingsStore } = require("../../src/settingsStore");
const {
  applyColorCustomizationsExportToStore,
  applyExtensionConfigurationExportToStore,
  applySettingsBundle,
  createSettingsBundle,
  createSettingsBundleActions,
  getColorCustomizationsExportFromStore,
  getExtensionConfigurationExportFromStore,
  normalizeBrightnessSetting,
  normalizeSettingsBundle
} = require("../../src/settingsBundle");

const BRIGHTNESS_SETTING = "kawaii_synthwave.brightness";
const DISABLE_GLOW_SETTING = "kawaii_synthwave.disableGlow";
const WORKBENCH_SETTING = "workbench.colorCustomizations";
const TOKEN_SETTING = "editor.tokenColorCustomizations";
const EXPORT_FILE_NAME = "kawaii-vscode-color-settings.json";
const FIXTURES_DIR = path.resolve(__dirname, "..", "fixtures", "settings");
const darkVariant = { id: "dark", label: "Kawaii VS Code Color" };
const lightVariant = { id: "light", label: "Kawaii VS Code Color Light" };
const themeVariants = [darkVariant, lightVariant];

function readSettingsFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, fileName), "utf8"));
}

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function createWorkspaceMock(options = {}) {
  const updates = [];
  const values = clone(options.values || {});
  const inspections = clone(options.inspections || {});
  const configuration = {
    get(settingName) {
      return values[settingName];
    },
    inspect(settingName) {
      return inspections[settingName];
    },
    update(settingName, value, target) {
      updates.push({ settingName, value: clone(value), target });
      values[settingName] = clone(value);
      return Promise.resolve();
    }
  };

  return {
    settingsStore: createSettingsStore({
      getConfiguration() {
        return configuration;
      }
    }),
    updates,
    values
  };
}

function createBundleDependencies(overrides = {}) {
  const calls = [];
  const memoryFiles = new Map();
  const { settingsStore } = createWorkspaceMock();

  return {
    calls,
    memoryFiles,
    dependencies: {
      activeThemeService: {
        getActiveThemeVariant() {
          return overrides.activeThemeVariant || lightVariant;
        },
        changeThemeVariant(themeVariantId) {
          calls.push(`theme:${themeVariantId}`);
          return Promise.resolve();
        }
      },
      brightnessSetting: BRIGHTNESS_SETTING,
      disableGlowSetting: DISABLE_GLOW_SETTING,
      effectsService: {
        getEffectsExport(context) {
          calls.push(`effects-export:${context.id}`);
          return Promise.resolve(overrides.effectsExport || { editorBackground: { opacity: 0.12 } });
        },
        applyEffectsExport(context, effects) {
          calls.push(`effects-apply:${context.id}:${effects && effects.marker}`);
          return Promise.resolve();
        }
      },
      fileSystem: {
        readFile(filePath, encoding) {
          calls.push(`read:${filePath}:${encoding}`);
          return Promise.resolve(memoryFiles.get(filePath));
        },
        writeFile(filePath, content, encoding) {
          calls.push(`write:${filePath}:${encoding}`);
          memoryFiles.set(filePath, content);
          return Promise.resolve();
        }
      },
      homeDirectory() {
        return "C:\\Users\\Example";
      },
      now() {
        return new Date("2026-06-17T12:00:00.000Z");
      },
      settingsExportFileName: EXPORT_FILE_NAME,
      settingsStore: overrides.settingsStore || settingsStore,
      themeVariants,
      tokenCustomizationsSetting: TOKEN_SETTING,
      uri: {
        file(filePath) {
          return { fsPath: filePath, scheme: "file" };
        }
      },
      window: {
        informationMessages: [],
        warningMessages: [],
        openDialogResult: undefined,
        saveDialogResult: undefined,
        showInformationMessage(message) {
          this.informationMessages.push(message);
          return Promise.resolve();
        },
        showWarningMessage(message) {
          this.warningMessages.push(message);
          return Promise.resolve();
        },
        showOpenDialog() {
          return Promise.resolve(this.openDialogResult);
        },
        showSaveDialog() {
          return Promise.resolve(this.saveDialogResult);
        }
      },
      workbenchCustomizationsSetting: WORKBENCH_SETTING
    }
  };
}

test("normalizeBrightnessSetting clamps, rounds, and defaults invalid values", () => {
  assert.equal(normalizeBrightnessSetting("0.456"), 0.46);
  assert.equal(normalizeBrightnessSetting("-2"), 0);
  assert.equal(normalizeBrightnessSetting("2"), 1);
  assert.equal(normalizeBrightnessSetting("bad"), 0.45);
});

test("normalizeSettingsBundle validates schema and supported versions", () => {
  assert.throws(() => normalizeSettingsBundle(null), /Invalid Kawaii VS Code Color settings file\./);
  assert.throws(() => normalizeSettingsBundle([]), /Invalid Kawaii VS Code Color settings file\./);
  assert.throws(() => normalizeSettingsBundle({ schema: "other", schemaVersion: 1 }), /not a Kawaii VS Code Color settings export/);
  assert.throws(() => normalizeSettingsBundle({ schema: "kawaii-vscode-color-settings", schemaVersion: 2 }), /Unsupported Kawaii VS Code Color settings version: 2/);

  assert.equal(normalizeSettingsBundle({ schema: "kawaii-vscode-color-settings", schemaVersion: 1 }).schema, "kawaii-vscode-color-settings");
  assert.equal(normalizeSettingsBundle({ schema: "kawaii-synthwave-settings", schemaVersion: 1 }).schema, "kawaii-synthwave-settings");
});

test("normalizeSettingsBundle accepts current fixtures and rejects invalid fixture inputs", () => {
  const validBundle = readSettingsFixture("settings-dark-light-customized.json");
  const unsupportedVersionBundle = readSettingsFixture("settings-unsupported-version.json");
  const invalidJson = fs.readFileSync(path.join(FIXTURES_DIR, "settings-invalid-json.json"), "utf8");

  assert.equal(normalizeSettingsBundle(validBundle).activeThemeVariantId, "light");
  assert.throws(() => JSON.parse(invalidJson), SyntaxError);
  assert.throws(
    () => normalizeSettingsBundle(unsupportedVersionBundle),
    /Unsupported Kawaii VS Code Color settings version: 999/
  );
});

test("extension configuration export prefers explicit global values and falls back to effective values", () => {
  const { settingsStore } = createWorkspaceMock({
    values: {
      [BRIGHTNESS_SETTING]: 0.4,
      [DISABLE_GLOW_SETTING]: false
    },
    inspections: {
      [BRIGHTNESS_SETTING]: { globalValue: 0.8 },
      [DISABLE_GLOW_SETTING]: { globalValue: undefined }
    }
  });

  assert.deepEqual(getExtensionConfigurationExportFromStore(settingsStore, {
    brightnessSetting: BRIGHTNESS_SETTING,
    disableGlowSetting: DISABLE_GLOW_SETTING
  }), {
    brightness: 0.8,
    disableGlow: false
  });
});

test("extension configuration import writes normalized values", async () => {
  const { settingsStore, updates } = createWorkspaceMock();

  await applyExtensionConfigurationExportToStore(settingsStore, {
    brightness: 1.239,
    disableGlow: 0
  }, {
    brightnessSetting: BRIGHTNESS_SETTING,
    disableGlowSetting: DISABLE_GLOW_SETTING
  });

  assert.deepEqual(updates, [
    { settingName: BRIGHTNESS_SETTING, value: 1, target: true },
    { settingName: DISABLE_GLOW_SETTING, value: false, target: true }
  ]);
});

test("color customization export and import handle dark and light blocks while preserving unrelated customizations", async () => {
  const { settingsStore, updates } = createWorkspaceMock({
    inspections: {
      [WORKBENCH_SETTING]: {
        globalValue: {
          "[Kawaii VS Code Color]": { "editor.background": "#31202b" },
          "[Kawaii VS Code Color Light]": { "editor.background": "#ffffff" },
          "[Unrelated Theme]": { "editor.background": "#000000" }
        }
      },
      [TOKEN_SETTING]: {
        globalValue: {
          "[Kawaii VS Code Color]": { textMateRules: [{ scope: "comment" }] }
        }
      }
    }
  });
  const options = {
    themeVariants,
    workbenchCustomizationsSetting: WORKBENCH_SETTING,
    tokenCustomizationsSetting: TOKEN_SETTING
  };

  assert.deepEqual(getColorCustomizationsExportFromStore(settingsStore, options), {
    workbench: {
      dark: { "editor.background": "#31202b" },
      light: { "editor.background": "#ffffff" }
    },
    token: {
      dark: { textMateRules: [{ scope: "comment" }] },
      light: {}
    }
  });

  await applyColorCustomizationsExportToStore(settingsStore, {
    workbench: {
      dark: { "sideBar.background": "#2c1925" }
    },
    token: {
      light: { textMateRules: [{ scope: "string" }] }
    }
  }, options);

  assert.deepEqual(updates, [
    {
      settingName: WORKBENCH_SETTING,
      value: {
        "[Kawaii VS Code Color]": { "sideBar.background": "#2c1925" },
        "[Unrelated Theme]": { "editor.background": "#000000" }
      },
      target: true
    },
    {
      settingName: TOKEN_SETTING,
      value: {
        "[Kawaii VS Code Color Light]": { textMateRules: [{ scope: "string" }] }
      },
      target: true
    }
  ]);
});

test("createSettingsBundle exports active theme, configuration, colors, and effects", async () => {
  const { dependencies, calls } = createBundleDependencies();

  const bundle = await createSettingsBundle({ id: "ctx" }, dependencies);

  assert.equal(bundle.schema, "kawaii-vscode-color-settings");
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.exportedAt, "2026-06-17T12:00:00.000Z");
  assert.equal(bundle.activeThemeVariantId, "light");
  assert.equal(bundle.activeThemeLabel, "Kawaii VS Code Color Light");
  assert.deepEqual(bundle.effects, { editorBackground: { opacity: 0.12 } });
  assert.deepEqual(calls, ["effects-export:ctx"]);
});

test("createSettingsBundle exports dark/light colors and image-backed effects", async () => {
  const fixtureBundle = readSettingsFixture("settings-dark-light-customized.json");
  const { settingsStore } = createWorkspaceMock({
    values: {
      [BRIGHTNESS_SETTING]: 0.72,
      [DISABLE_GLOW_SETTING]: true
    },
    inspections: {
      [BRIGHTNESS_SETTING]: { globalValue: 0.72 },
      [DISABLE_GLOW_SETTING]: { globalValue: true },
      [WORKBENCH_SETTING]: {
        globalValue: {
          "[Kawaii VS Code Color]": fixtureBundle.colorCustomizations.workbench.dark,
          "[Kawaii VS Code Color Light]": fixtureBundle.colorCustomizations.workbench.light
        }
      },
      [TOKEN_SETTING]: {
        globalValue: {
          "[Kawaii VS Code Color]": fixtureBundle.colorCustomizations.token.dark,
          "[Kawaii VS Code Color Light]": fixtureBundle.colorCustomizations.token.light
        }
      }
    }
  });
  const { dependencies } = createBundleDependencies({
    activeThemeVariant: lightVariant,
    effectsExport: fixtureBundle.effects,
    settingsStore
  });

  const bundle = await createSettingsBundle({ id: "ctx" }, dependencies);

  assert.equal(bundle.activeThemeVariantId, "light");
  assert.deepEqual(bundle.extensionConfiguration, fixtureBundle.extensionConfiguration);
  assert.deepEqual(bundle.colorCustomizations, fixtureBundle.colorCustomizations);
  assert.equal(bundle.effects.editorBackground.image.originalName, "editor-background.png");
  assert.equal(bundle.effects.emptyEditorLogo.image.originalName, "empty-editor-logo.png");
  assert.match(bundle.effects.editorBackground.image.dataBase64, /^iVBORw0KGgo/);
});

test("applySettingsBundle applies config, colors, effects, then active theme", async () => {
  const order = [];
  const settingsStore = {
    getTargetSettingsObject() {
      return {};
    },
    updateGlobalSetting(settingName) {
      order.push(`setting:${settingName}`);
      return Promise.resolve();
    }
  };
  const { dependencies } = createBundleDependencies({
    settingsStore
  });
  dependencies.effectsService.applyEffectsExport = function applyEffectsExport() {
    order.push("effects");
    return Promise.resolve();
  };
  dependencies.activeThemeService.changeThemeVariant = function changeThemeVariant(themeVariantId) {
    order.push(`theme:${themeVariantId}`);
    return Promise.resolve();
  };

  await applySettingsBundle({ id: "ctx" }, {
    schema: "kawaii-vscode-color-settings",
    schemaVersion: 1,
    extensionConfiguration: { brightness: 0.3, disableGlow: true },
    colorCustomizations: { workbench: {}, token: {} },
    effects: { marker: "restored" },
    activeThemeVariantId: "dark"
  }, dependencies);

  assert.deepEqual(order, [
    `setting:${BRIGHTNESS_SETTING}`,
    `setting:${DISABLE_GLOW_SETTING}`,
    `setting:${WORKBENCH_SETTING}`,
    `setting:${TOKEN_SETTING}`,
    "effects",
    "theme:dark"
  ]);
});

test("applySettingsBundle restores fixture config, dark/light colors, effects, and active theme", async () => {
  const fixtureBundle = readSettingsFixture("settings-dark-light-customized.json");
  const { settingsStore, updates } = createWorkspaceMock({
    inspections: {
      [WORKBENCH_SETTING]: {
        globalValue: {
          "[Unrelated Theme]": { "editor.background": "#000000" }
        }
      },
      [TOKEN_SETTING]: {
        globalValue: {
          "[Unrelated Theme]": { textMateRules: [{ scope: "comment" }] }
        }
      }
    }
  });
  const calls = [];
  const { dependencies } = createBundleDependencies({
    settingsStore
  });

  dependencies.effectsService.applyEffectsExport = function applyEffectsExport(context, effects) {
    calls.push({
      contextId: context.id,
      editorOpacity: effects.editorBackground.opacity,
      editorFit: effects.editorBackground.fit,
      editorImage: effects.editorBackground.image.originalName,
      logoOpacity: effects.emptyEditorLogo.opacity,
      logoImage: effects.emptyEditorLogo.image.originalName
    });
    return Promise.resolve();
  };
  dependencies.activeThemeService.changeThemeVariant = function changeThemeVariant(themeVariantId) {
    calls.push(`theme:${themeVariantId}`);
    return Promise.resolve();
  };

  await applySettingsBundle({ id: "ctx" }, fixtureBundle, dependencies);

  assert.deepEqual(updates[0], { settingName: BRIGHTNESS_SETTING, value: 0.72, target: true });
  assert.deepEqual(updates[1], { settingName: DISABLE_GLOW_SETTING, value: true, target: true });
  assert.deepEqual(updates[2].value, {
    "[Unrelated Theme]": { "editor.background": "#000000" },
    "[Kawaii VS Code Color]": fixtureBundle.colorCustomizations.workbench.dark,
    "[Kawaii VS Code Color Light]": fixtureBundle.colorCustomizations.workbench.light
  });
  assert.deepEqual(updates[3].value, {
    "[Unrelated Theme]": { textMateRules: [{ scope: "comment" }] },
    "[Kawaii VS Code Color]": fixtureBundle.colorCustomizations.token.dark,
    "[Kawaii VS Code Color Light]": fixtureBundle.colorCustomizations.token.light
  });
  assert.deepEqual(calls, [
    {
      contextId: "ctx",
      editorOpacity: 0.23,
      editorFit: "left",
      editorImage: "editor-background.png",
      logoOpacity: 0.64,
      logoImage: "empty-editor-logo.png"
    },
    "theme:light"
  ]);
});

test("settings bundle actions save/import settings sync state", async () => {
  const { dependencies } = createBundleDependencies();
  const actions = createSettingsBundleActions(dependencies);
  const syncedKeys = [];
  const state = new Map();
  const context = {
    id: "ctx",
    globalState: {
      get(key) {
        return state.get(key);
      },
      setKeysForSync(keys) {
        syncedKeys.push(keys);
      },
      update(key, value) {
        state.set(key, value);
        return Promise.resolve();
      }
    }
  };

  actions.configureSettingsSync(context);
  await actions.saveSettingsToVsSync(context);

  assert.deepEqual(syncedKeys, [["kawaii_synthwave.syncedSettingsBundle"]]);
  assert.equal(state.get("kawaii_synthwave.syncedSettingsBundle").schema, "kawaii-vscode-color-settings");
  assert.deepEqual(dependencies.window.informationMessages, [
    "Kawaii VS Code Color settings saved to VS Code Settings Sync state."
  ]);

  state.clear();
  assert.equal(await actions.importSettingsFromVsSync(context), false);
  assert.deepEqual(dependencies.window.warningMessages, [
    "No Kawaii VS Code Color settings bundle was found in VS Code Settings Sync state."
  ]);
});

test("settings bundle file actions handle cancellations and read/write JSON files", async () => {
  const { dependencies, memoryFiles } = createBundleDependencies();
  const actions = createSettingsBundleActions(dependencies);
  const context = {
    id: "ctx",
    globalState: {
      get() {},
      update() {
        return Promise.resolve();
      }
    }
  };

  assert.equal(await actions.exportSettingsBundle(context), false);
  assert.equal(await actions.importSettingsBundle(context), false);

  dependencies.window.saveDialogResult = { fsPath: "C:\\Temp\\settings.json" };
  assert.equal(await actions.exportSettingsBundle(context), true);
  assert.match(memoryFiles.get("C:\\Temp\\settings.json"), /"schema": "kawaii-vscode-color-settings"/);
  assert.match(memoryFiles.get("C:\\Temp\\settings.json"), /\n$/);

  dependencies.window.openDialogResult = [{ fsPath: "C:\\Temp\\settings.json" }];
  assert.equal(await actions.importSettingsBundle(context), true);
  assert.deepEqual(dependencies.window.informationMessages.slice(-2), [
    "Kawaii VS Code Color settings exported.",
    "Kawaii VS Code Color settings imported."
  ]);
});

test("settings bundle file actions reject invalid JSON and unsupported schema versions", async () => {
  const { dependencies, memoryFiles } = createBundleDependencies();
  const actions = createSettingsBundleActions(dependencies);
  const context = {
    id: "ctx",
    globalState: {
      get() {},
      update() {
        return Promise.resolve();
      }
    }
  };

  memoryFiles.set("C:\\Temp\\invalid.json", fs.readFileSync(path.join(FIXTURES_DIR, "settings-invalid-json.json"), "utf8"));
  dependencies.window.openDialogResult = [{ fsPath: "C:\\Temp\\invalid.json" }];
  await assert.rejects(
    actions.importSettingsBundle(context),
    SyntaxError
  );

  memoryFiles.set(
    "C:\\Temp\\unsupported.json",
    fs.readFileSync(path.join(FIXTURES_DIR, "settings-unsupported-version.json"), "utf8")
  );
  dependencies.window.openDialogResult = [{ fsPath: "C:\\Temp\\unsupported.json" }];
  await assert.rejects(
    actions.importSettingsBundle(context),
    /Unsupported Kawaii VS Code Color settings version: 999/
  );
});
