import assert = require("node:assert/strict");
import fs = require("node:fs");
import path = require("node:path");
import test = require("node:test");

type SettingsStoreModule = typeof import("../../src/settingsStore");
type SettingsBundleModule = typeof import("../../src/settingsBundle");
type PlainRecord = Record<string, any>;
type SettingsStore = ReturnType<SettingsStoreModule["createSettingsStore"]>;
type SettingsBundleActions = ReturnType<SettingsBundleModule["createSettingsBundleActions"]>;
type ChainActionName = "saveVSSync" | "importVSSync" | "exportAs" | "import";

interface ThemeVariant {
  readonly id: string;
  readonly label: string;
  readonly legacyLabels?: readonly string[];
}

interface WorkspaceUpdate {
  readonly settingName: string;
  readonly value: unknown;
  readonly target: boolean;
}

interface WorkspaceMockOptions {
  readonly values?: PlainRecord;
  readonly inspections?: PlainRecord;
}

interface WorkspaceMock {
  readonly settingsStore: SettingsStore;
  readonly updates: WorkspaceUpdate[];
  readonly values: PlainRecord;
}

interface TestUri {
  readonly fsPath: string;
  readonly scheme?: string;
}

interface TestWindow {
  readonly informationMessages: string[];
  readonly warningMessages: string[];
  openDialogResult: TestUri[] | undefined;
  saveDialogResult: TestUri | undefined;
  showInformationMessage(message: string): Promise<void>;
  showWarningMessage(message: string): Promise<void>;
  showOpenDialog(): Promise<TestUri[] | undefined>;
  showSaveDialog(): Promise<TestUri | undefined>;
}

interface TestContext {
  readonly id: string;
  readonly globalState: {
    get(key: string): unknown;
    setKeysForSync?(keys: string[]): void;
    update(key: string, value?: unknown): Promise<void> | void;
  };
}

interface BundleDependencies {
  readonly activeThemeService: {
    getActiveThemeVariant(): ThemeVariant;
    changeThemeVariant(themeVariantId: unknown): Promise<void> | void;
  };
  readonly brightnessSetting: string;
  readonly disableGlowSetting: string;
  readonly effectsService: {
    getEffectsExport(context: TestContext): Promise<unknown> | unknown;
    applyEffectsExport(context: TestContext, effects: any): Promise<void> | void;
  };
  readonly fileSystem: {
    readFile(filePath: string, encoding: BufferEncoding): Promise<string>;
    writeFile(filePath: string, content: string, encoding: BufferEncoding): Promise<void>;
  };
  readonly homeDirectory: () => string;
  readonly now: () => Date;
  readonly settingsExportFileName: string;
  settingsStore: SettingsStore | any;
  readonly themeVariants: readonly ThemeVariant[];
  readonly tokenCustomizationsSetting: string;
  readonly uri: {
    file(filePath: string): TestUri;
  };
  readonly window: TestWindow;
  readonly workbenchCustomizationsSetting: string;
}

interface BundleDependencyHarness {
  readonly calls: any[];
  readonly memoryFiles: Map<string, any>;
  readonly dependencies: BundleDependencies;
}

interface BundleSnapshot {
  readonly activeThemeVariantId: string;
  readonly applicationSettings: ApplicationSettingsSnapshot;
  readonly extensionConfiguration: {
    readonly brightness: number;
    readonly disableGlow: boolean;
  };
  readonly colorCustomizations: {
    readonly workbench: {
      readonly dark: PlainRecord;
      readonly light: PlainRecord;
    };
    readonly token: {
      readonly dark: PlainRecord;
      readonly light: PlainRecord;
    };
  };
  readonly effects: PlainRecord;
  readonly unrelatedWorkbench: PlainRecord;
  readonly unrelatedToken: PlainRecord;
}

interface BundleSnapshotOverrides {
  readonly activeThemeVariantId?: string;
  readonly applicationSettings?: ApplicationSettingsSnapshot;
  readonly brightness?: number;
  readonly disableGlow?: boolean;
  readonly editorBackgroundOpacity?: number;
  readonly editorBackgroundFit?: string;
  readonly emptyEditorLogoOpacity?: number;
}

interface BundleOverrides {
  readonly activeThemeVariant?: ThemeVariant;
  readonly effectsExport?: unknown;
  readonly settingsStore?: SettingsStore | any;
}

interface ApplicationSettingsSnapshot {
  readonly startupEditor: string;
  readonly editorShowTabs: string;
  readonly editorWrapTabs: boolean;
  readonly openFoldersInNewWindow: string;
  readonly restoreWindows: string;
}

interface StatefulBundleHarness {
  readonly actions: SettingsBundleActions;
  readonly applySnapshot: (snapshot: BundleSnapshot) => void;
  readonly calls: any[];
  readonly context: TestContext;
  readonly dependencies: BundleDependencies;
  readonly memoryFiles: Map<string, any>;
  readonly settingValues: Map<string, any>;
  readonly syncedState: Map<string, any>;
}

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

