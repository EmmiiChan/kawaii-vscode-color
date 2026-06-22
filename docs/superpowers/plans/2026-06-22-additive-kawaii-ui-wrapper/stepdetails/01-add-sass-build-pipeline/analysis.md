# Step 01 Analysis: Add Sass Build Pipeline

## Design Decision

Use Sass as an intermediate compiler, but keep the first migration cheap by generating a Sass partial from `src/css/editor_chrome.css`.

The entrypoint should be:

```scss
@use "sass:meta";

.kawaii-vscode-colors-ui {
  @include meta.load-css("generated/editor-chrome.generated");
}
```

This allows legacy CSS rules to compile under the wrapper without immediately rewriting the whole stylesheet by hand.

## Bridge Generation Requirement

The bridge generator must understand the two selector classes that matter during migration:

- Normal workbench descendants:

```css
.monaco-editor {
  position: relative;
}
```

Inside the wrapper this becomes:

```scss
.monaco-editor {
  position: relative;
}
```

Because it is loaded inside `.kawaii-vscode-colors-ui`, Sass emits:

```css
.kawaii-vscode-colors-ui .monaco-editor {
  position: relative;
}
```

- Root theme selectors:

```css
[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"] {
  --kawaii-active-glow: #fc28a825;
}
```

Inside the wrapper this must become:

```scss
&[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"] {
  --kawaii-active-glow: #fc28a825;
}
```

Sass emits:

```css
.kawaii-vscode-colors-ui[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"] {
  --kawaii-active-glow: #fc28a825;
}
```

This matters because the wrapper class will be placed on `<html>`, which is also where VS Code theme classes are expected to be available. A descendant selector would be wrong.

## Risk Analysis

- CSS parsing by regex is not a general CSS parser. For this project it is acceptable as a short-lived bridge only because `src/css/editor_chrome.css` is simple and controlled.
- The bridge must not try to rewrite declarations, URLs, comments, or placeholders.
- Adding `sass` changes dependency inventory. `package-lock.json`, `.codex/docs.md`, and package docs must be updated in the later documentation step.
- The generated CSS should be committed because the extension runtime reads source assets at runtime.

## Validation Criteria

- `scripts/build-ui-css.test.js` proves Sass compilation works.
- The bridge test proves root selectors become `&...` rather than descendant selectors.
- `src/css/kawaii-vscode-colors-ui.min.css` exists and contains `.kawaii-vscode-colors-ui`.
