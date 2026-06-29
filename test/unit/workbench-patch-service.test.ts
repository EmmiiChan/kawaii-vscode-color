import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  createWorkbenchPatchService
} = requireOut<typeof import("../../src/extensionHost/services/WorkbenchPatchService")>(
  "extensionHost",
  "services",
  "WorkbenchPatchService"
);

type MemoryFileValue = string | Buffer;

interface MemoryWrite {
  readonly filePath: string;
  readonly content: MemoryFileValue;
}

interface FileError extends Error {
  code?: string;
}

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("WorkbenchPatchService writes the Kawaii UI assets and patches the workbench HTML", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench.esm.html");
  const scriptFile = path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.js");
  const styleFile = path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.min.css");
  const files = new Map<string, MemoryFileValue>([[htmlFile, "<html><body>Workbench</body></html>\n"]]);
  const writes: MemoryWrite[] = [];
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files, writes),
    versionToken: () => "step04"
  });

  const result = service.applyAssets(base, {
    scriptContent: "compiled neon script [KAWAII_UI_STYLE_VERSION]",
    styleContent: "compiled neon styles"
  });

  assert.equal(result.status, "activated");
  assert.deepEqual(result.paths, { htmlFile, scriptFile, styleFile });
  assert.equal(files.get(styleFile), "compiled neon styles");
  assert.equal(files.get(scriptFile), "compiled neon script step04");
  assert.match(String(files.get(htmlFile) || ""), /kawaii-vscode-colors-ui\.js\?v=step04/);
  assert.deepEqual(writes.map((write) => write.filePath), [styleFile, scriptFile, htmlFile]);
});

test("WorkbenchPatchService writes versioned CSS and binary image assets while removing stale variants", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const workbenchDir = path.join(base, "electron-sandbox", "workbench");
  const htmlFile = path.join(workbenchDir, "workbench.esm.html");
  const scriptFile = path.join(workbenchDir, "kawaii-vscode-colors-ui.js");
  const styleFile = path.join(workbenchDir, "kawaii-vscode-colors-ui.min.css");
  const editorAssetFile = path.join(workbenchDir, "kawaii-vscode-colors-editor-background-image.png");
  const staleEditorAssetFile = path.join(workbenchDir, "kawaii-vscode-colors-editor-background-image.jpg");
  const files = new Map<string, MemoryFileValue>([
    [htmlFile, "<html><body>Workbench</body></html>\n"],
    [staleEditorAssetFile, Buffer.from("old image")]
  ]);
  const writes: MemoryWrite[] = [];
  const deletes: string[] = [];
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files, writes, deletes),
    versionToken: () => "asset-v1"
  });

  const result = service.applyAssets(base, {
    scriptContent: "script [KAWAII_UI_STYLE_VERSION]",
    styleContent: 'background-image: url("kawaii-vscode-colors-editor-background-image.png?v=[KAWAII_UI_STYLE_VERSION]")',
    imageAssets: [
      {
        fileName: "kawaii-vscode-colors-editor-background-image.png",
        content: Buffer.from("new image")
      }
    ],
    deleteAssetFileNames: ["kawaii-vscode-colors-editor-background-image.jpg"]
  });

  assert.equal(result.status, "activated");
  assert.equal(files.get(styleFile), 'background-image: url("kawaii-vscode-colors-editor-background-image.png?v=asset-v1")');
  assert.equal(files.get(scriptFile), "script asset-v1");
  assert.deepEqual(files.get(editorAssetFile), Buffer.from("new image"));
  assert.equal(files.has(staleEditorAssetFile), false);
  assert.deepEqual(deletes, [staleEditorAssetFile]);
});

test("WorkbenchPatchService reports reactivation without duplicating the marker", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
  const scriptFile = path.join(base, "electron-browser", "workbench", "kawaii-vscode-colors-ui.js");
  const styleFile = path.join(base, "electron-browser", "workbench", "kawaii-vscode-colors-ui.min.css");
  const files = new Map<string, MemoryFileValue>([[htmlFile, "<html></html>\n"]]);
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files),
    versionToken: () => "one"
  });

  service.applyAssets(base, {
    scriptContent: "first script",
    styleContent: "first styles"
  });
  const reactivatedService = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files),
    versionToken: () => "two"
  });

  const result = reactivatedService.applyAssets(base, {
    scriptContent: "second script",
    styleContent: "second styles"
  });

  assert.equal(result.status, "reactivated");
  assert.deepEqual(result.paths, { htmlFile, scriptFile, styleFile });
  assert.equal(files.get(styleFile), "second styles");
  assert.equal(files.get(scriptFile), "second script");
  const patchedHtml = String(files.get(htmlFile) || "");
  assert.equal((patchedHtml.match(/<!-- KAWAII VSCODE COLORS UI -->/g) || []).length, 1);
  assert.doesNotMatch(patchedHtml, /kawaii-vscode-colors-ui\.js\?v=one/);
  assert.match(patchedHtml, /kawaii-vscode-colors-ui\.js\?v=two/);
});

