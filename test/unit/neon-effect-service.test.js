const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  createNeonEffectService,
  getEditorBackgroundFitArea,
  normalizeEditorBackgroundFit
} = require("../../out/src/extensionHost/services/NeonEffectService");
const {
  createWorkbenchPatchService
} = require("../../out/src/extensionHost/services/WorkbenchPatchService");

test("NeonEffectService generates the runtime script with typed configuration and stored images", async () => {
  const extensionRoot = path.normalize("C:/extension");
  const appRoot = path.normalize("C:/VSCode/resources/app");
  const storageRoot = path.join(extensionRoot, ".storage");
  const workbenchBase = path.normalize("C:/VSCode/resources/app/out/vs/code");
  const htmlFile = path.join(workbenchBase, "electron-sandbox", "workbench", "workbench.esm.html");
  const scriptFile = path.join(workbenchBase, "electron-sandbox", "workbench", "neondreams.js");
  const editorImagePath = path.join(storageRoot, "editor-background-image.png");
  const logoPath = path.join(storageRoot, "empty-editor-logo-image.svg");
  const files = new Map([
    [path.join(extensionRoot, "src", "css", "editor_chrome.css"), [
      "image=[EDITOR_BACKGROUND_IMAGE]",
      "opacity=[EDITOR_BACKGROUND_IMAGE_OPACITY]",
      "area=[EDITOR_BACKGROUND_AREA_TOP],[EDITOR_BACKGROUND_AREA_RIGHT],[EDITOR_BACKGROUND_AREA_BOTTOM],[EDITOR_BACKGROUND_AREA_LEFT],[EDITOR_BACKGROUND_AREA_WIDTH],[EDITOR_BACKGROUND_AREA_HEIGHT]",
      "logo=[EMPTY_EDITOR_LOGO_STYLES]"
    ].join("\n")],
    [path.join(extensionRoot, "src", "js", "theme_template.js"), "brightness=[NEON_BRIGHTNESS];glow=[DISABLE_GLOW];styles=[CHROME_STYLES]"],
    [htmlFile, "<html><body>Workbench</body></html>\n"],
    [editorImagePath, Buffer.from("editor image").toString("binary")],
    [logoPath, "<svg></svg>"]
  ]);
  const notificationCalls = [];
  const service = createNeonEffectService({
    appRoot,
    extensionRoot,
    fileSystem: createMemoryFileSystem(files),
    storage: createStorage(storageRoot, new Map([
      ["kawaii_synthwave.editorBackgroundImage", {
        fileName: "editor-background-image.png",
        mimeType: "image/png"
      }],
      ["kawaii_synthwave.editorBackgroundOpacity", 0.2],
      ["kawaii_synthwave.editorBackgroundFit", "bottom-right"],
      ["kawaii_synthwave.emptyEditorLogoImage", {
        fileName: "empty-editor-logo-image.svg",
        mimeType: "image/svg+xml"
      }],
      ["kawaii_synthwave.emptyEditorLogoOpacity", 0.4]
    ])),
    notifications: createNotificationService(notificationCalls),
    workbenchPatchService: createWorkbenchPatchService({
      fileSystem: createMemoryFileSystem(files),
      versionToken: () => "neon"
    })
  });

  await service.enable({
    brightness: 0.5,
    disableGlow: true
  });

  const script = files.get(scriptFile);
  assert.match(script, /brightness=7F/);
  assert.match(script, /glow=true/);
  assert.match(script, /data:image\/png;base64,/);
  assert.match(script, /opacity=0\.2/);
  assert.match(script, /area=auto,0,0,auto,50%,50%/);
  assert.match(script, /data:image\/svg\+xml;base64,/);
  assert.match(files.get(htmlFile), /neondreams\.js\?v=neon/);
  assert.deepEqual(notificationCalls, [{
    type: "reload",
    message: "Neon Dreams enabled. VS code must reload for this change to take effect. Code may display a warning that it is corrupted, this is normal. You can dismiss this message by choosing 'Don't show this again' on the notification.",
    actionTitle: "Restart editor to complete"
  }]);
});

