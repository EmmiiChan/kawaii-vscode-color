const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

let cleanTools = {};

try {
  cleanTools = require("./clean-test-artifacts");
} catch (error) {
  if (!error || error.code !== "MODULE_NOT_FOUND") {
    throw error;
  }
}

test("cleanTestArtifacts removes generated test artifact directories and preserves source files", () => {
  assert.equal(typeof cleanTools.cleanTestArtifacts, "function");

  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-clean-artifacts-"));
  const sourceFile = path.join(workspaceRoot, "src", "keep.ts");

  try {
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "export {};\n", "utf8");

    for (const relativePath of [".vscode-test", "test-results", "playwright-report", "out-tests"]) {
      fs.mkdirSync(path.join(workspaceRoot, relativePath, "nested"), { recursive: true });
      fs.writeFileSync(path.join(workspaceRoot, relativePath, "nested", "artifact.txt"), "artifact", "utf8");
    }

    const result = cleanTools.cleanTestArtifacts({
      workspaceRoot,
      output: { write() {} }
    });

    assert.deepEqual(result.removedRelativePaths, [
      ".vscode-test",
      "test-results",
      "playwright-report",
      "out-tests"
    ]);
    assert.deepEqual(result.missingRelativePaths, []);

    for (const relativePath of result.removedRelativePaths) {
      assert.equal(fs.existsSync(path.join(workspaceRoot, relativePath)), false);
    }

    assert.equal(fs.existsSync(sourceFile), true);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("cleanTestArtifacts reports missing artifact directories without failing", () => {
  assert.equal(typeof cleanTools.cleanTestArtifacts, "function");

  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-clean-missing-"));

  try {
    const result = cleanTools.cleanTestArtifacts({
      workspaceRoot,
      artifactRelativePaths: [".vscode-test", "test-results"],
      output: { write() {} }
    });

    assert.deepEqual(result.removedRelativePaths, []);
    assert.deepEqual(result.missingRelativePaths, [".vscode-test", "test-results"]);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("cleanTestArtifacts rejects artifact paths outside the workspace", () => {
  assert.equal(typeof cleanTools.cleanTestArtifacts, "function");

  assert.throws(
    () => cleanTools.cleanTestArtifacts({
      workspaceRoot: path.join(os.tmpdir(), "kawaii-clean-contained"),
      artifactRelativePaths: ["../outside"],
      output: { write() {} }
    }),
    /outside the workspace/
  );
});
