# Step 05 Implementation Directives

## 1. Add Static CSS Scope Tests

In `test/unit/extension-editor-background-fit.test.ts`, add:

```ts
const uiCss = fs.readFileSync(path.join(process.cwd(), "src", "css", "kawaii-vscode-colors-ui.min.css"), "utf8");

assert.match(uiCss, /\.kawaii-vscode-colors-ui \.monaco-editor/);
assert.doesNotMatch(uiCss, /^\.monaco-editor/m);
```

Also assert root theme selectors are not descendants:

```ts
assert.doesNotMatch(uiCss, /\.kawaii-vscode-colors-ui \[class~="vs-dark"\]/);
assert.match(uiCss, /\.kawaii-vscode-colors-ui\[class~="vs-dark"\]/);
```

## 2. Prefix Empty Logo Styles

In `src/emptyEditorLogoStyles.ts`, add:

```ts
const EMPTY_EDITOR_LOGO_WRAPPER_SELECTOR = ".kawaii-vscode-colors-ui";
```

Change selector generation to:

```ts
const selectors = EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS
  .map((selector) => `${EMPTY_EDITOR_LOGO_WRAPPER_SELECTOR} ${selector}`)
  .join(",\n");
```

## 3. Update Empty Logo Tests

In `test/unit/empty-editor-logo-styles.test.ts`, assert:

```ts
assert.match(styles, /\.kawaii-vscode-colors-ui /);
assert.doesNotMatch(styles, /^\.letterpress/m);
```

Use the actual selector names from `EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS`.

## 4. Move High-Risk Selectors To Hand-Authored Sass

If bridge output produces wrong root selector shape, create a hand-authored partial:

```scss
// src/scss/_theme-vars.scss
&[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"] {
  --kawaii-active-glow: var(--vscode-editorGroup-focusedEmptyBorder, #fc28a825);
}
```

Then import it inside the wrapper:

```scss
@use "sass:meta";

.kawaii-vscode-colors-ui {
  @include meta.load-css("theme-vars");
  @include meta.load-css("generated/editor-chrome.generated");
}
```

## 5. Rebuild CSS

Run:

```powershell
npm run build:ui-css
```

Commit the generated CSS only after reviewing that selectors are scoped.
