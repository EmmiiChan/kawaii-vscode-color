const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const settingsFixturePath = path.join(workspaceRoot, "test", "fixtures", "settings", "settings-dark-light-customized.json");
const editorBackgroundFixturePath = path.join(workspaceRoot, "test", "fixtures", "settings", "editor-background.png");
const emptyEditorLogoFixturePath = path.join(workspaceRoot, "test", "fixtures", "settings", "empty-editor-logo.png");

function createUri(filePath) {
  return {
    fsPath: filePath,
    toString() {
      return `file://${filePath}`;
    }
  };
}

function createSettingsHarness(options = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-settings-message-"));
  const postedMessages = [];
  const informationMessages = [];
  const warningMessages = [];
  const errorMessages = [];
  const openExternalCalls = [];
  const configurationValues = new Map([
    ["workbench.colorTheme", "Dark Pink Kawaii"],
    ["workbench.colorCustomizations", {}],
    ["editor.tokenColorCustomizations", {}],
    ["kawaii_synthwave.brightness", 0.45],
    ["kawaii_synthwave.disableGlow", false]
  ]);
  const globalStateValues = new Map();
  const syncedKeys = [];
  const loggedErrors = [];
  const actions = {
    enable: 0,
    disable: 0
  };
  let messageHandler;
  let panel;

  const vscodeStub = {
    ViewColumn: {
      One: 1
    },
    ConfigurationTarget: {
      Global: true
    },
    Uri: {
      file: createUri,
      parse(value) {
        return {
          fsPath: value,
          toString() {
            return value;
          }
        };
      }
    },
    env: {
      openExternal(uri) {
        openExternalCalls.push(uri);
        return Promise.resolve(options.openExternalResult !== undefined ? options.openExternalResult : true);
      }
    },
    window: {
      createWebviewPanel() {
        panel = {
          webview: {
            cspSource: "vscode-resource:",
            html: "",
            asWebviewUri(uri) {
              return {
                toString() {
                  return `vscode-resource:${uri.fsPath}`;
                }
              };
            },
            onDidReceiveMessage(handler) {
              messageHandler = handler;
              return { dispose() {} };
            },
            postMessage(message) {
              postedMessages.push(message);
              return Promise.resolve(true);
            }
          },
          onDidDispose() {
            return { dispose() {} };
          },
          reveal() {}
        };

        return panel;
      },
      showErrorMessage(message) {
        errorMessages.push(message);
        return Promise.resolve();
      },
      showInformationMessage(message) {
        informationMessages.push(message);
        return Promise.resolve();
      },
      showWarningMessage(message) {
        warningMessages.push(message);
        return Promise.resolve();
      },
      openDialogResult: undefined,
      saveDialogResult: undefined,
      showSaveDialog() {
        return Promise.resolve(this.saveDialogResult);
      },
      showOpenDialog() {
        return Promise.resolve(this.openDialogResult);
      }
    },
    workspace: {
      getConfiguration() {
        return {
          get(settingName) {
            return configurationValues.get(settingName);
          },
          inspect(settingName) {
            return {
              globalValue: configurationValues.get(settingName),
              workspaceValue: undefined
            };
          },
          update(settingName, value) {
            if (value === undefined) {
              configurationValues.delete(settingName);
            } else {
              configurationValues.set(settingName, value);
            }

            return Promise.resolve();
          }
        };
      }
    }
  };

  const originalLoad = Module._load;
  const originalConsoleError = console.error;
  const originalReadFileSync = fs.readFileSync;
  console.error = function captureConsoleError(...args) {
    loggedErrors.push(args);
  };

  if (options.failColorReferenceRead) {
    fs.readFileSync = function readFileSyncWithMissingColorReference(filePath, ...args) {
      const normalizedFilePath = path.normalize(String(filePath));
      const colorReferenceSuffix = path.normalize(path.join(".codex", "color_scheme_reference.md"));

      if (normalizedFilePath.endsWith(colorReferenceSuffix)) {
        throw new Error("Simulated missing color scheme reference");
      }

      return originalReadFileSync.call(this, filePath, ...args);
    };
  }

  Module._load = function loadWithVscodeStub(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeStub;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  const settingsPath = path.join(workspaceRoot, "out", "src", "settings.js");
  delete require.cache[require.resolve(settingsPath)];
  const settings = require(settingsPath);
  const context = {
    extensionUri: createUri(workspaceRoot),
    extensionPath: workspaceRoot,
    subscriptions: [],
    globalStorageUri: createUri(path.join(tempRoot, "global-storage")),
    globalState: {
      get(key) {
        return globalStateValues.get(key);
      },
      setKeysForSync(keys) {
        syncedKeys.push(keys);
      },
      update(key, value) {
        if (value === undefined) {
          globalStateValues.delete(key);
        } else {
          globalStateValues.set(key, value);
        }

        return Promise.resolve();
      }
    }
  };

  return {
    actions,
    cleanup() {
      Module._load = originalLoad;
      console.error = originalConsoleError;
      fs.readFileSync = originalReadFileSync;
      delete require.cache[require.resolve(settingsPath)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    },
    configurationValues,
    context,
    errorMessages,
    globalStateValues,
    loggedErrors,
    getMessageHandler() {
      return messageHandler;
    },
    informationMessages,
    openExternalCalls,
    panel: () => panel,
    postedMessages,
    settings,
    syncedKeys,
    tempRoot,
    vscodeWindow: vscodeStub.window,
    warningMessages
  };
}

test("settings webview messages reach persistence services without touching real VS Code state", async () => {
  const harness = createSettingsHarness();

  try {
    await harness.settings.openSettings(harness.context, {
      enableNeon: async () => {
        harness.actions.enable += 1;
      },
      disableNeon: async () => {
        harness.actions.disable += 1;
      }
    });

    const messageHandler = harness.getMessageHandler();
    assert.equal(typeof messageHandler, "function");
    assert.match(harness.panel().webview.html, /Color Settings/);

    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "#123456",
      themeVariantId: "dark"
    });

    assert.equal(
      harness.configurationValues.get("workbench.colorCustomizations")["[Dark Pink Kawaii]"]["editor.background"],
      "#123456"
    );
    assert.equal(harness.postedMessages.at(-1).type, "state");

    await messageHandler({
      type: "reset-color",
      section: "workbench",
      id: "editor.background",
      themeVariantId: "dark"
    });
    assert.equal(harness.configurationValues.get("workbench.colorCustomizations"), undefined);

    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "#654321",
      themeVariantId: "dark"
    });
    await messageHandler({
      type: "reset-all",
      themeVariantId: "dark"
    });
    assert.equal(harness.configurationValues.get("workbench.colorCustomizations"), undefined);

    await messageHandler({
      type: "change-theme-variant",
      themeVariantId: "light"
    });
    assert.equal(harness.configurationValues.get("workbench.colorTheme"), "Light Pink-Pastel Kawaii");

    await messageHandler({ type: "save-settings-to-vssync" });
    const syncedBundle = harness.globalStateValues.get("kawaii_synthwave.syncedSettingsBundle");
    assert.equal(syncedBundle.schema, "kawaii-vscode-color-settings");
    assert.ok(harness.informationMessages.includes("Kawaii VS Code Color settings saved to VS Code Settings Sync state."));

    harness.globalStateValues.delete("kawaii_synthwave.syncedSettingsBundle");
    await messageHandler({ type: "import-settings-from-vssync" });
    assert.ok(harness.warningMessages.includes("No Kawaii VS Code Color settings bundle was found in VS Code Settings Sync state."));

    await messageHandler({
      type: "apply-neon-customizations",
      editorBackgroundOpacity: 0.2,
      editorBackgroundFit: "left",
      emptyEditorLogoOpacity: 0.7
    });
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundOpacity"), 0.2);
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundFit"), "left");
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.emptyEditorLogoOpacity"), 0.7);
    assert.equal(harness.actions.enable, 1);

    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "bad",
      themeVariantId: "dark"
    });
    assert.equal(harness.postedMessages.at(-1).type, "error");
    assert.match(harness.errorMessages.at(-1), /Kawaii VS Code Color settings failed/);
  } finally {
    harness.cleanup();
  }
});