test("NeonEffectService disables active patches and reports inactive patches", async () => {
  const harness = createMinimalServiceHarness("<html></html>\n");

  await harness.service.enable({ brightness: 2, disableGlow: false });
  await harness.service.disable();
  await harness.service.disable();

  assert.equal(harness.service.isEnabled(), false);
  assert.deepEqual(harness.notificationCalls.map((call) => call.message), [
    "Neon Dreams enabled. VS code must reload for this change to take effect. Code may display a warning that it is corrupted, this is normal. You can dismiss this message by choosing 'Don't show this again' on the notification.",
    "Neon Dreams disabled. VS code must reload for this change to take effect",
    "Neon dreams isn't running."
  ]);
});

test("NeonEffectService reports file access failures while disabling the patch", async () => {
  const notificationCalls = [];
  const logCalls = [];
  const error = new Error("Access denied");
  error.code = "EACCES";
  const service = createNeonEffectService({
    appRoot: path.normalize("C:/VSCode/resources/app"),
    extensionRoot: path.normalize("C:/extension"),
    fileSystem: createMemoryFileSystem(new Map()),
    logger: {
      logError(methodName, loggedError, context) {
        logCalls.push({ methodName, loggedError, context });
      }
    },
    notifications: createNotificationService(notificationCalls),
    storage: createStorage(path.normalize("C:/extension/.storage"), new Map()),
    workbenchPatchService: {
      applyScriptTag() {
        return { status: "workbench-not-found", paths: null };
      },
      isEnabled() {
        return false;
      },
      removeScriptTag() {
        throw error;
      },
      resolvePatchPaths() {
        return null;
      }
    }
  });

  await service.disable();

  assert.deepEqual(notificationCalls, [{
    type: "info",
    message: "Neon Dreams was unable to modify the core VS code files needed to launch the extension. You may need to run VS code with admin privileges in order to enable Neon Dreams."
  }]);
  assert.equal(logCalls.length, 1);
  assert.equal(logCalls[0].methodName, "disableNeon");
  assert.equal(logCalls[0].loggedError, error);
});

test("NeonEffectService logs unexpected isEnabled failures and returns false", () => {
  const logCalls = [];
  const error = new Error("Unexpected read failure");
  const service = createNeonEffectService({
    appRoot: path.normalize("C:/VSCode/resources/app"),
    extensionRoot: path.normalize("C:/extension"),
    fileSystem: createMemoryFileSystem(new Map()),
    logger: {
      logError(methodName, loggedError, context) {
        logCalls.push({ methodName, loggedError, context });
      }
    },
    notifications: createNotificationService([]),
    storage: createStorage(path.normalize("C:/extension/.storage"), new Map()),
    workbenchPatchService: {
      applyScriptTag() {
        return { status: "workbench-not-found", paths: null };
      },
      isEnabled() {
        throw error;
      },
      removeScriptTag() {
        return { status: "workbench-not-found", paths: null };
      },
      resolvePatchPaths() {
        return null;
      }
    }
  });

  assert.equal(service.isEnabled(), false);
  assert.deepEqual(logCalls, [{
    methodName: "isNeonEnabled",
    loggedError: error,
    context: {}
  }]);
});

test("NeonEffectService normalizes supported editor background fit values", () => {
  assert.equal(normalizeEditorBackgroundFit(" Top-Right "), "top-right");
  assert.equal(normalizeEditorBackgroundFit("botton-left"), "bottom-left");
  assert.equal(normalizeEditorBackgroundFit("unknown"), "full");
  assert.deepEqual(getEditorBackgroundFitArea("bottom-right"), {
    top: "auto",
    right: "0",
    bottom: "0",
    left: "auto",
    width: "50%",
    height: "50%"
  });
});

