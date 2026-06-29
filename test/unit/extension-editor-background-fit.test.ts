import assert = require("node:assert/strict");
import fs = require("node:fs");
import path = require("node:path");
import test = require("node:test");

const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};

const {
  getEditorBackgroundFitArea,
  normalizeEditorBackgroundFit
} = requireOut<typeof import("../../src/extensionHost/services/NeonEffectService")>(
  "extensionHost",
  "services",
  "NeonEffectService"
);
const {
  KAWAII_THEME_WRAPPER_SELECTORS
} = requireOut<typeof import("../../src/renderer/ThemeTemplate")>(
  "renderer",
  "ThemeTemplate"
);

const EXPECTED_EDITOR_BACKGROUND_FIT_AREAS = {
  full: { top: "0", right: "auto", bottom: "auto", left: "0", width: "100%", height: "100%" },
  top: { top: "0", right: "auto", bottom: "auto", left: "0", width: "100%", height: "50%" },
  bottom: { top: "auto", right: "auto", bottom: "0", left: "0", width: "100%", height: "50%" },
  left: { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "100%" },
  right: { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "100%" },
  "top-left": { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "50%" },
  "top-right": { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "50%" },
  "bottom-left": { top: "auto", right: "auto", bottom: "0", left: "0", width: "50%", height: "50%" },
  "bottom-right": { top: "auto", right: "0", bottom: "0", left: "auto", width: "50%", height: "50%" }
};

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("extension maps every editor background fit option to its CSS area", () => {
  for (const [fit, expectedArea] of Object.entries(EXPECTED_EDITOR_BACKGROUND_FIT_AREAS)) {
    assert.equal(normalizeEditorBackgroundFit(fit), fit);
    assert.deepEqual(toPlainObject(getEditorBackgroundFitArea(fit)), expectedArea);
  }

  assert.equal(normalizeEditorBackgroundFit(" Top-Right "), "top-right");
  assert.equal(normalizeEditorBackgroundFit("botton-left"), "bottom-left");
  assert.deepEqual(toPlainObject(getEditorBackgroundFitArea("unknown")), EXPECTED_EDITOR_BACKGROUND_FIT_AREAS.full);
});

test("editor chrome CSS applies page background variables to every theme wrapper fallback", () => {
  const editorChromeCss = fs.readFileSync(path.join(process.cwd(), "src", "css", "editor_chrome.css"), "utf8");
  const editorBackgroundRule = findRuleWithBodyText(editorChromeCss, "--kawaii-editor-background-image:");

  assert.ok(editorBackgroundRule, "Expected editor chrome CSS to define editor background variables.");
  for (const selector of KAWAII_THEME_WRAPPER_SELECTORS) {
    assert.match(editorBackgroundRule.selectorText, new RegExp(escapeRegExp(selector)));
  }
});

test("compiled Kawaii UI CSS scopes editor chrome selectors under full inner theme wrappers", () => {
  const uiCss = fs.readFileSync(path.join(process.cwd(), "src", "css", "kawaii-vscode-colors-ui.min.css"), "utf8");

  assert.match(uiCss, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii\.kawaii-effect-editor-background \.monaco-editor/);
  assert.match(uiCss, /\.kawaii-vscode-colors-ui\.light-pink-pastel-kawaii\.kawaii-effect-editor-background \.monaco-editor/);
  assert.match(uiCss, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii\[class~=vs-dark\]/);
  assert.match(uiCss, /\.kawaii-vscode-colors-ui\.light-pink-pastel-kawaii\[class~=vs\]/);
  assert.doesNotMatch(uiCss, /\.kawaii-vscode-colors-ui \.monaco-editor/);
  assert.doesNotMatch(uiCss, /^\.monaco-editor/m);
});

test("editor background theme wrapper fallbacks match legacy, renamed, and current theme classes", () => {
  const dom = new JSDOM(`
    <div id="dark-legacy-underscore" class="vs-dark kawaii_synthwave-generated-color-theme-json"></div>
    <div id="dark-legacy-hyphen" class="vs-dark kawaii-synthwave-generated-color-theme-json"></div>
    <div id="dark-current" class="vs-dark kawaii-vscode-color-generated-color-theme-json"></div>
    <div id="light-legacy-underscore" class="vs kawaii_synthwave-generated-color-theme-light-json"></div>
    <div id="light-legacy-hyphen" class="vs kawaii-synthwave-generated-color-theme-light-json"></div>
    <div id="light-current" class="vs kawaii-vscode-color-generated-color-theme-light-json"></div>
  `);
  const expectedMatches = [
    "dark-legacy-underscore",
    "dark-legacy-hyphen",
    "dark-current",
    "light-legacy-underscore",
    "light-legacy-hyphen",
    "light-current"
  ];

  const matches = KAWAII_THEME_WRAPPER_SELECTORS.map((selector) => {
    const match = dom.window.document.querySelector(selector);
    return match ? match.id : "";
  });

  assert.deepEqual(matches, expectedMatches);
});

function toPlainObject(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function findRuleWithBodyText(css: string, bodyText: string): { readonly selectorText: string; readonly body: string } | undefined {
  return css.split("}").map((rule) => {
    const [selectorText, body] = rule.split("{");
    return {
      selectorText: selectorText ? selectorText.trim() : "",
      body: body || ""
    };
  }).find((rule) => rule.body.includes(bodyText));
}

function escapeRegExp(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
