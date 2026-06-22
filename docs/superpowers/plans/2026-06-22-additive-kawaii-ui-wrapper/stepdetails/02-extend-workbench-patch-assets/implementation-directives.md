# Step 02 Implementation Directives

## 1. Update Workbench Path Tests First

In `test/unit/workbench-patch.test.ts`, update the final expectation:

```ts
assert.deepEqual(result, {
  htmlFile: existingPath,
  scriptFile: path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.js"),
  styleFile: path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.min.css")
});
```

## 2. Update Workbench Service Tests First

In `test/unit/workbench-patch-service.test.ts`, replace `scriptFile`-only assertions with:

```ts
const scriptFile = path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.js");
const styleFile = path.join(base, "electron-sandbox", "workbench", "kawaii-vscode-colors-ui.min.css");
const result = service.applyAssets(base, {
  scriptContent: "compiled bootstrap script",
  styleContent: "compiled scoped css"
});

assert.equal(result.status, "activated");
assert.deepEqual(result.paths, { htmlFile, scriptFile, styleFile });
assert.equal(files.get(scriptFile), "compiled bootstrap script");
assert.equal(files.get(styleFile), "compiled scoped css");
assert.match(files.get(htmlFile) || "", /kawaii-vscode-colors-ui\.js\?v=step04/);
```

## 3. Update `src/workbenchPatch.ts`

Add:

```ts
export const KAWAII_UI_STYLE_FILE_NAME = "kawaii-vscode-colors-ui.min.css";
```

Change the interface:

```ts
export interface WorkbenchPatchPaths {
  readonly htmlFile: string;
  readonly scriptFile: string;
  readonly styleFile: string;
}
```

Change `resolveWorkbenchPatchPaths()`:

```ts
return {
  htmlFile: path.join(workbenchDirectory, workBenchFilename),
  scriptFile: path.join(workbenchDirectory, KAWAII_UI_SCRIPT_FILE_NAME),
  styleFile: path.join(workbenchDirectory, KAWAII_UI_STYLE_FILE_NAME)
};
```

## 4. Update `src/extensionHost/services/WorkbenchPatchService.ts`

Add:

```ts
export interface WorkbenchPatchAssets {
  readonly scriptContent: string;
  readonly styleContent: string;
}
```

Change the service interface:

```ts
export interface WorkbenchPatchService {
  applyAssets(basePath: string, assets: WorkbenchPatchAssets): WorkbenchPatchApplyResult;
  isEnabled(basePath: string): boolean;
  removeScriptTag(basePath: string): WorkbenchPatchRemoveResult;
  resolvePatchPaths(basePath: string): WorkbenchPatchPaths | null;
}
```

Implement:

```ts
applyAssets(basePath: string, assets: WorkbenchPatchAssets): WorkbenchPatchApplyResult {
  const paths = this.resolvePatchPaths(basePath);

  if (!paths) {
    return { status: "workbench-not-found", paths: null };
  }

  const html = this.dependencies.fileSystem.readTextFile(paths.htmlFile);
  const wasEnabled = isWorkbenchPatchEnabled(html);
  const versionToken = this.getVersionToken();
  const output = applyWorkbenchPatchScriptTag(html, versionToken);
  const scriptContent = assets.scriptContent.replace(/\[KAWAII_UI_STYLE_VERSION\]/g, String(versionToken));

  this.dependencies.fileSystem.writeTextFile(paths.styleFile, assets.styleContent);
  this.dependencies.fileSystem.writeTextFile(paths.scriptFile, scriptContent);
  this.dependencies.fileSystem.writeTextFile(paths.htmlFile, output);

  return {
    status: wasEnabled ? "reactivated" : "activated",
    paths
  };
}
```

## 5. Update Current Callers Temporarily

Until Step 04 updates `NeonEffectService`, either:

- update the caller immediately to pass `{ scriptContent, styleContent: "" }`; or
- keep a temporary `applyScriptTag()` compatibility wrapper.

Do not leave both APIs after Step 04.