test("NeonEffectService reports missing workbench files without writing the patch", async () => {
  const extensionRoot = path.normalize("C:/extension");
  const files = new Map([
    [path.join(extensionRoot, "src", "css", "editor_chrome.css"), "styles"],
    [path.join(extensionRoot, "src", "js", "theme_template.js"), "brightness=[NEON_BRIGHTNESS];styles=[CHROME_STYLES]"]
  ]);
  const notificationCalls = [];
  const service = createNeonEffectService({
    appRoot: path.normalize("C:/missing/resources/app"),
    extensionRoot,
    fileSystem: createMemoryFileSystem(files),
    storage: createStorage(path.join(extensionRoot, ".storage"), new Map()),
    notifications: createNotificationService(notificationCalls),
    workbenchPatchService: createWorkbenchPatchService({
      fileSystem: createMemoryFileSystem(files)
    })
  });

  await service.enable({ brightness: 0.25, disableGlow: false });

  assert.deepEqual(notificationCalls, [{
    type: "error",
    message: "Neon Dreams could not find the workbench HTML file. This is likely due to a change in VS Code's internal structure. Please open an issue on the Kawaii VS Code Color GitHub repository to report this."
  }]);
  assert.equal([...files.keys()].some((filePath) => filePath.endsWith("neondreams.js")), false);
});

function createMinimalServiceHarness(html) {
  const extensionRoot = path.normalize("C:/extension");
  const appRoot = path.normalize("C:/VSCode/resources/app");
  const workbenchBase = path.normalize("C:/VSCode/resources/app/out/vs/code");
  const htmlFile = path.join(workbenchBase, "electron-browser", "workbench", "workbench.html");
  const files = new Map([
    [path.join(extensionRoot, "src", "css", "editor_chrome.css"), "styles=[EDITOR_BACKGROUND_IMAGE]"],
    [path.join(extensionRoot, "src", "js", "theme_template.js"), "brightness=[NEON_BRIGHTNESS];glow=[DISABLE_GLOW];styles=[CHROME_STYLES]"],
    [htmlFile, html]
  ]);
  const notificationCalls = [];
  const fileSystem = createMemoryFileSystem(files);

  return {
    files,
    notificationCalls,
    service: createNeonEffectService({
      appRoot,
      extensionRoot,
      fileSystem,
      storage: createStorage(path.join(extensionRoot, ".storage"), new Map()),
      notifications: createNotificationService(notificationCalls),
      workbenchPatchService: createWorkbenchPatchService({
        fileSystem,
        versionToken: () => "minimal"
      })
    })
  };
}

function createMemoryFileSystem(files) {
  return {
    exists(filePath) {
      return files.has(filePath);
    },
    readTextFile(filePath) {
      if (!files.has(filePath)) {
        const error = new Error(`Missing file: ${filePath}`);
        error.code = "ENOENT";
        throw error;
      }

      return String(files.get(filePath));
    },
    writeTextFile(filePath, content) {
      files.set(filePath, content);
    },
    readFile(filePath) {
      if (!files.has(filePath)) {
        const error = new Error(`Missing file: ${filePath}`);
        error.code = "ENOENT";
        throw error;
      }

      const content = files.get(filePath);
      return Buffer.isBuffer(content) ? content : Buffer.from(String(content));
    }
  };
}

function createStorage(storageRoot, values) {
  return {
    getValue(key) {
      return values.get(key);
    },
    getGlobalStoragePath() {
      return storageRoot;
    }
  };
}

function createNotificationService(calls) {
  return {
    async requestWorkbenchReload(message, actionTitle) {
      calls.push({ type: "reload", message, actionTitle });
    },
    async showInformationMessage(message) {
      calls.push({ type: "info", message });
    },
    async showErrorMessage(message) {
      calls.push({ type: "error", message });
    }
  };
}