test("settings E2E bundle hook is rejected by default and applies fixture only with Neon flag", async () => {
  const originalFlag = process.env.KAWAII_E2E_ALLOW_NEON_PATCH;
  const harness = createSettingsHarness();

  try {
    delete process.env.KAWAII_E2E_ALLOW_NEON_PATCH;

    await harness.settings.openSettings(harness.context, {
      enableNeon: async () => {
        harness.actions.enable += 1;
      },
      disableNeon: async () => {
        harness.actions.disable += 1;
      }
    });

    const messageHandler = harness.getMessageHandler();
    const fixtureBundle = JSON.parse(fs.readFileSync(settingsFixturePath, "utf8"));

    await messageHandler({
      type: "e2e-apply-settings-bundle",
      bundle: fixtureBundle
    });

    assert.equal(harness.postedMessages.at(-1).type, "error");
    assert.match(harness.postedMessages.at(-1).message, /only available while KAWAII_E2E_ALLOW_NEON_PATCH=1/);

    process.env.KAWAII_E2E_ALLOW_NEON_PATCH = "1";
    await messageHandler({
      type: "e2e-apply-settings-bundle",
      bundle: fixtureBundle
    });

    assert.equal(harness.configurationValues.get("kawaii_synthwave.brightness"), 0.72);
    assert.equal(harness.configurationValues.get("kawaii_synthwave.disableGlow"), true);
    assert.equal(harness.configurationValues.get("workbench.colorTheme"), "Light Pink-Pastel Kawaii");
    assert.equal(
      harness.configurationValues.get("workbench.colorCustomizations")["[Dark Pink Kawaii]"]["editor.background"],
      "#101820"
    );
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundOpacity"), 0.23);
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundFit"), "left");
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.emptyEditorLogoOpacity"), 0.64);
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundImage").originalName, "editor-background.png");
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.emptyEditorLogoImage").originalName, "empty-editor-logo.png");
    assert.ok(fs.existsSync(path.join(harness.context.globalStorageUri.fsPath, "editor-background-image.png")));
    assert.ok(fs.existsSync(path.join(harness.context.globalStorageUri.fsPath, "empty-editor-logo-image.png")));
  } finally {
    if (originalFlag === undefined) {
      delete process.env.KAWAII_E2E_ALLOW_NEON_PATCH;
    } else {
      process.env.KAWAII_E2E_ALLOW_NEON_PATCH = originalFlag;
    }
    harness.cleanup();
  }
});

