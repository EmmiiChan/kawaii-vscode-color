# Step 05 Validation

## Red Check

After adding tests but before scoping fixes:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/extension-editor-background-fit.test.js out-tests/test/unit/empty-editor-logo-styles.test.js
```

Expected result: failures around unscoped selectors or missing wrapper prefix.

## Green Check

After implementation:

```powershell
npm run build:ui-css
npm run compile
npm run compile:tests
node --test out-tests/test/unit/extension-editor-background-fit.test.js out-tests/test/unit/empty-editor-logo-styles.test.js
```

Expected result: pass.

## Selector Audit

Run:

```powershell
rg -n "^\\.monaco|^\\.monaco-workbench|^\\[class" src\\css\\kawaii-vscode-colors-ui.min.css src\\scss
```

Expected result:

- No unwrapped top-level `.monaco*` selectors in the generated CSS.
- Root `[class~="vs-dark"]` selectors are emitted as `.kawaii-vscode-colors-ui[class~="vs-dark"]...`.

## Visual Risk Note

This step changes visual CSS scoping. Full confidence requires Step 07 gated E2E screenshots.
