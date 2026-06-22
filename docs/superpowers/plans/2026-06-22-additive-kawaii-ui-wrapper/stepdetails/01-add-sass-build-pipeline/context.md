# Step 01 Context: Add Sass Build Pipeline

## Goal

Create the Sass pipeline that produces `src/css/kawaii-vscode-colors-ui.min.css` from `src/scss/kawaii-vscode-colors-ui.scss`.

## Current Source Facts

- `package.json` currently has no `sass` dev dependency.
- Script TypeScript compiles through `tsconfig.scripts.json` into `out-scripts`.
- Existing script patterns:
  - `scripts/build-color-theme.ts` has the TypeScript implementation.
  - `scripts/build-color-theme.js` is the stable wrapper invoked by npm.
  - `scripts/*.test.js` can import compiled code from `out-scripts`.
- Current injected chrome CSS source is `src/css/editor_chrome.css`.
- The first Sass migration should not manually port all CSS. The Sass entrypoint can include a generated bridge partial created from existing CSS.

## Files To Open

- `package.json`
- `package-lock.json`
- `tsconfig.scripts.json`
- `scripts/build-color-theme.ts`
- `scripts/build-color-theme.test.js`
- `src/css/editor_chrome.css`
- `test/unit/strict-typescript-package.test.ts`
- `.codex/docs.md`
- `.codex/system-map.md`

## New Files Owned By This Step

- `src/scss/kawaii-vscode-colors-ui.scss`
- `src/scss/generated/_editor-chrome.generated.scss`
- `src/css/kawaii-vscode-colors-ui.min.css`
- `scripts/build-ui-css.ts`
- `scripts/build-ui-css.js`
- `scripts/build-ui-css.test.js`

## Non-Goals

- Do not wire the generated CSS into the workbench patch in this step.
- Do not alter `src/js/theme_template.js` in this step.
- Do not migrate individual CSS rules by hand yet.