const { createSettingsStore } = requireOut<SettingsStoreModule>("settingsStore");
const {
  applyColorCustomizationsExportToStore,
  applyApplicationSettingsExportToStore,
  applyExtensionConfigurationExportToStore,
  applySettingsBundle,
  createSettingsBundle,
  createSettingsBundleActions,
  getColorCustomizationsExportFromStore,
  getApplicationSettingsExportFromStore,
  getExtensionConfigurationExportFromStore,
  incrementColorVersion,
  normalizeBrightnessSetting,
  normalizeColorVersion,
  normalizeSettingsBundle
} = requireOut<SettingsBundleModule>("settingsBundle");

const BRIGHTNESS_SETTING = "kawaii_synthwave.brightness";
const DISABLE_GLOW_SETTING = "kawaii_synthwave.disableGlow";
const WORKBENCH_SETTING = "workbench.colorCustomizations";
const TOKEN_SETTING = "editor.tokenColorCustomizations";
const STARTUP_EDITOR_SETTING = "workbench.startupEditor";
const EDITOR_SHOW_TABS_SETTING = "workbench.editor.showTabs";
const EDITOR_WRAP_TABS_SETTING = "workbench.editor.wrapTabs";
const OPEN_FOLDERS_IN_NEW_WINDOW_SETTING = "window.openFoldersInNewWindow";
const RESTORE_WINDOWS_SETTING = "window.restoreWindows";
const SYNC_SETTINGS_STATE_KEY = "kawaii_synthwave.syncedSettingsBundle";
const COLOR_EXPORT_VERSION_STATE_KEY = "kawaii_synthwave.colorExportVersion";
const EXPORT_FILE_NAME = "kawaii-vscode-color-settings.json";
const FIXTURES_DIR = path.join(process.cwd(), "test", "fixtures", "settings");
const darkVariant: ThemeVariant = { id: "dark", label: "Dark Pink Kawaii", legacyLabels: ["Kawaii VS Code Color"] };
const lightVariant: ThemeVariant = { id: "light", label: "Light Pink-Pastel Kawaii", legacyLabels: ["Kawaii VS Code Color Light"] };
const themeVariants: readonly ThemeVariant[] = [darkVariant, lightVariant];

function readSettingsFixture(fileName: string): PlainRecord {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, fileName), "utf8")) as PlainRecord;
}

