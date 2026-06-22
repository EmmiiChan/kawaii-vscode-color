# Step 07 Analysis: Validate Additive Behavior

## What Must Be Proven

The full runtime must prove:

- `kawaii-vscode-colors-ui` exists on `<html>` when possible.
- Static stylesheet link exists.
- Scoped token style tag exists.
- Original `.vscode-tokens-styles` still exists.
- Scoped token styles contain `.kawaii-vscode-colors-ui .mtk...`.
- Disable removes the patch and after restart the wrapper/link/style are gone.

## Why E2E Is Required

Unit tests can inspect source and simulated strings. They cannot prove VS Code's real workbench DOM shape, theme classes, stylesheet loading, and token style timing.

The injected script depends on VS Code internals. The gated E2E is the correct validation surface.

## Risk Analysis

- This test modifies disposable VS Code workbench files. The guard must remain mandatory.
- The DOM root may be `html` in the target VS Code version. If a future version changes theme-class placement, tests should fail clearly.
- Visual screenshots are still required because CSS scope changes can pass DOM checks while failing actual rendering.
