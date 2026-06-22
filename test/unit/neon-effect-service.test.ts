import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  createNeonEffectService,
  getEditorBackgroundFitArea,
  normalizeEditorBackgroundFit
} = requireOut<typeof import("../../src/extensionHost/services/NeonEffectService")>(
  "extensionHost",
  "services",
  "NeonEffectService"
);
const {
  createWorkbenchPatchService
} = requireOut<typeof import("../../src/extensionHost/services/WorkbenchPatchService")>(
  "extensionHost",
  "services",
  "WorkbenchPatchService"
);

type MemoryFileValue = string | Buffer;

interface FileError extends Error {
  code?: string;
}

interface NotificationCall {
  readonly type: "error" | "info" | "reload";
  readonly message: string;
  readonly actionTitle?: string;
}

interface LogCall {
  readonly methodName: string;
  readonly loggedError: unknown;
  readonly context: unknown;
}

interface MemoryHarness {
  readonly files: Map<string, MemoryFileValue>;
  readonly notificationCalls: NotificationCall[];
  readonly service: ReturnType<typeof createNeonEffectService>;
}

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("NeonEffectService generates the runtime script with typed configuration and stored images", async () => {
  const extensionRoot = path.normalize("C:/extension");
  const appRoot = path.normalize("C:/VSCode/resources/app");
  const storageRoot = path.join(extensionRoot, ".storage");
  const workbenchBase = path.normalize("C:/VSCode/resources/app/out/vs/code");
  const htmlFile = path.join(workbenchBase, "electron-sandbox", "workbench", "workbench.esm.html");
  const scriptFile = path.join(workbenchBase, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.js");
  const editorImagePath = path.join(storageRoot, "editor-background-image.png");
  const logoPath = path.join(storageRoot, "empty-editor-logo-image.svg");
  const files = new Map<string, MemoryFileValue>([
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
  const notificationCalls: NotificationCall[] = [];
  const service = createNeonEffectService({
    appRoot,
    extensionRoot,
    fileSystem: createMemoryFileSystem(files),
    storage: createStorage(storageRoot, new Map<string, unknown>([
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

  const script = String(files.get(scriptFile) || "");
  assert.match(script, /brightness=7F/);
  assert.match(script, /glow=true/);
  assert.match(script, /data:image\/png;base64,/);
  assert.match(script, /opacity=0\.2/);
  assert.match(script, /area=auto,0,0,auto,50%,50%/);
  assert.match(script, /data:image\/svg\+xml;base64,/);
  assert.match(String(files.get(htmlFile) || ""), /kawaii-vscode-colors-ui\.js\?v=neon/);
  assert.deepEqual(notificationCalls, [{
    type: "reload",
    message: "Kawaii VS Code Color UI effects enabled. VS code must reload for this change to take effect. Code may display a warning that it is corrupted, this is normal. You can dismiss this message by choosing 'Don't show this again' on the notification.",
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
    "Kawaii VS Code Color UI effects enabled. VS code must reload for this change to take effect. Code may display a warning that it is corrupted, this is normal. You can dismiss this message by choosing 'Don't show this again' on the notification.",
    "Kawaii VS Code Color UI effects disabled. VS code must reload for this change to take effect",
    "Kawaii VS Code Color UI effects are not running."
  ]);
});

test("NeonEffectService reports file access failures while disabling the patch", async () => {
  const notificationCalls: NotificationCall[] = [];
  const logCalls: LogCall[] = [];
  const error: FileError = new Error("Access denied");
  error.code = "EACCES";
  const service = createNeonEffectService({
    appRoot: path.normalize("C:/VSCode/resources/app"),
    extensionRoot: path.normalize("C:/extension"),
    fileSystem: createMemoryFileSystem(new Map()),
    logger: {
      logError(methodName: string, loggedError: unknown, context: unknown): void {
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
    message: "Kawaii VS Code Color was unable to modify the core VS code files needed to launch UI effects. You may need to run VS code with admin privileges in order to enable them."
  }]);
  assert.equal(logCalls.length, 1);
  assert.equal(logCalls[0]!.methodName, "disableNeon");
  assert.equal(logCalls[0]!.loggedError, error);
});

test("NeonEffectService logs unexpected isEnabled failures and returns false", () => {
  const logCalls: LogCall[] = [];
  const error = new Error("Unexpected read failure");
  const service = createNeonEffectService({
    appRoot: path.normalize("C:/VSCode/resources/app"),
    extensionRoot: path.normalize("C:/extension"),
    fileSystem: createMemoryFileSystem(new Map()),
    logger: {
      logError(methodName: string, loggedError: unknown, context: unknown): void {
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
  const files = new Map<string, MemoryFileValue>([
    [path.join(extensionRoot, "src", "css", "editor_chrome.css"), "styles"],
    [path.join(extensionRoot, "src", "js", "theme_template.js"), "brightness=[NEON_BRIGHTNESS];styles=[CHROME_STYLES]"]
  ]);
  const notificationCalls: NotificationCall[] = [];
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
    message: "Kawaii VS Code Color could not find the workbench HTML file. This is likely due to a change in VS Code's internal structure. Please open an issue on the Kawaii VS Code Color GitHub repository to report this."
  }]);
  assert.equal([...files.keys()].some((filePath) => filePath.endsWith("kawaii-vscode-colors-ui.js")), false);
});

function createMinimalServiceHarness(html: string): MemoryHarness {
  const extensionRoot = path.normalize("C:/extension");
  const appRoot = path.normalize("C:/VSCode/resources/app");
  const workbenchBase = path.normalize("C:/VSCode/resources/app/out/vs/code");
  const htmlFile = path.join(workbenchBase, "electron-browser", "workbench", "workbench.html");
  const files = new Map<string, MemoryFileValue>([
    [path.join(extensionRoot, "src", "css", "editor_chrome.css"), "styles=[EDITOR_BACKGROUND_IMAGE]"],
    [path.join(extensionRoot, "src", "js", "theme_template.js"), "brightness=[NEON_BRIGHTNESS];glow=[DISABLE_GLOW];styles=[CHROME_STYLES]"],
    [htmlFile, html]
  ]);
  const notificationCalls: NotificationCall[] = [];
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

function createMemoryFileSystem(files: Map<string, MemoryFileValue>) {
  return {
    exists(filePath: string): boolean {
      return files.has(filePath);
    },
    readTextFile(filePath: string): string {
      if (!files.has(filePath)) {
        const error: FileError = new Error(`Missing file: ${filePath}`);
        error.code = "ENOENT";
        throw error;
      }

      return String(files.get(filePath));
    },
    writeTextFile(filePath: string, content: string): void {
      files.set(filePath, content);
    },
    readFile(filePath: string): Buffer {
      if (!files.has(filePath)) {
        const error: FileError = new Error(`Missing file: ${filePath}`);
        error.code = "ENOENT";
        throw error;
      }

      const content = files.get(filePath);
      return Buffer.isBuffer(content) ? content : Buffer.from(String(content));
    }
  };
}

function createStorage(storageRoot: string, values: Map<string, unknown>) {
  return {
    getValue(key: string): unknown {
      return values.get(key);
    },
    getGlobalStoragePath(): string {
      return storageRoot;
    }
  };
}

function createNotificationService(calls: NotificationCall[]) {
  return {
    async requestWorkbenchReload(message: string, actionTitle: string): Promise<void> {
      calls.push({ type: "reload", message, actionTitle });
    },
    async showInformationMessage(message: string): Promise<void> {
      calls.push({ type: "info", message });
    },
    async showErrorMessage(message: string): Promise<void> {
      calls.push({ type: "error", message });
    }
  };
}