function clone<T>(value: T): T {
  if (value === undefined) {
    return undefined as T;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function createWorkspaceMock(options: WorkspaceMockOptions = {}): WorkspaceMock {
  const updates: WorkspaceUpdate[] = [];
  const values = clone(options.values || {});
  const inspections = clone(options.inspections || {});
  const configuration = {
    get(settingName: string): unknown {
      return values[settingName];
    },
    inspect(settingName: string): PlainRecord | undefined {
      return inspections[settingName];
    },
    update(settingName: string, value: unknown, target: boolean): Promise<void> {
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

function createBundleDependencies(overrides: BundleOverrides = {}): BundleDependencyHarness {
  const calls: any[] = [];
  const memoryFiles = new Map<string, any>();
  const { settingsStore } = createWorkspaceMock();

  return {
    calls,
    memoryFiles,
    dependencies: {
      activeThemeService: {
        getActiveThemeVariant() {
          return overrides.activeThemeVariant || lightVariant;
        },
        changeThemeVariant(themeVariantId: unknown) {
          calls.push(`theme:${themeVariantId}`);
          return Promise.resolve();
        }
      },
      brightnessSetting: BRIGHTNESS_SETTING,
      disableGlowSetting: DISABLE_GLOW_SETTING,
      effectsService: {
        getEffectsExport(context: TestContext) {
          calls.push(`effects-export:${context.id}`);
          return Promise.resolve(overrides.effectsExport || { editorBackground: { opacity: 0.12 } });
        },
        applyEffectsExport(context: TestContext, effects: any) {
          calls.push(`effects-apply:${context.id}:${effects && effects.marker}`);
          return Promise.resolve();
        }
      },
      fileSystem: {
        readFile(filePath: string, encoding: BufferEncoding) {
          calls.push(`read:${filePath}:${encoding}`);
          return Promise.resolve(memoryFiles.get(filePath) as string);
        },
        writeFile(filePath: string, content: string, encoding: BufferEncoding) {
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
        file(filePath: string) {
          return { fsPath: filePath, scheme: "file" };
        }
      },
      window: {
        informationMessages: [],
        warningMessages: [],
        openDialogResult: undefined,
        saveDialogResult: undefined,
        showInformationMessage(message: string) {
          this.informationMessages.push(message);
          return Promise.resolve();
        },
        showWarningMessage(message: string) {
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

function createStatefulBundleHarness(initialSnapshot: BundleSnapshot): StatefulBundleHarness {
  const calls: any[] = [];
  const memoryFiles = new Map<string, any>();
  const syncedState = new Map<string, any>();
  const settingValues = new Map<string, any>();
  let activeThemeVariantId = initialSnapshot.activeThemeVariantId;
  let effectsState = clone(initialSnapshot.effects);

  function setSettingValue(settingName: string, value: unknown): void {
    if (value === undefined) {
      settingValues.delete(settingName);
      return;
    }

    settingValues.set(settingName, clone(value));
  }

  function applySnapshot(snapshot: BundleSnapshot): void {
    activeThemeVariantId = snapshot.activeThemeVariantId;
    effectsState = clone(snapshot.effects);
    setSettingValue(STARTUP_EDITOR_SETTING, snapshot.applicationSettings.startupEditor);
    setSettingValue(EDITOR_SHOW_TABS_SETTING, snapshot.applicationSettings.editorShowTabs);
    setSettingValue(EDITOR_WRAP_TABS_SETTING, snapshot.applicationSettings.editorWrapTabs);
    setSettingValue(OPEN_FOLDERS_IN_NEW_WINDOW_SETTING, snapshot.applicationSettings.openFoldersInNewWindow);
    setSettingValue(RESTORE_WINDOWS_SETTING, snapshot.applicationSettings.restoreWindows);
    setSettingValue(BRIGHTNESS_SETTING, snapshot.extensionConfiguration.brightness);
    setSettingValue(DISABLE_GLOW_SETTING, snapshot.extensionConfiguration.disableGlow);
    setSettingValue(WORKBENCH_SETTING, createThemeSettingsObject(snapshot.colorCustomizations.workbench, snapshot.unrelatedWorkbench));
    setSettingValue(TOKEN_SETTING, createThemeSettingsObject(snapshot.colorCustomizations.token, snapshot.unrelatedToken));
  }

  const settingsStore = createSettingsStore({
    getConfiguration() {
      return {
        get(settingName: string) {
          return clone(settingValues.get(settingName));
        },
        inspect(settingName: string) {
          return {
            globalValue: clone(settingValues.get(settingName)),
            workspaceValue: undefined
          };
        },
        update(settingName: string, value: unknown) {
          setSettingValue(settingName, value);
          return Promise.resolve();
        }
      };
    }
  });

  const dependencies: BundleDependencies = {
    activeThemeService: {
      getActiveThemeVariant() {
        return themeVariants.find((variant) => variant.id === activeThemeVariantId) || darkVariant;
      },
      changeThemeVariant(themeVariantId: unknown) {
        calls.push(`theme:${themeVariantId}`);
        activeThemeVariantId = String(themeVariantId);
        return Promise.resolve();
      }
    },
    brightnessSetting: BRIGHTNESS_SETTING,
    disableGlowSetting: DISABLE_GLOW_SETTING,
    effectsService: {
      getEffectsExport(context: TestContext) {
        calls.push(`effects-export:${context.id}`);
        return Promise.resolve(clone(effectsState));
      },
      applyEffectsExport(context: TestContext, effects: any) {
        calls.push(`effects-apply:${context.id}:${effects && effects.marker}`);
        effectsState = clone(effects);
        return Promise.resolve();
      }
    },
    fileSystem: {
      readFile(filePath: string, encoding: BufferEncoding) {
        calls.push(`read:${filePath}:${encoding}`);
        return Promise.resolve(memoryFiles.get(filePath) as string);
      },
      writeFile(filePath: string, content: string, encoding: BufferEncoding) {
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
    settingsStore,
    themeVariants,
    tokenCustomizationsSetting: TOKEN_SETTING,
    uri: {
      file(filePath: string) {
        return { fsPath: filePath, scheme: "file" };
      }
    },
    window: {
      informationMessages: [],
      warningMessages: [],
      openDialogResult: undefined,
      saveDialogResult: undefined,
      showInformationMessage(message: string) {
        this.informationMessages.push(message);
        return Promise.resolve();
      },
      showWarningMessage(message: string) {
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
  };
  const context: TestContext = {
    id: "ctx",
    globalState: {
      get(key: string) {
        return syncedState.get(key);
      },
      setKeysForSync(keys: string[]) {
        calls.push(`sync-keys:${keys.join(",")}`);
      },
      update(key: string, value?: unknown) {
        if (value === undefined) {
          syncedState.delete(key);
        } else {
          syncedState.set(key, clone(value));
        }

        return Promise.resolve();
      }
    }
  };

  applySnapshot(initialSnapshot);

  return {
    actions: createSettingsBundleActions(dependencies),
    applySnapshot,
    calls,
    context,
    dependencies,
    memoryFiles,
    settingValues,
    syncedState
  };
}

function createThemeSettingsObject(blocks: Record<string, PlainRecord>, unrelatedBlock?: PlainRecord): PlainRecord {
  const settings: PlainRecord = {};

  settings["[Dark Pink Kawaii]"] = clone(blocks.dark || {});
  settings["[Light Pink-Pastel Kawaii]"] = clone(blocks.light || {});

  if (unrelatedBlock) {
    settings["[Unrelated Theme]"] = clone(unrelatedBlock);
  }

  return settings;
}

function createBundleSnapshot(marker: string, overrides: BundleSnapshotOverrides = {}): BundleSnapshot {
  return {
    activeThemeVariantId: overrides.activeThemeVariantId || "dark",
    applicationSettings: overrides.applicationSettings || {
      startupEditor: "welcomePage",
      editorShowTabs: "multiple",
      editorWrapTabs: true,
      openFoldersInNewWindow: "on",
      restoreWindows: "preserve"
    },
    extensionConfiguration: {
      brightness: overrides.brightness === undefined ? 0.21 : overrides.brightness,
      disableGlow: Boolean(overrides.disableGlow)
    },
    colorCustomizations: {
      workbench: {
        dark: {
          "editor.background": `#${marker}1111`,
          "sideBar.background": `#${marker}2222`
        },
        light: {
          "editor.background": `#${marker}eeee`
        }
      },
      token: {
        dark: {
          textMateRules: [
            {
              scope: "keyword",
              settings: {
                foreground: `#${marker}3333`
              }
            }
          ]
        },
        light: {
          textMateRules: [
            {
              scope: "string",
              settings: {
                foreground: `#${marker}4444`
              }
            }
          ]
        }
      }
    },
    effects: {
      marker,
      editorBackground: {
        opacity: overrides.editorBackgroundOpacity === undefined ? 0.11 : overrides.editorBackgroundOpacity,
        fit: overrides.editorBackgroundFit || "top",
        image: {
          originalName: `${marker}-editor-background.png`
        }
      },
      emptyEditorLogo: {
        opacity: overrides.emptyEditorLogoOpacity === undefined ? 0.51 : overrides.emptyEditorLogoOpacity,
        image: {
          originalName: `${marker}-empty-editor-logo.png`
        }
      }
    },
    unrelatedWorkbench: {
      "editor.background": `#${marker}9999`
    },
    unrelatedToken: {
      textMateRules: [
        {
          scope: "comment",
          settings: {
            foreground: `#${marker}8888`
          }
        }
      ]
    }
  };
}

async function assertCurrentBundleMatches(harness: StatefulBundleHarness, expectedSnapshot: BundleSnapshot): Promise<void> {
  const bundle = await harness.actions.createSettingsBundle(harness.context);

  assertBundleMatchesSnapshot(bundle, expectedSnapshot);
}

function assertBundleMatchesSnapshot(bundle: any, expectedSnapshot: BundleSnapshot): void {
  assert.equal(bundle.schema, "kawaii-vscode-color-settings");
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.activeThemeVariantId, expectedSnapshot.activeThemeVariantId);
  assert.deepEqual(bundle.applicationSettings, expectedSnapshot.applicationSettings);
  assert.deepEqual(bundle.extensionConfiguration, expectedSnapshot.extensionConfiguration);
  assert.deepEqual(bundle.colorCustomizations, expectedSnapshot.colorCustomizations);
  assert.deepEqual(bundle.effects, expectedSnapshot.effects);
}

function assertUnrelatedThemeBlocksMatch(harness: StatefulBundleHarness, expectedSnapshot: BundleSnapshot): void {
  assert.deepEqual(
    harness.settingValues.get(WORKBENCH_SETTING)["[Unrelated Theme]"],
    expectedSnapshot.unrelatedWorkbench
  );
  assert.deepEqual(
    harness.settingValues.get(TOKEN_SETTING)["[Unrelated Theme]"],
    expectedSnapshot.unrelatedToken
  );
}

function createActionSequences(actionNames: readonly ChainActionName[], length: number): ChainActionName[][] {
  if (length === 0) {
    return [[]];
  }

  return createActionSequences(actionNames, length - 1).flatMap((sequence) => (
    actionNames.map((actionName) => sequence.concat(actionName))
  ));
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
  assert.deepEqual(normalizeSettingsBundle({ schema: "kawaii-vscode-color-settings", schemaVersion: 1 }).colorVersion, {
    major: 0,
    minor: 0,
    patch: 1
  });
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

test("color export version normalizes and increments as a bounded numeric triplet", () => {
  assert.deepEqual(normalizeColorVersion(undefined), { major: 0, minor: 0, patch: 1 });
  assert.deepEqual(normalizeColorVersion({ major: 7, minor: 8, patch: 9 }), { major: 7, minor: 8, patch: 9 });
  assert.deepEqual(normalizeColorVersion({ major: 1, minor: 1000, patch: 0 }), { major: 0, minor: 0, patch: 1 });
  assert.deepEqual(incrementColorVersion({ major: 0, minor: 0, patch: 1 }), { major: 0, minor: 0, patch: 2 });
  assert.deepEqual(incrementColorVersion({ major: 0, minor: 0, patch: 999 }), { major: 0, minor: 1, patch: 0 });
  assert.deepEqual(incrementColorVersion({ major: 0, minor: 999, patch: 999 }), { major: 1, minor: 0, patch: 0 });
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

test("application settings export preserves explicit VS Code values", () => {
  const { settingsStore } = createWorkspaceMock({
    values: {
      [STARTUP_EDITOR_SETTING]: "readme",
      [EDITOR_SHOW_TABS_SETTING]: "single",
      [EDITOR_WRAP_TABS_SETTING]: false,
      [OPEN_FOLDERS_IN_NEW_WINDOW_SETTING]: "default",
      [RESTORE_WINDOWS_SETTING]: "preserve"
    }
  });

  assert.deepEqual(getApplicationSettingsExportFromStore(settingsStore), {
    startupEditor: "readme",
    editorShowTabs: "single",
    editorWrapTabs: false,
    openFoldersInNewWindow: "default",
    restoreWindows: "preserve"
  });
});

test("application settings import writes valid values and skips invalid partial fields", async () => {
  const { settingsStore, updates } = createWorkspaceMock();

  await applyApplicationSettingsExportToStore(settingsStore, {
    startupEditor: "welcomePage",
    editorShowTabs: "none",
    editorWrapTabs: true,
    openFoldersInNewWindow: "off",
    restoreWindows: "one"
  });

  assert.deepEqual(updates, [
    { settingName: STARTUP_EDITOR_SETTING, value: "welcomePage", target: true },
    { settingName: EDITOR_SHOW_TABS_SETTING, value: "none", target: true },
    { settingName: EDITOR_WRAP_TABS_SETTING, value: true, target: true },
    { settingName: OPEN_FOLDERS_IN_NEW_WINDOW_SETTING, value: "off", target: true },
    { settingName: RESTORE_WINDOWS_SETTING, value: "one", target: true }
  ]);

  updates.length = 0;
  await applyApplicationSettingsExportToStore(settingsStore, {
    startupEditor: "unsupported-startup-editor",
    editorShowTabs: "tabs",
    editorWrapTabs: "true",
    openFoldersInNewWindow: "maybe",
    restoreWindows: 1
  });

  assert.deepEqual(updates, []);
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
        "[Dark Pink Kawaii]": { "sideBar.background": "#2c1925" },
        "[Unrelated Theme]": { "editor.background": "#000000" }
      },
      target: true
    },
    {
      settingName: TOKEN_SETTING,
      value: {
        "[Light Pink-Pastel Kawaii]": { textMateRules: [{ scope: "string" }] }
      },
      target: true
    }
  ]);
});

test("createSettingsBundle exports active theme, application settings, configuration, colors, and effects", async () => {
  const { settingsStore } = createWorkspaceMock({
    values: {
      [STARTUP_EDITOR_SETTING]: "welcomePage",
      [EDITOR_SHOW_TABS_SETTING]: "multiple",
      [EDITOR_WRAP_TABS_SETTING]: true,
      [OPEN_FOLDERS_IN_NEW_WINDOW_SETTING]: "on",
      [RESTORE_WINDOWS_SETTING]: "folders"
    }
  });
  const { dependencies, calls } = createBundleDependencies({
    settingsStore
  });

  const bundle = await createSettingsBundle({ id: "ctx" }, dependencies) as any;

  assert.equal(bundle.schema, "kawaii-vscode-color-settings");
  assert.equal(bundle.schemaVersion, 1);
  assert.deepEqual(bundle.colorVersion, { major: 0, minor: 0, patch: 1 });
  assert.equal(bundle.exportedAt, "2026-06-17T12:00:00.000Z");
  assert.equal(bundle.activeThemeVariantId, "light");
  assert.equal(bundle.activeThemeLabel, "Light Pink-Pastel Kawaii");
  assert.deepEqual(bundle.applicationSettings, {
    startupEditor: "welcomePage",
    editorShowTabs: "multiple",
    editorWrapTabs: true,
    openFoldersInNewWindow: "on",
    restoreWindows: "folders"
  });
  assert.deepEqual(bundle.effects, { editorBackground: { opacity: 0.12 } });
  assert.deepEqual(calls, ["effects-export:ctx"]);
});

test("createSettingsBundle exports dark/light colors and image-backed effects", async () => {
  const fixtureBundle = readSettingsFixture("settings-dark-light-customized.json");
  const { settingsStore } = createWorkspaceMock({
    values: {
      [STARTUP_EDITOR_SETTING]: fixtureBundle.applicationSettings.startupEditor,
      [EDITOR_SHOW_TABS_SETTING]: fixtureBundle.applicationSettings.editorShowTabs,
      [EDITOR_WRAP_TABS_SETTING]: fixtureBundle.applicationSettings.editorWrapTabs,
      [OPEN_FOLDERS_IN_NEW_WINDOW_SETTING]: fixtureBundle.applicationSettings.openFoldersInNewWindow,
      [RESTORE_WINDOWS_SETTING]: fixtureBundle.applicationSettings.restoreWindows,
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

  const bundle = await createSettingsBundle({ id: "ctx" }, dependencies) as any;

  assert.equal(bundle.activeThemeVariantId, "light");
  assert.deepEqual(bundle.applicationSettings, fixtureBundle.applicationSettings);
  assert.deepEqual(bundle.extensionConfiguration, fixtureBundle.extensionConfiguration);
  assert.deepEqual(bundle.colorCustomizations, fixtureBundle.colorCustomizations);
  assert.equal(bundle.effects.editorBackground.image.originalName, "editor-background.png");
  assert.equal(bundle.effects.emptyEditorLogo.image.originalName, "empty-editor-logo.png");
  assert.match(bundle.effects.editorBackground.image.dataBase64, /^iVBORw0KGgo/);
});

test("applySettingsBundle applies config, application settings, colors, effects, then active theme", async () => {
  const order: string[] = [];
  const settingsStore = {
    getTargetSettingsObject() {
      return {};
    },
    updateGlobalSetting(settingName: string) {
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
  dependencies.activeThemeService.changeThemeVariant = function changeThemeVariant(themeVariantId: unknown) {
    order.push(`theme:${themeVariantId}`);
    return Promise.resolve();
  };

  await applySettingsBundle({ id: "ctx" }, {
    schema: "kawaii-vscode-color-settings",
    schemaVersion: 1,
    applicationSettings: {
      startupEditor: "welcomePage",
      editorShowTabs: "multiple",
      editorWrapTabs: true,
      openFoldersInNewWindow: "on",
      restoreWindows: "preserve"
    },
    extensionConfiguration: { brightness: 0.3, disableGlow: true },
    colorCustomizations: { workbench: {}, token: {} },
    effects: { marker: "restored" },
    activeThemeVariantId: "dark"
  }, dependencies);

  assert.deepEqual(order, [
    `setting:${BRIGHTNESS_SETTING}`,
    `setting:${DISABLE_GLOW_SETTING}`,
    `setting:${STARTUP_EDITOR_SETTING}`,
    `setting:${EDITOR_SHOW_TABS_SETTING}`,
    `setting:${EDITOR_WRAP_TABS_SETTING}`,
    `setting:${OPEN_FOLDERS_IN_NEW_WINDOW_SETTING}`,
    `setting:${RESTORE_WINDOWS_SETTING}`,
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
  const calls: any[] = [];
  const { dependencies } = createBundleDependencies({
    settingsStore
  });

  dependencies.effectsService.applyEffectsExport = function applyEffectsExport(context: TestContext, effects: any) {
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
  dependencies.activeThemeService.changeThemeVariant = function changeThemeVariant(themeVariantId: unknown) {
    calls.push(`theme:${themeVariantId}`);
    return Promise.resolve();
  };

  await applySettingsBundle({ id: "ctx" }, fixtureBundle, dependencies);

  assert.deepEqual(updates[0], { settingName: BRIGHTNESS_SETTING, value: 0.72, target: true });
  assert.deepEqual(updates[1], { settingName: DISABLE_GLOW_SETTING, value: true, target: true });
  assert.deepEqual(updates.slice(2, 7), [
    { settingName: STARTUP_EDITOR_SETTING, value: fixtureBundle.applicationSettings.startupEditor, target: true },
    { settingName: EDITOR_SHOW_TABS_SETTING, value: fixtureBundle.applicationSettings.editorShowTabs, target: true },
    { settingName: EDITOR_WRAP_TABS_SETTING, value: fixtureBundle.applicationSettings.editorWrapTabs, target: true },
    { settingName: OPEN_FOLDERS_IN_NEW_WINDOW_SETTING, value: fixtureBundle.applicationSettings.openFoldersInNewWindow, target: true },
    { settingName: RESTORE_WINDOWS_SETTING, value: fixtureBundle.applicationSettings.restoreWindows, target: true }
  ]);
  assert.deepEqual(updates[7]?.value, {
    "[Unrelated Theme]": { "editor.background": "#000000" },
    "[Dark Pink Kawaii]": fixtureBundle.colorCustomizations.workbench.dark,
    "[Light Pink-Pastel Kawaii]": fixtureBundle.colorCustomizations.workbench.light
  });
  assert.deepEqual(updates[8]?.value, {
    "[Unrelated Theme]": { textMateRules: [{ scope: "comment" }] },
    "[Dark Pink Kawaii]": fixtureBundle.colorCustomizations.token.dark,
    "[Light Pink-Pastel Kawaii]": fixtureBundle.colorCustomizations.token.light
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

test("applySettingsBundle leaves application settings untouched for legacy bundles", async () => {
  const { settingsStore, values, updates } = createWorkspaceMock({
    values: {
      [STARTUP_EDITOR_SETTING]: "readme",
      [EDITOR_SHOW_TABS_SETTING]: "single",
      [EDITOR_WRAP_TABS_SETTING]: false,
      [OPEN_FOLDERS_IN_NEW_WINDOW_SETTING]: "default",
      [RESTORE_WINDOWS_SETTING]: "preserve"
    }
  });
  const { dependencies } = createBundleDependencies({
    settingsStore
  });

  await applySettingsBundle({ id: "ctx" }, {
    schema: "kawaii-vscode-color-settings",
    schemaVersion: 1,
    extensionConfiguration: {},
    colorCustomizations: { workbench: {}, token: {} },
    effects: { marker: "legacy" }
  }, dependencies);

  assert.deepEqual({
    startupEditor: values[STARTUP_EDITOR_SETTING],
    editorShowTabs: values[EDITOR_SHOW_TABS_SETTING],
    editorWrapTabs: values[EDITOR_WRAP_TABS_SETTING],
    openFoldersInNewWindow: values[OPEN_FOLDERS_IN_NEW_WINDOW_SETTING],
    restoreWindows: values[RESTORE_WINDOWS_SETTING]
  }, {
    startupEditor: "readme",
    editorShowTabs: "single",
    editorWrapTabs: false,
    openFoldersInNewWindow: "default",
    restoreWindows: "preserve"
  });
  assert.equal(updates.some((update) => [
    STARTUP_EDITOR_SETTING,
    EDITOR_SHOW_TABS_SETTING,
    EDITOR_WRAP_TABS_SETTING,
    OPEN_FOLDERS_IN_NEW_WINDOW_SETTING,
    RESTORE_WINDOWS_SETTING
  ].includes(update.settingName)), false);
});

test("settings bundle actions save/import settings sync state", async () => {
  const { dependencies } = createBundleDependencies();
  const actions = createSettingsBundleActions(dependencies);
  const syncedKeys: string[][] = [];
  const state = new Map<string, any>();
  const context: TestContext = {
    id: "ctx",
    globalState: {
      get(key: string) {
        return state.get(key);
      },
      setKeysForSync(keys: string[]) {
        syncedKeys.push(keys);
      },
      update(key: string, value?: unknown) {
        state.set(key, value);
        return Promise.resolve();
      }
    }
  };

  actions.configureSettingsSync(context);
  await actions.saveSettingsToVsSync(context);

  assert.deepEqual(syncedKeys, [[SYNC_SETTINGS_STATE_KEY, COLOR_EXPORT_VERSION_STATE_KEY]]);
  assert.deepEqual(state.get(COLOR_EXPORT_VERSION_STATE_KEY), { major: 0, minor: 0, patch: 1 });
  assert.equal(state.get(SYNC_SETTINGS_STATE_KEY).schema, "kawaii-vscode-color-settings");
  assert.deepEqual(state.get(SYNC_SETTINGS_STATE_KEY).colorVersion, { major: 0, minor: 0, patch: 1 });

  await actions.saveSettingsToVsSync(context);

  assert.deepEqual(state.get(COLOR_EXPORT_VERSION_STATE_KEY), { major: 0, minor: 0, patch: 2 });
  assert.deepEqual(state.get(SYNC_SETTINGS_STATE_KEY).colorVersion, { major: 0, minor: 0, patch: 2 });
  assert.deepEqual(dependencies.window.informationMessages, [
    "Kawaii VS Code Color settings saved to VS Code Settings Sync state.",
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
  const context: TestContext = {
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

test("settings sync and file actions restore complete snapshots across chained operations", async () => {
  const snapshotA = createBundleSnapshot("aa", {
    activeThemeVariantId: "dark",
    applicationSettings: {
      startupEditor: "welcomePage",
      editorShowTabs: "multiple",
      editorWrapTabs: true,
      openFoldersInNewWindow: "on",
      restoreWindows: "preserve"
    },
    brightness: 0.21,
    disableGlow: false,
    editorBackgroundOpacity: 0.11,
    editorBackgroundFit: "top",
    emptyEditorLogoOpacity: 0.51
  });
  const snapshotB = createBundleSnapshot("bb", {
    activeThemeVariantId: "light",
    applicationSettings: {
      startupEditor: "none",
      editorShowTabs: "single",
      editorWrapTabs: false,
      openFoldersInNewWindow: "off",
      restoreWindows: "none"
    },
    brightness: 0.82,
    disableGlow: true,
    editorBackgroundOpacity: 0.22,
    editorBackgroundFit: "bottom-right",
    emptyEditorLogoOpacity: 0.62
  });
  const snapshotC = createBundleSnapshot("cc", {
    activeThemeVariantId: "dark",
    applicationSettings: {
      startupEditor: "readme",
      editorShowTabs: "none",
      editorWrapTabs: true,
      openFoldersInNewWindow: "default",
      restoreWindows: "one"
    },
    brightness: 0.43,
    disableGlow: true,
    editorBackgroundOpacity: 0.33,
    editorBackgroundFit: "left",
    emptyEditorLogoOpacity: 0.73
  });
  const harness = createStatefulBundleHarness(snapshotA);
  const exportPath = "C:\\Temp\\snapshot-b.json";

  await assertCurrentBundleMatches(harness, snapshotA);
  await harness.actions.saveSettingsToVsSync(harness.context);

  const syncedSnapshotA = harness.syncedState.get(SYNC_SETTINGS_STATE_KEY);
  assertBundleMatchesSnapshot(syncedSnapshotA, snapshotA);

  harness.applySnapshot(snapshotB);
  harness.dependencies.window.saveDialogResult = { fsPath: exportPath };
  assert.equal(await harness.actions.exportSettingsBundle(harness.context), true);
  assertBundleMatchesSnapshot(JSON.parse(harness.memoryFiles.get(exportPath)), snapshotB);

  harness.applySnapshot(snapshotC);
  await assertCurrentBundleMatches(harness, snapshotC);

  assert.equal(await harness.actions.importSettingsFromVsSync(harness.context), true);
  await assertCurrentBundleMatches(harness, snapshotA);
  assertUnrelatedThemeBlocksMatch(harness, snapshotC);

  harness.dependencies.window.openDialogResult = [{ fsPath: exportPath }];
  assert.equal(await harness.actions.importSettingsBundle(harness.context), true);
  await assertCurrentBundleMatches(harness, snapshotB);
  assertUnrelatedThemeBlocksMatch(harness, snapshotC);

  await harness.actions.saveSettingsToVsSync(harness.context);
  assertBundleMatchesSnapshot(harness.syncedState.get(SYNC_SETTINGS_STATE_KEY), snapshotB);

  harness.applySnapshot(snapshotC);
  assert.equal(await harness.actions.importSettingsFromVsSync(harness.context), true);
  await assertCurrentBundleMatches(harness, snapshotB);
  assertUnrelatedThemeBlocksMatch(harness, snapshotC);

  assert.deepEqual(harness.dependencies.window.informationMessages, [
    "Kawaii VS Code Color settings saved to VS Code Settings Sync state.",
    "Kawaii VS Code Color settings exported.",
    "Kawaii VS Code Color settings restored from VS Code Settings Sync state.",
    "Kawaii VS Code Color settings imported.",
    "Kawaii VS Code Color settings saved to VS Code Settings Sync state.",
    "Kawaii VS Code Color settings restored from VS Code Settings Sync state."
  ]);
});

test("settings sync and file actions match the state model for every four-step chain", async () => {
  const snapshotA = createBundleSnapshot("da", {
    activeThemeVariantId: "dark",
    applicationSettings: {
      startupEditor: "welcomePage",
      editorShowTabs: "multiple",
      editorWrapTabs: true,
      openFoldersInNewWindow: "on",
      restoreWindows: "all"
    },
    brightness: 0.19,
    disableGlow: false,
    editorBackgroundOpacity: 0.18,
    editorBackgroundFit: "top-left",
    emptyEditorLogoOpacity: 0.49
  });
  const snapshotB = createBundleSnapshot("db", {
    activeThemeVariantId: "light",
    applicationSettings: {
      startupEditor: "none",
      editorShowTabs: "single",
      editorWrapTabs: false,
      openFoldersInNewWindow: "off",
      restoreWindows: "folders"
    },
    brightness: 0.79,
    disableGlow: true,
    editorBackgroundOpacity: 0.29,
    editorBackgroundFit: "bottom",
    emptyEditorLogoOpacity: 0.59
  });
  const snapshotC = createBundleSnapshot("dc", {
    activeThemeVariantId: "dark",
    applicationSettings: {
      startupEditor: "readme",
      editorShowTabs: "none",
      editorWrapTabs: true,
      openFoldersInNewWindow: "default",
      restoreWindows: "preserve"
    },
    brightness: 0.39,
    disableGlow: true,
    editorBackgroundOpacity: 0.39,
    editorBackgroundFit: "right",
    emptyEditorLogoOpacity: 0.69
  });
  const actionNames: readonly ChainActionName[] = ["saveVSSync", "importVSSync", "exportAs", "import"];
  const sequences = createActionSequences(actionNames, 4);

  assert.equal(sequences.length, 256);

  for (const sequence of sequences) {
    const harness = createStatefulBundleHarness(snapshotA);
    const exportPath = `C:\\Temp\\settings-chain-${sequence.join("-")}.json`;
    const expectedState = {
      current: clone(snapshotC),
      sync: clone(snapshotA),
      file: clone(snapshotB)
    };

    await harness.actions.saveSettingsToVsSync(harness.context);
    harness.applySnapshot(snapshotB);
    harness.dependencies.window.saveDialogResult = { fsPath: exportPath };
    assert.equal(await harness.actions.exportSettingsBundle(harness.context), true);
    harness.applySnapshot(snapshotC);

    await assertCurrentBundleMatches(harness, expectedState.current);
    assertBundleMatchesSnapshot(harness.syncedState.get(SYNC_SETTINGS_STATE_KEY), expectedState.sync);
    assertBundleMatchesSnapshot(JSON.parse(harness.memoryFiles.get(exportPath)), expectedState.file);
    assertUnrelatedThemeBlocksMatch(harness, snapshotC);

    for (const actionName of sequence) {
      if (actionName === "saveVSSync") {
        await harness.actions.saveSettingsToVsSync(harness.context);
        expectedState.sync = clone(expectedState.current);
      }

      if (actionName === "importVSSync") {
        assert.equal(await harness.actions.importSettingsFromVsSync(harness.context), true);
        expectedState.current = clone(expectedState.sync);
      }

      if (actionName === "exportAs") {
        harness.dependencies.window.saveDialogResult = { fsPath: exportPath };
        assert.equal(await harness.actions.exportSettingsBundle(harness.context), true);
        expectedState.file = clone(expectedState.current);
      }

      if (actionName === "import") {
        harness.dependencies.window.openDialogResult = [{ fsPath: exportPath }];
        assert.equal(await harness.actions.importSettingsBundle(harness.context), true);
        expectedState.current = clone(expectedState.file);
      }

      await assertCurrentBundleMatches(harness, expectedState.current);
      assertBundleMatchesSnapshot(harness.syncedState.get(SYNC_SETTINGS_STATE_KEY), expectedState.sync);
      assertBundleMatchesSnapshot(JSON.parse(harness.memoryFiles.get(exportPath)), expectedState.file);
      assertUnrelatedThemeBlocksMatch(harness, snapshotC);
    }
  }
});

test("settings bundle file actions reject invalid JSON and unsupported schema versions", async () => {
  const { dependencies, memoryFiles } = createBundleDependencies();
  const actions = createSettingsBundleActions(dependencies);
  const context: TestContext = {
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
