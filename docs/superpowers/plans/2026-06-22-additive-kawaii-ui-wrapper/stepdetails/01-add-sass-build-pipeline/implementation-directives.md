# Step 01 Implementation Directives

## 1. Write The Failing Test

Create `scripts/build-ui-css.test.js` with:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildKawaiiUiCss,
  generateScopedCssBridge
} = require("../out-scripts/scripts/build-ui-css");

test("buildKawaiiUiCss compiles scoped Sass to compressed CSS", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-ui-css-"));
  const sourceFile = path.join(tempRoot, "kawaii-vscode-colors-ui.scss");
  const outputFile = path.join(tempRoot, "kawaii-vscode-colors-ui.min.css");

  fs.writeFileSync(sourceFile, [
    ".kawaii-vscode-colors-ui {",
    "  .monaco-editor {",
    "    background: var(--vscode-editor-background);",
    "  }",
    "}"
  ].join("\n"));

  buildKawaiiUiCss({ sourceFile, outputFile });

  const output = fs.readFileSync(outputFile, "utf8");
  assert.match(output, /\.kawaii-vscode-colors-ui \.monaco-editor/);
  assert.doesNotMatch(output, /\n\s{2,}/);
});

test("generateScopedCssBridge keeps root selectors on the wrapper itself", () => {
  const bridge = generateScopedCssBridge([
    '[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"] {',
    '  --kawaii-active-glow: #fc28a825;',
    '}',
    '.monaco-editor {',
    '  background: transparent;',
    '}'
  ].join("\n"));

  assert.match(bridge, /&\[class~="vs-dark"\]\[class\*="kawaii-vscode-color-generated-color-theme-json"\]/);
  assert.match(bridge, /\.monaco-editor/);
  assert.doesNotMatch(bridge, /\.kawaii-vscode-colors-ui \[class~="vs-dark"\]/);
});
```

## 2. Add Package Script And Dependency

Add to `package.json` scripts:

```json
"build:ui-css": "npm run compile:scripts && node scripts/build-ui-css.js"
```

Update `build:local` so `npm run build:ui-css` runs before packaging.

Update `vscode:prepublish` so it runs:

```json
"vscode:prepublish": "npm run compile && npm run build:theme && npm run build:ui-css"
```

Add dev dependency:

```json
"sass": "^1.93.3"
```

Run `npm install` so `package-lock.json` records the exact resolved dependency tree.

## 3. Implement `scripts/build-ui-css.ts`

Create `scripts/build-ui-css.ts`:

```ts
import fs = require("node:fs");
import path = require("node:path");
import sass = require("sass");

export interface BuildKawaiiUiCssOptions {
  readonly generatedPartialFile?: string;
  readonly legacyCssFile?: string;
  readonly outputFile: string;
  readonly sourceFile: string;
}

export function generateScopedCssBridge(css: string): string {
  return String(css || "").replace(
    /(^|})\s*([^{}@][^{}]*)\{/g,
    (_match, previousClose: string, selectorList: string) => {
      const scopedSelectors = selectorList
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean)
        .map((selector) => selector.startsWith("[class~=") ? `&${selector}` : selector)
        .join(",\n");

      return `${previousClose ? `${previousClose}\n` : ""}${scopedSelectors} {`;
    }
  );
}

export function buildKawaiiUiCss(options: BuildKawaiiUiCssOptions): void {
  if (options.legacyCssFile && options.generatedPartialFile) {
    const bridgeCss = generateScopedCssBridge(fs.readFileSync(options.legacyCssFile, "utf8"));
    fs.mkdirSync(path.dirname(options.generatedPartialFile), { recursive: true });
    fs.writeFileSync(options.generatedPartialFile, `${bridgeCss.trim()}\n`);
  }

  const result = sass.compile(options.sourceFile, {
    style: "compressed"
  });

  fs.mkdirSync(path.dirname(options.outputFile), { recursive: true });
  fs.writeFileSync(options.outputFile, `${result.css}\n`);
}

export function buildDefaultKawaiiUiCss(workspaceRoot: string = path.resolve(__dirname, "..")): void {
  buildKawaiiUiCss({
    generatedPartialFile: path.join(workspaceRoot, "src", "scss", "generated", "_editor-chrome.generated.scss"),
    legacyCssFile: path.join(workspaceRoot, "src", "css", "editor_chrome.css"),
    sourceFile: path.join(workspaceRoot, "src", "scss", "kawaii-vscode-colors-ui.scss"),
    outputFile: path.join(workspaceRoot, "src", "css", "kawaii-vscode-colors-ui.min.css")
  });
}

if (require.main === module) {
  buildDefaultKawaiiUiCss();
}
```

## 4. Add Sass Entrypoint

Create `src/scss/kawaii-vscode-colors-ui.scss`:

```scss
@use "sass:meta";

.kawaii-vscode-colors-ui {
  @include meta.load-css("generated/editor-chrome.generated");
}
```

## 5. Generate CSS

Run:

```powershell
npm run build:ui-css
```

Confirm these files exist:

- `src/scss/generated/_editor-chrome.generated.scss`
- `src/css/kawaii-vscode-colors-ui.min.css`
