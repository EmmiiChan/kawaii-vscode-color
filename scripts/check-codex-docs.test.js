const assert = require("node:assert/strict");
const test = require("node:test");

const { validateCodexDocFacts } = require("./check-codex-docs");

test("validateCodexDocFacts accepts documentation that contains all critical facts", () => {
  const result = validateCodexDocFacts(createFacts(), createDocuments());

  assert.deepEqual(result.errors, []);
});

test("validateCodexDocFacts ignores automatic patch version drift", () => {
  const facts = createFacts();
  facts.package.version = "0.1.99";
  facts.package.lockRootVersion = "0.1.99";
  const documents = createDocuments();

  const result = validateCodexDocFacts(facts, documents);

  assert.deepEqual(result.errors, []);
});

test("validateCodexDocFacts reports missing webview message contracts", () => {
  const documents = createDocuments({
    systemMap: createBaseDocs().systemMap.replace("- `reset-all`", "- `other-message`")
  });

  const result = validateCodexDocFacts(createFacts(), documents);

  assert.match(result.errors.join("\n"), /webview message.*reset-all/);
});

test("validateCodexDocFacts reports missing renderer placeholders", () => {
  const documents = createDocuments({
    systemMap: createBaseDocs().systemMap.replace("- `KAWAII_UI_STYLE_VERSION`", "- `OTHER_PLACEHOLDER`")
  });

  const result = validateCodexDocFacts(createFacts(), documents);

  assert.match(result.errors.join("\n"), /renderer placeholder.*KAWAII_UI_STYLE_VERSION/);
});

function createFacts() {
  return {
    package: {
      name: "kawaii-vscode-color",
      publisher: "ITEM-PIXEL",
      main: "./out/src/extension.js",
      vscodeEngine: "^1.33.0",
      activationEvents: [
        "onStartupFinished",
        "onCommand:kawaii_synthwave.openSettings"
      ],
      devDependencies: {
        jsdom: "29.1.1",
        mocha: "11.7.6"
      },
      lockfileVersion: 3
    },
    themes: [
      {
        label: "Dark Pink Kawaii",
        uiTheme: "vs-dark",
        manifestPath: "./src/generated-themes/kawaii_synthwave-generated-color-theme.json",
        baseThemePath: "src/core-themes/kawaii_synthwave-color-theme.json",
        overridesThemePath: "themes/dark-pink-kawaii.json",
        generatedThemePath: "src/generated-themes/kawaii_synthwave-generated-color-theme.json",
        generatedName: "Dark Pink Kawaii",
        type: "dark",
        hasSemanticTokenColors: true
      },
      {
        label: "Light Pink-Pastel Kawaii",
        uiTheme: "vs",
        manifestPath: "./src/generated-themes/kawaii_synthwave-generated-color-theme-light.json",
        baseThemePath: "src/core-themes/kawaii_synthwave-color-theme-light.json",
        overridesThemePath: "themes/light-pink-pastel-kawaii.json",
        generatedThemePath: "src/generated-themes/kawaii_synthwave-generated-color-theme-light.json",
        generatedName: "Light Pink-Pastel Kawaii",
        type: "light",
        hasSemanticTokenColors: true
      }
    ],
    criticalFiles: [
      "src/settings.ts",
      "src/settingsWebview.ts",
      "scripts/build-ui-css.js",
      "scripts/clean-test-artifacts.js",
      "scripts/check-codex-docs.js"
    ],
    webviewMessageTypes: [
      "ready",
      "reset-all"
    ],
    hostMessageTypes: [
      "state",
      "error"
    ],
    stateKeys: [
      "kawaii_synthwave.syncedSettingsBundle",
      "kawaii_synthwave.editorBackgroundImage"
    ],
    schemas: {
      current: "kawaii-vscode-color-settings",
      legacy: "kawaii-synthwave-settings",
      version: 1
    },
    rendererPlaceholders: [
      "DISABLE_GLOW",
      "KAWAII_UI_STYLE_VERSION"
    ],
    semanticTokenColors: {
      dark: true,
      light: true
    }
  };
}