test("settings E2E fixtures drive dialogs and random image flows without native UI or network", async () => {
  const originalSafeHooksFlag = process.env.KAWAII_E2E_TEST_HOOKS;
  const harness = createSettingsHarness();

  try {
    process.env.KAWAII_E2E_TEST_HOOKS = "1";

    await harness.settings.openSettings(harness.context, {
      enableNeon: async () => {
        harness.actions.enable += 1;
      },
      disableNeon: async () => {
        harness.actions.disable += 1;
      }
    });

    const messageHandler = harness.getMessageHandler();
    const exportPath = path.join(harness.tempRoot, "controlled-settings-export.json");
    const editorBackgroundDownloadPath = path.join(harness.tempRoot, "downloaded-editor-background.png");
    const emptyEditorLogoDownloadPath = path.join(harness.tempRoot, "downloaded-empty-editor-logo.png");

    await messageHandler({
      type: "e2e-set-test-fixtures",
      fixtures: {
        settingsExportPath: exportPath,
        settingsImportPath: exportPath,
        editorBackgroundImagePath: editorBackgroundFixturePath,
        emptyEditorLogoImagePath: emptyEditorLogoFixturePath,
        editorBackgroundDownloadPath,
        emptyEditorLogoDownloadPath,
        randomNekoImagePath: editorBackgroundFixturePath
      }
    });

    await messageHandler({ type: "select-editor-background-image" });
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundImage").originalName, "editor-background.png");
    assert.ok(fs.existsSync(path.join(harness.context.globalStorageUri.fsPath, "editor-background-image.png")));

    await messageHandler({ type: "select-empty-editor-logo-image" });
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.emptyEditorLogoImage").originalName, "empty-editor-logo.png");
    assert.ok(fs.existsSync(path.join(harness.context.globalStorageUri.fsPath, "empty-editor-logo-image.png")));

    await messageHandler({ type: "download-editor-background-image" });
    await messageHandler({ type: "download-empty-editor-logo-image" });
    assert.deepEqual(fs.readFileSync(editorBackgroundDownloadPath), fs.readFileSync(editorBackgroundFixturePath));
    assert.deepEqual(fs.readFileSync(emptyEditorLogoDownloadPath), fs.readFileSync(emptyEditorLogoFixturePath));

    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "#121212",
      themeVariantId: "dark"
    });
    await messageHandler({ type: "export-settings" });
    assert.ok(fs.existsSync(exportPath));

    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "#343434",
      themeVariantId: "dark"
    });
    await messageHandler({ type: "import-settings" });
    assert.equal(
      harness.configurationValues.get("workbench.colorCustomizations")["[Dark Pink Kawaii]"]["editor.background"],
      "#121212"
    );

    await messageHandler({ type: "select-random-neko-editor-background-image" });
    assert.equal(
      harness.globalStateValues.get("kawaii_synthwave.editorBackgroundImage").originalName,
      "e2e-random-neko-editor-background.png"
    );
  } finally {
    if (originalSafeHooksFlag === undefined) {
      delete process.env.KAWAII_E2E_TEST_HOOKS;
    } else {
      process.env.KAWAII_E2E_TEST_HOOKS = originalSafeHooksFlag;
    }
    harness.cleanup();
  }
});

