# Step 02 Analysis: Extend Workbench Patch Assets

## Design Decision

The HTML patch should remain a single script tag. The CSS file is not inserted directly into `workbench.html`; it is written next to the JS and linked by the runtime JS after reload.

This preserves the existing removal model:

- disable removes the marked script tag;
- no extra HTML marker is needed for CSS;
- stale CSS files may remain on disk, matching current generated-script cleanup behavior.

## API Shape

Use `applyAssets(basePath, assets)` instead of overloading `applyScriptTag(basePath, scriptContent)`.

```ts
export interface WorkbenchPatchAssets {
  readonly scriptContent: string;
  readonly styleContent: string;
}
```

This makes it impossible to call the new service while forgetting the CSS asset.

## Compatibility Decision

The old `applyScriptTag()` name should be removed only if every caller is updated in the same change. If staged migration is easier, keep a temporary compatibility method:

```ts
applyScriptTag(basePath: string, scriptContent: string): WorkbenchPatchApplyResult {
  return this.applyAssets(basePath, {
    scriptContent,
    styleContent: ""
  });
}
```

Prefer removing it by the end of Step 04.

## Risk Analysis

- Renaming `templateFile` affects tests and E2E snapshots. Update all compile errors deliberately.
- Version token replacement for `[KAWAII_UI_STYLE_VERSION]` should happen in `WorkbenchPatchService`, because only this service owns the cache-busting token.
- The workbench HTML still references only JS, so `applyWorkbenchPatchScriptTag()` remains mostly unchanged.

## Validation Criteria

- Unit tests prove both files are written.
- Unit tests prove the HTML still gets exactly one marked script tag.
- Missing workbench paths still return `workbench-not-found` without writes.
