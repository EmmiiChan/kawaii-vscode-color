const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

let versionTools = {};

try {
  versionTools = require("./increment-package-version");
} catch (error) {
  if (!error || error.code !== "MODULE_NOT_FOUND") {
    throw error;
  }
}

test("increments the package patch version and synchronizes package-lock", () => {
  assert.equal(typeof versionTools.incrementPackageVersion, "function");

  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-version-bump-"));
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  const packageLockPath = path.join(workspaceRoot, "package-lock.json");

  try {
    fs.writeFileSync(
      packageJsonPath,
      `${JSON.stringify({
        name: "kawaii-vscode-color",
        version: "0.1.24"
      }, null, 2)}\n`,
      "utf8"
    );

    fs.writeFileSync(
      packageLockPath,
      `${JSON.stringify({
        name: "kawaii-vscode-color",
        version: "0.1.20",
        lockfileVersion: 3,
        packages: {
          "": {
            name: "kawaii-vscode-color",
            version: "0.1.20"
          }
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const result = versionTools.incrementPackageVersion(workspaceRoot);

    assert.deepEqual(result, {
      previousVersion: "0.1.24",
      nextVersion: "0.1.25"
    });

    assert.equal(JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version, "0.1.25");

    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));

    assert.equal(packageLock.version, "0.1.25");
    assert.equal(packageLock.packages[""].version, "0.1.25");
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("rejects unsupported package versions", () => {
  assert.equal(typeof versionTools.getNextPatchVersion, "function");
  assert.throws(
    () => versionTools.getNextPatchVersion("0.1"),
    /Expected package version to use numeric major\.minor\.patch format/
  );
});
