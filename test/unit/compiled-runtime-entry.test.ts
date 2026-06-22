import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const packageManifest = require(path.join(process.cwd(), "package.json")) as { readonly main: string };
const {
  resolveExtensionAssetPath,
  resolveExtensionRoot
} = requireOut<typeof import("../../src/extensionRoot")>("extensionRoot");

const workspaceRoot = process.cwd();

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

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