test("settings webview sync and file messages restore saved state after chained edits", async () => {
  const harness = createSettingsHarness();

  try {
    await harness.settings.openSettings(harness.context, {
      enableNeon: async () => {
        harness.actions.enable += 1;
      },
      disableNeon: async () => {
        harness.actions.disable += 1;
      }
    });

    const messageHandler = harness.getMessageHandler();
    const exportPath = path.join(harness.tempRoot, "kawaii-settings-export.json");

    harness.configurationValues.set("kawaii_synthwave.brightness", 0.31);
    harness.configurationValues.set("kawaii_synthwave.disableGlow", false);

    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "#111111",
      themeVariantId: "dark"
    });
    await messageHandler({
      type: "apply-neon-customizations",
      editorBackgroundOpacity: 0.12,
      editorBackgroundFit: "top",
      emptyEditorLogoOpacity: 0.52
    });
    await messageHandler({ type: "save-settings-to-vssync" });

    const savedBundle = harness.globalStateValues.get("kawaii_synthwave.syncedSettingsBundle");
    assert.equal(savedBundle.extensionConfiguration.brightness, 0.31);
    assert.equal(savedBundle.colorCustomizations.workbench.dark["editor.background"], "#111111");
    assert.equal(savedBundle.effects.editorBackground.opacity, 0.12);
    assert.equal(savedBundle.effects.editorBackground.fit, "top");
    assert.equal(savedBundle.effects.emptyEditorLogo.opacity, 0.52);

    harness.configurationValues.set("kawaii_synthwave.brightness", 0.86);
    harness.configurationValues.set("kawaii_synthwave.disableGlow", true);
    await messageHandler({
      type: "change-theme-variant",
      themeVariantId: "light"
    });
    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "#222222",
      themeVariantId: "light"
    });
    await messageHandler({
      type: "apply-neon-customizations",
      editorBackgroundOpacity: 0.33,
      editorBackgroundFit: "bottom-left",
      emptyEditorLogoOpacity: 0.82
    });

    assert.equal(harness.configurationValues.get("workbench.colorTheme"), "Light Pink-Pastel Kawaii");
    assert.equal(
      harness.configurationValues.get("workbench.colorCustomizations")["[Light Pink-Pastel Kawaii]"]["editor.background"],
      "#222222"
    );
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundFit"), "bottom-left");

    await messageHandler({ type: "import-settings-from-vssync" });

    assert.equal(harness.configurationValues.get("kawaii_synthwave.brightness"), 0.31);
    assert.equal(harness.configurationValues.get("kawaii_synthwave.disableGlow"), false);
    assert.equal(harness.configurationValues.get("workbench.colorTheme"), "Dark Pink Kawaii");
    assert.equal(
      harness.configurationValues.get("workbench.colorCustomizations")["[Dark Pink Kawaii]"]["editor.background"],
      "#111111"
    );
    assert.equal(harness.configurationValues.get("workbench.colorCustomizations")["[Light Pink-Pastel Kawaii]"], undefined);
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundOpacity"), 0.12);
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundFit"), "top");
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.emptyEditorLogoOpacity"), 0.52);
    assert.equal(harness.postedMessages.at(-1).type, "effects-pending");
    assert.match(harness.postedMessages.at(-1).message, /Settings restored from VSSync/);

    harness.vscodeWindow.saveDialogResult = createUri(exportPath);
    await messageHandler({ type: "export-settings" });
    const exportedBundle = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    assert.equal(exportedBundle.extensionConfiguration.brightness, 0.31);
    assert.equal(exportedBundle.colorCustomizations.workbench.dark["editor.background"], "#111111");
    assert.equal(exportedBundle.effects.editorBackground.fit, "top");

    harness.configurationValues.set("kawaii_synthwave.brightness", 0.64);
    harness.configurationValues.set("kawaii_synthwave.disableGlow", true);
    await messageHandler({
      type: "change-theme-variant",
      themeVariantId: "light"
    });
    await messageHandler({
      type: "update-color",
      section: "workbench",
      id: "editor.background",
      value: "#333333",
      themeVariantId: "light"
    });
    await messageHandler({
      type: "apply-neon-customizations",
      editorBackgroundOpacity: 0.28,
      editorBackgroundFit: "right",
      emptyEditorLogoOpacity: 0.66
    });

    harness.vscodeWindow.openDialogResult = [createUri(exportPath)];
    await messageHandler({ type: "import-settings" });

    assert.equal(harness.configurationValues.get("kawaii_synthwave.brightness"), 0.31);
    assert.equal(harness.configurationValues.get("kawaii_synthwave.disableGlow"), false);
    assert.equal(harness.configurationValues.get("workbench.colorTheme"), "Dark Pink Kawaii");
    assert.equal(
      harness.configurationValues.get("workbench.colorCustomizations")["[Dark Pink Kawaii]"]["editor.background"],
      "#111111"
    );
    assert.equal(harness.configurationValues.get("workbench.colorCustomizations")["[Light Pink-Pastel Kawaii]"], undefined);
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundOpacity"), 0.12);
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundFit"), "top");
    assert.equal(harness.globalStateValues.get("kawaii_synthwave.emptyEditorLogoOpacity"), 0.52);
    assert.equal(harness.postedMessages.at(-1).type, "effects-pending");
    assert.match(harness.postedMessages.at(-1).message, /Settings imported/);
    assert.ok(harness.informationMessages.includes("Kawaii VS Code Color settings exported."));
    assert.ok(harness.informationMessages.includes("Kawaii VS Code Color settings imported."));
  } finally {
    harness.cleanup();
  }
});

