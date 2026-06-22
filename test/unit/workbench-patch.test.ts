import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  applyWorkbenchPatchScriptTag,
  isWorkbenchPatchEnabled,
  removeWorkbenchPatchScriptTag,
  resolveWorkbenchPatchPaths,
  resolveWorkbenchPaths
} = requireOut<typeof import("../../src/workbenchPatch")>("workbenchPatch");

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("applyWorkbenchPatchScriptTag inserts a cache-busted script before the closing html tag", () => {
  const html = "<html><body>Workbench</body></html>\n";

  const output = applyWorkbenchPatchScriptTag(html, "fixed-version");

  assert.match(
    output,
    /<!-- KAWAII VSCODE COLORS UI --><script src="kawaii-vscode-colors-ui\.js\?v=fixed-version"><\/script><!-- \/KAWAII VSCODE COLORS UI -->\n<\/html>/
  );
  assert.equal(isWorkbenchPatchEnabled(output), true);
});

test("applyWorkbenchPatchScriptTag replaces existing extension marker instead of duplicating it", () => {
  const firstOutput = applyWorkbenchPatchScriptTag("<html></html>", "one");
  const secondOutput = applyWorkbenchPatchScriptTag(firstOutput, "two");

  assert.equal((secondOutput.match(/<!-- KAWAII VSCODE COLORS UI -->/g) || []).length, 1);
  assert.match(secondOutput, /kawaii-vscode-colors-ui\.js\?v=two/);
  assert.doesNotMatch(secondOutput, /kawaii-vscode-colors-ui\.js\?v=one/);
});

test("applyWorkbenchPatchScriptTag replaces a legacy Neon Dreams marker", () => {
  const legacyHtml = [
    "<html>",
    '<!-- KAWAII SYNTHWAVE --><script src="neondreams.js?v=legacy"></script><!-- NEON DREAMS -->',
    "</html>"
  ].join("\n");

  const output = applyWorkbenchPatchScriptTag(legacyHtml, "current");

  assert.doesNotMatch(output, /neondreams\.js/);
  assert.doesNotMatch(output, /<!-- KAWAII SYNTHWAVE -->/);
  assert.match(output, /kawaii-vscode-colors-ui\.js\?v=current/);
});

test("removeWorkbenchPatchScriptTag removes only the marked extension script", () => {
  const html = [
    "<html>",
    '<script src="neondreams.js"></script>',
    applyWorkbenchPatchScriptTag("<body></body>", "fixed-version"),
    "</html>"
  ].join("\n");

  const output = removeWorkbenchPatchScriptTag(html);

  assert.match(output, /<script src="neondreams\.js"><\/script>/);
  assert.doesNotMatch(output, /<!-- KAWAII VSCODE COLORS UI -->/);
  assert.doesNotMatch(output, /kawaii-vscode-colors-ui\.js\?v=fixed-version/);
});

test("isWorkbenchPatchEnabled ignores unmarked legacy script references", () => {
  const html = '<html><script src="neondreams.js"></script></html>';

  assert.equal(isWorkbenchPatchEnabled(html), false);
});

test("removeWorkbenchPatchScriptTag removes legacy marked extension script tags", () => {
  const html = [
    "<html>",
    '<!-- KAWAII SYNTHWAVE --><script src="neondreams.js?v=legacy"></script><!-- NEON DREAMS -->',
    "</html>"
  ].join("\n");

  const output = removeWorkbenchPatchScriptTag(html);

  assert.doesNotMatch(output, /neondreams\.js/);
  assert.doesNotMatch(output, /<!-- KAWAII SYNTHWAVE -->/);
});

test("resolveWorkbenchPaths prefers electron-browser workbench.html", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const existingPath = path.join(base, "electron-browser", "workbench", "workbench.html");

  const result = resolveWorkbenchPaths(base, (candidatePath) => candidatePath === existingPath);

  assert.deepEqual(result, ["electron-browser", "workbench.html"]);
});

test("resolveWorkbenchPatchPaths resolves electron-sandbox workbench.esm.html", () => {
  const base = path.normalize("C:/fake/app/out/vs/code");
  const existingPath = path.join(base, "electron-sandbox", "workbench", "workbench.esm.html");

  const result = resolveWorkbenchPatchPaths(base, (candidatePath) => candidatePath === existingPath);

  assert.deepEqual(result, {
    htmlFile: existingPath,
    templateFile: path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.js")
  });
});
