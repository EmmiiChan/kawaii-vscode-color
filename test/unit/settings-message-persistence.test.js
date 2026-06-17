const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");

const workspaceRoot = path.resolve(__dirname, "..", "..");

function createUri(filePath) {
  return {
    fsPath: filePath,
    toString() {
      return `file://${filePath}`;
    }
  };
}

function createSettingsHarness() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-settings-message-"));
  const postedMessages = [];
  const informationMessages = [];
  const warningMessages = [];
  const errorMessages = [];
  const configurationValues = new Map([
    ["workbench.colorTheme", "Kawaii VS Code Color"],
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
      openExternal() {
        return Promise.resolve(true);
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
      showSaveDialog() {
        return Promise.resolve(undefined);
      },
      showOpenDialog() {
        return Promise.resolve(undefined);
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
  console.error = function captureConsoleError(...args) {
    loggedErrors.push(args);
  };

  Module._load = function loadWithVscodeStub(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeStub;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  const settingsPath = path.join(workspaceRoot, "src", "settings.js");
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
    panel: () => panel,
    postedMessages,
    settings,
    syncedKeys,
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
      harness.configurationValues.get("workbench.colorCustomizations")["[Kawaii VS Code Color]"]["editor.background"],
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
    assert.equal(harness.configurationValues.get("workbench.colorTheme"), "Kawaii VS Code Color Light");

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