function createDocuments(overrides = {}) {
  return {
    ...createBaseDocs(),
    ...overrides
  };
}

function createBaseDocs() {
  return {
    readme: [
      ".codex/AGENTS.md",
      ".codex/structure.md",
      ".codex/docs.md",
      ".codex/color_scheme_reference.md",
      ".codex/system-map.md",
      ".codex/change-impact.md"
    ].join("\n"),
    agents: [
      "kawaii-vscode-color",
      "ITEM-PIXEL",
      "^1.33.0",
      "jsdom@29.1.1",
      "mocha@11.7.6",
      "test:docs"
    ].join("\n"),
    docs: [
      "kawaii-vscode-color",
      "ITEM-PIXEL",
      "./out/src/extension.js",
      "^1.33.0",
      "onStartupFinished",
      "onCommand:kawaii_synthwave.openSettings",
      "lockfileVersion: 3",
      "jsdom 29.1.1",
      "mocha 11.7.6"
    ].join("\n"),
    structure: [
      "Dark Pink Kawaii",
      "Light Pink-Pastel Kawaii",
      "vs-dark",
      "vs",
      "src/settings.ts",
      "src/settingsWebview.ts",
      "scripts/build-ui-css.js",
      "scripts/clean-test-artifacts.js",
      "scripts/check-codex-docs.js",
      "onStartupFinished",
      "onCommand:kawaii_synthwave.openSettings",
      "enableNeon() reads kawaii_synthwave settings at execution time",
      ".codex/color_scheme_reference.md is read by src/settings.ts"
    ].join("\n"),
    colorReference: [
      "Kawaii VS Code Color Scheme Reference",
      "Dark Pink Kawaii",
      "Light Pink-Pastel Kawaii",
      "semanticTokenColors are defined",
      "src/core-themes/kawaii_synthwave-color-theme.json",
      "src/core-themes/kawaii_synthwave-color-theme-light.json",
      "themes/dark-pink-kawaii.json",
      "themes/light-pink-pastel-kawaii.json",
      "src/generated-themes/kawaii_synthwave-generated-color-theme.json",
      "src/generated-themes/kawaii_synthwave-generated-color-theme-light.json",
      ".codex/color_scheme_reference.md is read by src/settings.ts"
    ].join("\n"),
    systemMap: [
      "src/settings.ts",
      "src/settingsWebview.ts",
      "scripts/build-ui-css.js",
      "scripts/clean-test-artifacts.js",
      "scripts/check-codex-docs.js",
      "Dark Pink Kawaii",
      "Light Pink-Pastel Kawaii",
      "vs-dark",
      "vs",
      "./src/generated-themes/kawaii_synthwave-generated-color-theme.json",
      "./src/generated-themes/kawaii_synthwave-generated-color-theme-light.json",
      "src/core-themes/kawaii_synthwave-color-theme.json",
      "src/core-themes/kawaii_synthwave-color-theme-light.json",
      "themes/dark-pink-kawaii.json",
      "themes/light-pink-pastel-kawaii.json",
      "src/generated-themes/kawaii_synthwave-generated-color-theme.json",
      "src/generated-themes/kawaii_synthwave-generated-color-theme-light.json",
      "- `ready`",
      "- `reset-all`",
      "- `state`",
      "- `error`",
      "- `kawaii_synthwave.syncedSettingsBundle`",
      "- `kawaii_synthwave.editorBackgroundImage`",
      "- `kawaii-vscode-color-settings`",
      "- `kawaii-synthwave-settings`",
      "- `schemaVersion: 1`",
      "- `DISABLE_GLOW`",
      "- `KAWAII_UI_STYLE_VERSION`",
      "semanticTokenColors: dark true, light true"
    ].join("\n"),
    changeImpact: [
      "package.json",
      "src/settings*.ts",
      "webview messages",
      ".codex/system-map.md",
      ".codex/docs.md",
      ".codex/AGENTS.md",
      ".codex/color_scheme_reference.md",
      "test:docs"
    ].join("\n")
  };
}
