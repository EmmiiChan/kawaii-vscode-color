const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const packageManifest = require("../../package.json");
const {
  resolveExtensionAssetPath,
  resolveExtensionRoot
} = require("../../out/src/extensionRoot");

const workspaceRoot = path.resolve(__dirname, "..", "..");

test("package main points to the compiled extension entry", () => {
  assert.equal(packageManifest.main, "./out/src/extension.js");
  assert.equal(
    require.resolve(path.join(workspaceRoot, packageManifest.main)),
    path.join(workspaceRoot, "out", "src", "extension.js")
  );
});

test("resolveExtensionRoot maps source and compiled directories to the package root", () => {
  assert.equal(path.resolve(resolveExtensionRoot(path.join(workspaceRoot, "src"))), workspaceRoot);
  assert.equal(path.resolve(resolveExtensionRoot(path.join(workspaceRoot, "out", "src"))), workspaceRoot);
});

test("resolveExtensionAssetPath resolves source assets from compiled output", () => {
  assert.equal(
    resolveExtensionAssetPath(path.join(workspaceRoot, "out", "src"), "src", "css", "editor_chrome.css"),
    path.join(workspaceRoot, "src", "css", "editor_chrome.css")
  );
});
