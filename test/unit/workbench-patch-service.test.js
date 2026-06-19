const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  createWorkbenchPatchService
} = require("../../out/src/extensionHost/services/WorkbenchPatchService");

test("WorkbenchPatchService writes the Neon script and patches the workbench HTML", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-sandbox", "workbench", "workbench.esm.html");
  const scriptFile = path.join(base, "electron-sandbox", "workbench", "neondreams.js");
  const files = new Map([[htmlFile, "<html><body>Workbench</body></html>\n"]]);
  const writes = [];
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files, writes),
    versionToken: () => "step04"
  });

  const result = service.applyScriptTag(base, "compiled neon script");

  assert.equal(result.status, "activated");
  assert.deepEqual(result.paths, { htmlFile, templateFile: scriptFile });
  assert.equal(files.get(scriptFile), "compiled neon script");
  assert.match(files.get(htmlFile), /neondreams\.js\?v=step04/);
  assert.equal(writes.length, 2);
});

test("WorkbenchPatchService reports reactivation without duplicating the marker", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
  const scriptFile = path.join(base, "electron-browser", "workbench", "neondreams.js");
  const files = new Map([[htmlFile, "<html></html>\n"]]);
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
  assert.equal((files.get(htmlFile).match(/<!-- KAWAII SYNTHWAVE -->/g) || []).length, 1);
  assert.doesNotMatch(files.get(htmlFile), /neondreams\.js\?v=one/);
  assert.match(files.get(htmlFile), /neondreams\.js\?v=two/);
});

test("WorkbenchPatchService removes an active patch and reports absent patches", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
  const files = new Map([[htmlFile, "<html></html>\n"]]);
  const service = createWorkbenchPatchService({
    fileSystem: createMemoryFileSystem(files),
    versionToken: () => "remove"
  });

  service.applyScriptTag(base, "script");
  const removed = service.removeScriptTag(base);
  const removedAgain = service.removeScriptTag(base);

  assert.equal(removed.status, "removed");
  assert.doesNotMatch(files.get(htmlFile), /<!-- KAWAII SYNTHWAVE -->/);
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

function createMemoryFileSystem(files, writes = []) {
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

      return files.get(filePath);
    },
    writeTextFile(filePath, content) {
      writes.push({ filePath, content });
      files.set(filePath, content);
    },
    readFile(filePath) {
      return Buffer.from(this.readTextFile(filePath));
    }
  };
}
