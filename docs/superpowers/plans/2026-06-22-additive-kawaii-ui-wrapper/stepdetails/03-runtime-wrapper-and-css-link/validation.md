# Step 03 Validation

## Red Check

After adding tests but before implementation:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/renderer-theme-template.test.js
```

Expected result: failures proving the runtime still embeds `[CHROME_STYLES]` or lacks `document.documentElement`.

## Green Check

After implementation:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/renderer-theme-template.test.js
node --check src/js/theme_template.js
```

Expected result: pass.

## Manual Source Review

Run:

```powershell
rg -n "CHROME_STYLES|kawaii_synthwave-chrome-styles|replaceTokens\\(|document\\.documentElement|kawaii-vscode-colors-ui" src\\js\\theme_template.js
```

Confirm:

- `CHROME_STYLES` is gone from `src/js/theme_template.js`.
- `document.documentElement` is present.
- `kawaii-vscode-colors-ui` is present.
- Token generation scopes rules under the wrapper.

## Risk Check

Confirm no new timer APIs were introduced:

```powershell
rg -n "setInterval|setTimeout|requestAnimationFrame" src\\js\\theme_template.js
```

Expected result: no matches.
