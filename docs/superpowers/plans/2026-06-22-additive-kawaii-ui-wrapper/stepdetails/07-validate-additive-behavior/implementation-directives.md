# Step 07 Implementation Directives

## 1. Extend Patch Snapshot

In `test/e2e/neon-real.spec.js`, include `styleFile` in state when `resolveWorkbenchPatchPaths()` returns it:

```js
styleFile: patchPaths.styleFile,
```

Extend `readPatchSnapshot(paths)`:

```js
const styleExists = fs.existsSync(paths.styleFile);
const style = styleExists ? fs.readFileSync(paths.styleFile, "utf-8") : "";

return {
  html,
  htmlHash: sha256(html),
  patchEnabled: isWorkbenchPatchEnabled(html),
  scriptTagCount: (html.match(/<!-- KAWAII VSCODE COLORS UI -->/g) || []).length,
  style,
  styleExists,
  styleHash: styleExists ? sha256(style) : "",
  template,
  templateExists,
  templateHash: templateExists ? sha256(template) : ""
};
```

## 2. Assert Generated Assets

After applying:

```js
assert.equal(appliedSnapshot.styleExists, true, "Expected generated Kawaii UI CSS after applying effects");
assert.match(appliedSnapshot.style, /\.kawaii-vscode-colors-ui/);
assert.doesNotMatch(appliedSnapshot.style, /\[(?:EDITOR_BACKGROUND_IMAGE|EMPTY_EDITOR_LOGO_STYLES)\]/);
```

## 3. Add Runtime DOM Check

Add helper:

```js
async function captureAdditiveRuntimeState() {
  const driver = VSBrowser.instance.driver;

  return driver.executeScript(function () {
    const uiRoot = document.querySelector('.kawaii-vscode-colors-ui');
    const originalTokenStyles = document.querySelector('.vscode-tokens-styles');
    const scopedTokenStyles = document.querySelector('#kawaii-vscode-colors-ui-token-styles');
    const linkedStyles = document.querySelector('#kawaii-vscode-colors-ui-stylesheet');

    return {
      hasUiRoot: Boolean(uiRoot),
      uiRootTagName: uiRoot ? uiRoot.tagName.toLowerCase() : "",
      hasOriginalTokenStyles: Boolean(originalTokenStyles),
      hasScopedTokenStyles: Boolean(scopedTokenStyles),
      hasLinkedStyles: Boolean(linkedStyles),
      scopedTokenText: scopedTokenStyles ? scopedTokenStyles.textContent || "" : ""
    };
  });
}
```

Use the same driver access pattern already present in `test/e2e/neon-real.spec.js`. If the file uses a local `browser` or `driver` variable instead of `VSBrowser.instance.driver`, follow the existing pattern.

## 4. Assert Additive Runtime State

In applied/restarted phases:

```js
const additiveState = await captureAdditiveRuntimeState();

assert.equal(additiveState.hasUiRoot, true);
assert.equal(additiveState.uiRootTagName, "html");
assert.equal(additiveState.hasOriginalTokenStyles, true);
assert.equal(additiveState.hasScopedTokenStyles, true);
assert.equal(additiveState.hasLinkedStyles, true);
assert.match(additiveState.scopedTokenText, /\.kawaii-vscode-colors-ui \.mtk/);
```

## 5. Assert Restored Runtime State

After disabling and restarting:

```js
const additiveState = await captureAdditiveRuntimeState();

assert.equal(additiveState.hasUiRoot, false);
assert.equal(additiveState.hasScopedTokenStyles, false);
assert.equal(additiveState.hasLinkedStyles, false);
```
