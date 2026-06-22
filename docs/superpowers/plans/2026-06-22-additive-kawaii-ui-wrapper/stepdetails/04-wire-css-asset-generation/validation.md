# Step 04 Validation

## Red Check

After updating tests but before implementation:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/neon-effect-service.test.js out-tests/test/unit/shared-contracts.test.js
```

Expected result: failures around missing `styleFile`, unresolved placeholders, or missing `KAWAII_UI_STYLE_VERSION`.

## Green Check

After implementation:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/neon-effect-service.test.js out-tests/test/unit/shared-contracts.test.js out-tests/test/unit/workbench-patch-service.test.js
```

Expected result: pass.

## Placeholder Scan

Run:

```powershell
rg -n "CHROME_STYLES|KAWAII_UI_STYLE_VERSION|EDITOR_BACKGROUND_IMAGE|EMPTY_EDITOR_LOGO_STYLES" src test
```

Confirm:

- `KAWAII_UI_STYLE_VERSION` appears in script template and placeholder contract.
- `EDITOR_BACKGROUND_*` and `EMPTY_EDITOR_LOGO_STYLES` appear in CSS/template paths only where expected.
- `CHROME_STYLES` has no active runtime use if it was removed in Step 03.

## Diff Review

Review:

```powershell
git diff -- src/extensionHost/services/NeonEffectService.ts src/shared/contracts/rendererPlaceholders.ts test/unit/neon-effect-service.test.ts test/unit/shared-contracts.test.ts
```

Confirm:

- `NeonEffectService` writes two assets through `applyAssets`.
- `KAWAII_UI_STYLE_VERSION` remains unresolved before `WorkbenchPatchService`.
- CSS placeholders are replaced before writing `styleFile`.