test("settings documentation links open only allow-listed URLs", async () => {
  const harness = createSettingsHarness();

  try {
    await harness.settings.openSettings(harness.context, {
      enableNeon: async () => {
        harness.actions.enable += 1;
      },
      disableNeon: async () => {
        harness.actions.disable += 1;
      }
    });

    const messageHandler = harness.getMessageHandler();
    const allowedUrl = "https://github.com/EmmiiChan/kawaii-vscode-color";

    await messageHandler({
      type: "open-link",
      url: allowedUrl
    });

    assert.equal(harness.openExternalCalls.length, 1);
    assert.equal(harness.openExternalCalls[0].toString(), allowedUrl);

    await messageHandler({
      type: "open-link",
      url: "https://malicious.example.test"
    });

    assert.equal(harness.openExternalCalls.length, 1);
    assert.equal(harness.postedMessages.at(-1).type, "error");
    assert.match(harness.postedMessages.at(-1).message, /Unsupported documentation link/);
    assert.match(harness.errorMessages.at(-1), /Kawaii VS Code Color settings failed/);
    assert.ok(
      harness.loggedErrors.some((args) => String(args[0]).includes("handleSettingsMessage")),
      "expected blocked link to be logged with settings-message context"
    );
  } finally {
    harness.cleanup();
  }
});

test("settings image dialog cancellation refreshes state without persisting image metadata", async () => {
  const harness = createSettingsHarness();

  try {
    await harness.settings.openSettings(harness.context, {
      enableNeon: async () => {
        harness.actions.enable += 1;
      },
      disableNeon: async () => {
        harness.actions.disable += 1;
      }
    });

    const messageHandler = harness.getMessageHandler();
    const firstMessageIndex = harness.postedMessages.length;

    await messageHandler({ type: "select-editor-background-image" });

    assert.equal(harness.globalStateValues.get("kawaii_synthwave.editorBackgroundImage"), undefined);
    assert.equal(harness.postedMessages.at(-1).type, "state");
    assert.equal(
      harness.postedMessages.slice(firstMessageIndex).some((message) => message.type === "effects-pending"),
      false
    );

    const secondMessageIndex = harness.postedMessages.length;

    await messageHandler({ type: "select-empty-editor-logo-image" });

    assert.equal(harness.globalStateValues.get("kawaii_synthwave.emptyEditorLogoImage"), undefined);
    assert.equal(harness.postedMessages.at(-1).type, "state");
    assert.equal(
      harness.postedMessages.slice(secondMessageIndex).some((message) => message.type === "effects-pending"),
      false
    );
  } finally {
    harness.cleanup();
  }
});

test("settings state falls back to generated color descriptions when reference markdown cannot be read", async () => {
  const harness = createSettingsHarness({ failColorReferenceRead: true });

  try {
    await harness.settings.openSettings(harness.context, {
      enableNeon: async () => {
        harness.actions.enable += 1;
      },
      disableNeon: async () => {
        harness.actions.disable += 1;
      }
    });

    const messageHandler = harness.getMessageHandler();
    await messageHandler({ type: "refresh" });

    const state = harness.postedMessages.at(-1).state;
    const editorBackgroundColor = state.workbenchColors.find((color) => color.id === "editor.background");

    assert.equal(editorBackgroundColor.description, "Controls the editor background color in VS Code.");
    assert.ok(
      harness.loggedErrors.some((args) => String(args[0]).includes("readColorDescriptionReference")),
      "expected missing color reference to be logged"
    );
  } finally {
    harness.cleanup();
  }
});
