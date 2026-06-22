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

interface MemoryWrite {
  readonly filePath: string;
  readonly content: string;
}

interface FileError extends Error {
  code?: string;
}

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("WorkbenchPatchService writes the Kawaii UI script and patches the workbench HTML", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench.esm.html");
  const scriptFile = path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.js");
  const files = new Map<string, string>([[htmlFile, "<html><body>Workbench</body></html>\n"]]);
  const writes: MemoryWrite[] = [];
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files, writes),
    versionToken: () => "step04"
  });

  const result = service.applyScriptTag(base, "compiled neon script");

  assert.equal(result.status, "activated");
  assert.deepEqual(result.paths, { htmlFile, templateFile: scriptFile });
  assert.equal(files.get(scriptFile), "compiled neon script");
  assert.match(files.get(htmlFile) || "", /kawaii-vscode-colors-ui\.js\?v=step04/);
  assert.equal(writes.length, 2);
});

test("WorkbenchPatchService reports reactivation without duplicating the marker", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
  const scriptFile = path.join(base, "electron-browser", "workbench", "kawaii-vscode-colors-ui.js");
  const files = new Map<string, string>([[htmlFile, "<html></html>\n"]]);
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files),
    versionToken: () => "one"
  });

  service.applyScriptTag(base, "first script");
  const reactivatedService = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files),
    versionToken: () => "two"
  });

  const result = reactivatedService.applyScriptTag(base, "second script");

  assert.equal(result.status, "reactivated");
  assert.deepEqual(result.paths, { htmlFile, templateFile: scriptFile });
  assert.equal(files.get(scriptFile), "second script");
  const patchedHtml = files.get(htmlFile) || "";
  assert.equal((patchedHtml.match(/<!-- KAWAII VSCODE COLORS UI -->/g) || []).length, 1);
  assert.doesNotMatch(patchedHtml, /kawaii-vscode-colors-ui\.js\?v=one/);
  assert.match(patchedHtml, /kawaii-vscode-colors-ui\.js\?v=two/);
});

test("WorkbenchPatchService removes an active patch and reports absent patches", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
  const files = new Map<string, string>([[htmlFile, "<html></html>\n"]]);
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files),
    versionToken: () => "remove"
  });

  service.applyScriptTag(base, "script");
  const removed = service.removeScriptTag(base);
  const removedAgain = service.removeScriptTag(base);

  assert.equal(removed.status, "removed");
  assert.doesNotMatch(files.get(htmlFile) || "", /<!-- KAWAII VSCODE COLORS UI -->/);
  assert.equal(removedAgain.status, "not-running");
});

test("WorkbenchPatchService returns workbench-not-found when no supported HTML file exists", () => {
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(new Map())
  });

  assert.deepEqual(service.applyScriptTag(path.normalize("C:/missing"), "script"), {
    status: "workbench-not-found",
    paths: null
  });
  assert.deepEqual(service.removeScriptTag(path.normalize("C:/missing")), {
    status: "workbench-not-found",
    paths: null
  });
  assert.equal(service.isEnabled(path.normalize("C:/missing")), false);
});

function createMemoryFileSystem(files: Map<string, string>, writes: MemoryWrite[] = []) {
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

      return files.get(filePath) || "";
    },
    writeTextFile(filePath: string, content: string): void {
      writes.push({ filePath, content });
      files.set(filePath, content);
    },
    readFile(filePath: string): Buffer {
      return Buffer.from(this.readTextFile(filePath));
    }
  };
}
