# Step 04 Analysis: Wire CSS Asset Generation

## Placeholder Ownership

There are two generated runtime assets:

- Script content needs:
  - `DISABLE_GLOW`
  - `NEON_BRIGHTNESS`
  - `KAWAII_UI_STYLE_VERSION`
- CSS content needs:
  - editor background placeholders;
  - empty editor logo placeholders.

`KAWAII_UI_STYLE_VERSION` must remain unresolved when `NeonEffectService` passes the script to `WorkbenchPatchService`, because the version token is generated in `WorkbenchPatchService`.

## Naming Decision

`buildCustomChromeStyles()` can stay temporarily, but `buildCustomUiStyles()` is clearer. If renamed, update all tests in the same step.

Recommended final name:

```ts
buildCustomUiStyles(uiStyles: string): string;
```

## Contract Change

Remove `CHROME_STYLES` from the runtime script path only after `src/js/theme_template.js` no longer uses it. Keep the placeholder in `rendererPlaceholders.ts` until all source files and tests no longer need it. Then remove it in Step 06 with docs updates.

## Risk Analysis

- If CSS placeholders are not replaced before writing `styleFile`, the workbench will load invalid configured CSS.
- If `[KAWAII_UI_STYLE_VERSION]` is replaced too early, reactivation may not bust the linked stylesheet cache.
- Unit tests must inspect both `scriptFile` and `styleFile`.