test("WorkbenchPatchService removes an active patch and reports absent patches", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
  const scriptFile = path.join(base, "electron-browser", "workbench", "kawaii-vscode-colors-ui.js");
  const styleFile = path.join(base, "electron-browser", "workbench", "kawaii-vscode-colors-ui.min.css");
  const files = new Map<string, MemoryFileValue>([[htmlFile, "<html></html>\n"]]);
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files),
    versionToken: () => "remove"
  });

  service.applyAssets(base, {
    scriptContent: "script",
    styleContent: "styles"
  });
  const removed = service.removePatch(base);
  const removedAgain = service.removePatch(base);

  assert.equal(removed.status, "removed");
  assert.doesNotMatch(String(files.get(htmlFile) || ""), /<!-- KAWAII VSCODE COLORS UI -->/);
  assert.equal(files.has(scriptFile), false);
  assert.equal(files.has(styleFile), false);
  assert.equal(removedAgain.status, "not-running");
});

test("WorkbenchPatchService removes orphan generated assets without reporting an active patch", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const workbenchDir = path.join(base, "electron-browser", "workbench");
  const htmlFile = path.join(workbenchDir, "workbench.html");
  const scriptFile = path.join(workbenchDir, "kawaii-vscode-colors-ui.js");
  const styleFile = path.join(workbenchDir, "kawaii-vscode-colors-ui.min.css");
  const files = new Map<string, MemoryFileValue>([
    [htmlFile, "<html></html>\n"],
    [scriptFile, "orphan script"],
    [styleFile, "orphan style"]
  ]);
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files)
  });

  const removed = service.removePatch(base);

  assert.equal(removed.status, "not-running");
  assert.equal(files.has(scriptFile), false);
  assert.equal(files.has(styleFile), false);
});

test("WorkbenchPatchService propagates access errors when generated asset deletion fails", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const workbenchDir = path.join(base, "electron-browser", "workbench");
  const htmlFile = path.join(workbenchDir, "workbench.html");
  const scriptFile = path.join(workbenchDir, "kawaii-vscode-colors-ui.js");
  const files = new Map<string, MemoryFileValue>([
    [htmlFile, '<html><!-- KAWAII VSCODE COLORS UI --><script src="kawaii-vscode-colors-ui.js?v=old"></script><!-- /KAWAII VSCODE COLORS UI --></html>\n'],
    [scriptFile, "script"]
  ]);
  const error: FileError = new Error("Access denied");
  error.code = "EACCES";
  const service = createWorkbenchPatchService({
    fileSystem: {
      ...createMemoryFileSystem(files),
      deleteFile() {
        throw error;
      }
    }
  });

  assert.throws(() => service.removePatch(base), /Access denied/);
});

test("WorkbenchPatchService returns workbench-not-found when no supported HTML file exists", () => {
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(new Map())
  });

  assert.deepEqual(service.applyAssets(path.normalize("C:/missing"), {
    scriptContent: "script",
    styleContent: "styles"
  }), {
    status: "workbench-not-found",
    paths: null
  });
  assert.deepEqual(service.removePatch(path.normalize("C:/missing")), {
    status: "workbench-not-found",
    paths: null
  });
  assert.equal(service.isEnabled(path.normalize("C:/missing")), false);
});

function createMemoryFileSystem(files: Map<string, MemoryFileValue>, writes: MemoryWrite[] = [], deletes: string[] = []) {
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

      return String(files.get(filePath) || "");
    },
    writeTextFile(filePath: string, content: string): void {
      writes.push({ filePath, content });
      files.set(filePath, content);
    },
    writeFile(filePath: string, content: Buffer): void {
      writes.push({ filePath, content });
      files.set(filePath, Buffer.from(content));
    },
    deleteFile(filePath: string): void {
      deletes.push(filePath);
      files.delete(filePath);
    },
    readFile(filePath: string): Buffer {
      const content = files.get(filePath);
      return Buffer.isBuffer(content) ? content : Buffer.from(String(content || ""));
    }
  };
}
