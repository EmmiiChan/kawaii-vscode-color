# Step 02 Context: Extend Workbench Patch Assets

## Goal

Change the workbench patch path and service contracts so the extension writes both runtime files:

- `kawaii-vscode-colors-ui.js`
- `kawaii-vscode-colors-ui.min.css`

## Current Source Facts

- `src/workbenchPatch.ts` currently exports `KAWAII_UI_SCRIPT_FILE_NAME`.
- `WorkbenchPatchPaths` currently has:

```ts
readonly htmlFile: string;
readonly templateFile: string;
```

- `resolveWorkbenchPatchPaths()` currently resolves `templateFile` to `kawaii-vscode-colors-ui.js`.
- `src/extensionHost/services/WorkbenchPatchService.ts` currently exposes `applyScriptTag(basePath, scriptContent)`.
- The service writes only `paths.templateFile` and `paths.htmlFile`.

## Files To Open

- `src/workbenchPatch.ts`
- `src/extensionHost/services/WorkbenchPatchService.ts`
- `test/unit/workbench-patch.test.ts`
- `test/unit/workbench-patch-service.test.ts`
- `test/unit/neon-effect-service.test.ts`

## Contract Change

Rename the path field conceptually from `templateFile` to `scriptFile` and add `styleFile`.

Expected interface:

```ts
export interface WorkbenchPatchPaths {
  readonly htmlFile: string;
  readonly scriptFile: string;
  readonly styleFile: string;
}
```

## Non-Goals

- Do not change runtime JS behavior in this step.
- Do not read Sass/CSS assets from `NeonEffectService` yet.
- Do not modify E2E behavior yet.
