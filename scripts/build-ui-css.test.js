const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildKawaiiUiCss,
  generateScopedCssBridge
} = require("./build-ui-css");

test("generateScopedCssBridge scopes root theme selectors with Sass parent selectors", () => {
  const sourceCss = [
    ".monaco-editor {",
    "  background: transparent;",
    "}",
    "",
    ".monaco-workbench .active-item-indicator {",
    "  display: none;",
    "}",
    "",
    ".codicon-lightbulb:before {",
    "  filter: drop-shadow(0 0 5px #03edf9);",
    "}",
    "",
    "[class~=\"vs-dark\"][class*=\"kawaii-vscode-color-generated-color-theme-json\"],",
    "[class~=\"vs\"][class*=\"kawaii-vscode-color-generated-color-theme-light-json\"] {",
    "  --kawaii-active-glow: #fc28a825;",
    "}",
    "",
    "[EMPTY_EDITOR_LOGO_STYLES]"
  ].join("\n");

  const generatedScss = generateScopedCssBridge(sourceCss);

  assert.match(generatedScss, /&\.kawaii-effect-editor-background \.monaco-editor \{/);
  assert.match(generatedScss, /&\.kawaii-effect-glow \.monaco-workbench \.active-item-indicator \{/);
  assert.match(generatedScss, /&\.kawaii-effect-glow \.codicon-lightbulb:before \{/);
  assert.match(generatedScss, /&\[class~="vs-dark"\]\[class\*="kawaii-vscode-color-generated-color-theme-json"\]/);
  assert.match(generatedScss, /\n\s+\[class~="vs-dark"\]\[class\*="kawaii-vscode-color-generated-color-theme-json"\]/);
  assert.match(generatedScss, /&\[class~="vs"\]\[class\*="kawaii-vscode-color-generated-color-theme-light-json"\]/);
  assert.doesNotMatch(generatedScss, /\[EMPTY_EDITOR_LOGO_STYLES\]/);
});

test("buildKawaiiUiCss generates the bridge partial and minified wrapped css", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-ui-css-"));
  const sourceCssPath = path.join(workspaceRoot, "src", "css", "editor_chrome.css");
  const generatedScssPath = path.join(workspaceRoot, "src", "scss", "generated", "_editor-chrome.generated.scss");
  const entrypointScssPath = path.join(workspaceRoot, "src", "scss", "kawaii-vscode-colors-ui.scss");
  const outputCssPath = path.join(workspaceRoot, "src", "css", "kawaii-vscode-colors-ui.min.css");

  fs.mkdirSync(path.dirname(sourceCssPath), { recursive: true });
  fs.mkdirSync(path.dirname(entrypointScssPath), { recursive: true });
  fs.writeFileSync(sourceCssPath, [
    "[class~=\"vs-dark\"][class*=\"kawaii-vscode-color-generated-color-theme-json\"] {",
    "  --kawaii-active-glow: #fc28a825;",
    "}",
    "",
    ".monaco-editor {",
    "  background: transparent;",
    "}",
    "",
    ".monaco-workbench .active-item-indicator {",
    "  display: none;",
    "}",
    "",
    "[EMPTY_EDITOR_LOGO_STYLES]"
  ].join("\n"));
  fs.writeFileSync(entrypointScssPath, [
    "@use \"generated/editor-chrome.generated\" as editorChrome;",
    "",
    ".kawaii-vscode-colors-ui.dark-pink-kawaii {",
    "  @include editorChrome.styles;",
    "}",
    "",
    ".kawaii-vscode-colors-ui.light-pink-pastel-kawaii {",
    "  @include editorChrome.styles;",
    "}"
  ].join("\n"));

  buildKawaiiUiCss({
    workspaceRoot,
    sourceCssPath,
    generatedScssPath,
    entrypointScssPath,
    outputCssPath
  });

  const generatedScss = fs.readFileSync(generatedScssPath, "utf8");
  const outputCss = fs.readFileSync(outputCssPath, "utf8");

  assert.match(generatedScss, /@mixin styles/);
  assert.match(generatedScss, /&\[class~="vs-dark"\]/);
  assert.match(outputCss, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii\[class~=vs-dark\]/);
  assert.match(outputCss, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii \[class~=vs-dark\]/);
  assert.match(outputCss, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii\.kawaii-effect-editor-background \.monaco-editor/);
  assert.match(outputCss, /\.kawaii-vscode-colors-ui\.light-pink-pastel-kawaii\.kawaii-effect-editor-background \.monaco-editor/);
  assert.match(outputCss, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii\.kawaii-effect-glow \.monaco-workbench/);
  assert.doesNotMatch(outputCss, /\.kawaii-vscode-colors-ui \.monaco-editor/);
  assert.match(outputCss, /\[EMPTY_EDITOR_LOGO_STYLES\]/);
});
