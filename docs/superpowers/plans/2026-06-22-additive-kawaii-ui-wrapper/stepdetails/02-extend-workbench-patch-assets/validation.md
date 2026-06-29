# Step 02 Validation

## Red Check

After updating tests but before implementation:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/workbench-patch.test.js out-tests/test/unit/workbench-patch-service.test.js
```

Expected result: failures mentioning missing `styleFile`, `scriptFile`, or `applyAssets`.

## Green Check

After implementation:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/workbench-patch.test.js out-tests/test/unit/workbench-patch-service.test.js
```

Expected result: all selected tests pass.

## Type Check

Run:

```powershell
npm run type-check
```

Expected result: no TypeScript errors. This is important because `WorkbenchPatchPaths` is shared by service and tests.

## Diff Review

Review:

```powershell
git diff -- src/workbenchPatch.ts src/extensionHost/services/WorkbenchPatchService.ts test/unit/workbench-patch.test.ts test/unit/workbench-patch-service.test.ts
```

Confirm:

- `workbench.html` patch marker is unchanged.
- The CSS asset is written as a file, not inserted into the workbench HTML.
- The version token still applies to the script tag.
- `[KAWAII_UI_STYLE_VERSION]` is replaced in script content.
