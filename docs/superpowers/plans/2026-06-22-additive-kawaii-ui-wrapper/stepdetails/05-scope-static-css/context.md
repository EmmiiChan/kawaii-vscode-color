# Step 05 Context: Scope Static CSS

## Goal

Move static workbench chrome rules into wrapper-safe Sass/CSS and ensure generated no-tab logo rules are scoped under `.kawaii-vscode-colors-ui`.

## Current Source Facts

- `src/css/editor_chrome.css` contains unscoped workbench/Monaco selectors.
- `src/emptyEditorLogoStyles.ts` generates no-tab logo selectors without a wrapper prefix.
- Step 01 introduced a generated bridge partial that allows existing CSS to compile under `.kawaii-vscode-colors-ui`.
- The wrapper class is on `<html>` or `<body>`, so descendant selectors are valid for most Monaco/workbench nodes.

## Files To Open

- `src/css/editor_chrome.css`
- `src/scss/kawaii-vscode-colors-ui.scss`
- `src/scss/generated/_editor-chrome.generated.scss`
- `src/css/kawaii-vscode-colors-ui.min.css`
- `src/emptyEditorLogoStyles.ts`
- `test/unit/empty-editor-logo-styles.test.ts`
- `test/unit/extension-editor-background-fit.test.ts`

## Migration Strategy

Keep the generated bridge initially. Migrate sections into hand-authored Sass only after tests prove scoping.
