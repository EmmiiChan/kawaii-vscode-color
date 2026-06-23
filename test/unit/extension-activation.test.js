const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");

const workspaceRoot = path.resolve(__dirname, "..", "..");
const extensionPath = path.join(workspaceRoot, "out", "src", "extension.js");

function createExtensionHarness() {
  const commandRegistrations = [];
  const configurationListeners = [];
  const settingsSyncContexts = [];
  const settingsOpenCalls = [];
  const neonEffectServiceOptions = [];
  const workbenchPatchServiceOptions = [];
  const extensionStorageContexts = [];
  const notificationServiceVscodeInputs = [];
  const controllerFactoryInputs = [];
  const settingsCommandFactoryInputs = [];
  const configurationValues = new Map([
    ["workbench.colorTheme", "Dark Pink Kawaii"],
    ["kawaii_synthwave.brightness", 0.45],
    ["kawaii_synthwave.disableGlow", false]
  ]);
  const settingsActions = {
    enableNeon() {},
    disableNeon() {},
    isNeonEnabled() {
      return true;
    }
  };
  const fakeFileSystem = { name: "fake-file-system" };
  const fakeWorkbenchPatchService = { name: "fake-workbench-patch-service" };
  const fakeNeonEffectService = { name: "fake-neon-effect-service" };
  const fakeStorage = { name: "fake-extension-storage" };
  const fakeNotifications = { name: "fake-notifications" };
  const configurationEvents = [];
  let neonEnabled = false;

  const fakeController = {
    async enableNeon() {
      neonEnabled = true;
    },
    async disableNeon() {
      neonEnabled = false;
    },
    isNeonEnabled() {
      return neonEnabled;
    },
    handleConfigurationChange(event) {
      configurationEvents.push(event);
    },
    getSettingsActions() {
      return settingsActions;
    }
  };

  const vscodeStub = {
    env: {
      appRoot: path.join(workspaceRoot, "fake-vscode-app")
    },
    commands: {
      registerCommand(commandId, callback) {
        const disposable = { dispose() {} };
        commandRegistrations.push({ commandId, callback, disposable });

        return disposable;
      }
    },
    workspace: {
      getConfiguration(section) {
        return {
          get(settingName) {
            return configurationValues.get(section ? `${section}.${settingName}` : settingName);
          }
        };
      },
      onDidChangeConfiguration(listener) {
        const disposable = { dispose() {} };
        configurationListeners.push({ listener, disposable });

        return disposable;
      }
    }
  };

  const settingsStub = {
    configureSettingsSync(context) {
      settingsSyncContexts.push(context);
    },
    openSettings(context, actions) {
      settingsOpenCalls.push({ context, actions });

      return Promise.resolve();
    }
  };

  const originalLoad = Module._load;
  Module._load = function loadWithExtensionStubs(request, parent, isMain) {
    if (request === "vscode") {
      return vscodeStub;
    }

    if (request === "./settings") {
      return settingsStub;
    }

    if (request === "./extensionHost/controllers/SettingsCommandController") {
      return {
        createSettingsCommandController(dependencies) {
          settingsCommandFactoryInputs.push(dependencies);

          return {
            configureSettingsSync(context) {
              return dependencies.configureSettingsSync(context);
            },
            openSettings(context, actions) {
              return dependencies.openSettings(context, actions);
            }
          };
        }
      };
    }

    if (request === "./extensionHost/controllers/NeonEffectController") {
      return {
        createNeonEffectController(dependencies) {
          controllerFactoryInputs.push(dependencies);

          return fakeController;
        }
      };
    }

    if (request === "./extensionHost/adapters/NodeFileSystem") {
      return {
        nodeFileSystem: fakeFileSystem
      };
    }

    if (request === "./extensionHost/adapters/VscodeExtensionStorage") {
      return {
        createVscodeExtensionStorage(context) {
          extensionStorageContexts.push(context);

          return fakeStorage;
        }
      };
    }

    if (request === "./extensionHost/adapters/VscodeNotificationService") {
      return {
        createVscodeNotificationService(vscodeInput) {
          notificationServiceVscodeInputs.push(vscodeInput);

          return fakeNotifications;
        }
      };
    }

    if (request === "./extensionHost/services/NeonEffectService") {
      return {
        createNeonEffectService(options) {
          neonEffectServiceOptions.push(options);

          return fakeNeonEffectService;
        }
      };
    }

    if (request === "./extensionHost/services/WorkbenchPatchService") {
      return {
        createWorkbenchPatchService(options) {
          workbenchPatchServiceOptions.push(options);

          return fakeWorkbenchPatchService;
        }
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[require.resolve(extensionPath)];
  const extension = require(extensionPath);

  return {
    cleanup() {
      Module._load = originalLoad;
      delete require.cache[require.resolve(extensionPath)];
    },
    commandRegistrations,
    configurationEvents,
    configurationListeners,
    configurationValues,
    controllerFactoryInputs,
    extension,
    extensionStorageContexts,
    fakeFileSystem,
    fakeNeonEffectService,
    fakeNotifications,
    fakeStorage,
    fakeWorkbenchPatchService,
    notificationServiceVscodeInputs,
    neonEffectServiceOptions,
    settingsActions,
    settingsCommandFactoryInputs,
    settingsOpenCalls,
    settingsSyncContexts,
    vscodeStub,
    workbenchPatchServiceOptions
  };
}

test("extension facade rejects neon actions before activation", async () => {
  const harness = createExtensionHarness();

  try {
    await assert.rejects(() => harness.extension.enableNeon(), /controller is unavailable before extension activation/);
    await assert.rejects(() => harness.extension.disableNeon(), /controller is unavailable before extension activation/);
    assert.throws(() => harness.extension.isNeonEnabled(), /controller is unavailable before extension activation/);
  } finally {
    harness.cleanup();
  }
});

test("extension activation wires command, settings sync, configuration listener, and facade actions", async () => {
  const harness = createExtensionHarness();
  const context = {
    subscriptions: []
  };

  try {
    harness.extension.activate(context);

    assert.equal(harness.settingsCommandFactoryInputs.length, 1);
    assert.equal(harness.settingsSyncContexts.length, 1);
    assert.equal(harness.settingsSyncContexts[0], context);
    assert.equal(harness.commandRegistrations.length, 1);
    assert.equal(harness.commandRegistrations[0].commandId, "kawaii_synthwave.openSettings");
    assert.equal(harness.configurationListeners.length, 1);
    assert.deepEqual(context.subscriptions, [
      harness.commandRegistrations[0].disposable,
      harness.configurationListeners[0].disposable
    ]);

    assert.equal(harness.workbenchPatchServiceOptions[0].fileSystem, harness.fakeFileSystem);
    assert.equal(harness.extensionStorageContexts[0], context);
    assert.equal(harness.notificationServiceVscodeInputs[0].env.appRoot, harness.vscodeStub.env.appRoot);
    assert.equal(harness.neonEffectServiceOptions[0].appRoot, harness.vscodeStub.env.appRoot);
    assert.equal(harness.neonEffectServiceOptions[0].fileSystem, harness.fakeFileSystem);
    assert.equal(harness.neonEffectServiceOptions[0].notifications, harness.fakeNotifications);
    assert.equal(harness.neonEffectServiceOptions[0].storage, harness.fakeStorage);
    assert.equal(harness.neonEffectServiceOptions[0].workbenchPatchService, harness.fakeWorkbenchPatchService);
    assert.equal(harness.controllerFactoryInputs[0].neonEffectService, harness.fakeNeonEffectService);
    assert.equal(harness.controllerFactoryInputs[0].getActiveColorThemeLabel(), "Dark Pink Kawaii");
    assert.deepEqual(harness.controllerFactoryInputs[0].getNeonConfiguration(), {
      brightness: 0.45,
      disableGlow: false
    });

    await harness.commandRegistrations[0].callback();

    assert.equal(harness.settingsOpenCalls.length, 1);
    assert.equal(harness.settingsOpenCalls[0].context, context);
    assert.equal(harness.settingsOpenCalls[0].actions, harness.settingsActions);

    const configurationEvent = { affectsConfiguration() { return true; } };
    harness.configurationListeners[0].listener(configurationEvent);
    assert.deepEqual(harness.configurationEvents, [configurationEvent]);

    assert.equal(harness.extension.isNeonEnabled(), false);
    await harness.extension.enableNeon();
    assert.equal(harness.extension.isNeonEnabled(), true);
    await harness.extension.disableNeon();
    assert.equal(harness.extension.isNeonEnabled(), false);

    harness.extension.deactivate();
    assert.throws(() => harness.extension.isNeonEnabled(), /controller is unavailable before extension activation/);
  } finally {
    harness.cleanup();
  }
});
