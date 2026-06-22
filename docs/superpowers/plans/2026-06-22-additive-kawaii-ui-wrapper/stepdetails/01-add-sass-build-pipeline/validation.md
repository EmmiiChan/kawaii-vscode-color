# Step 01 Validation

## Red Check

Before implementation:

```powershell
npm run compile:scripts
node --test scripts/build-ui-css.test.js
```

Expected result: failure because `out-scripts/scripts/build-ui-css.js` is missing.

## Green Checks

After implementation:

```powershell
npm install
npm run compile:scripts
node --test scripts/build-ui-css.test.js
npm run build:ui-css
```

Expected results:

- `node --test scripts/build-ui-css.test.js` passes.
- `src/scss/generated/_editor-chrome.generated.scss` exists.
- `src/css/kawaii-vscode-colors-ui.min.css` exists.
- Generated CSS contains `.kawaii-vscode-colors-ui`.

## Diff Review

Review:

```powershell
git diff -- package.json package-lock.json scripts/build-ui-css.ts scripts/build-ui-css.test.js src/scss src/css/kawaii-vscode-colors-ui.min.css
```

Confirm:

- No runtime behavior is wired yet.
- Only `sass` was added as a dependency.
- `package-lock.json` changed only because of `sass` and its dependency tree.

## Required Later Follow-Up

Because this step changes package metadata and runtime assets, Step 06 must update `.codex/docs.md`, `.codex/system-map.md`, `.codex/structure.md`, and `README.md`.
