# Step 04 Implementation Directives

## 1. Update Placeholder Contract

In `src/shared/contracts/rendererPlaceholders.ts`, ensure this placeholder exists:

```ts
"KAWAII_UI_STYLE_VERSION"
```

If `CHROME_STYLES` is no longer used by any source asset after Step 03, remove it from the placeholder list and update tests.

## 2. Update Unit Test Fixtures

In `test/unit/neon-effect-service.test.ts`, replace the existing CSS fixture with:

```ts
[
  path.join(extensionRoot, "src", "css", "kawaii-vscode-colors-ui.min.css"),
  "image=[EDITOR_BACKGROUND_IMAGE];opacity=[EDITOR_BACKGROUND_IMAGE_OPACITY];logo=[EMPTY_EDITOR_LOGO_STYLES]"
]
```

Replace the JS fixture with:

```ts
[
  path.join(extensionRoot, "src", "js", "theme_template.js"),
  "brightness=[NEON_BRIGHTNESS];glow=[DISABLE_GLOW];href=kawaii-vscode-colors-ui.min.css?v=[KAWAII_UI_STYLE_VERSION]"
]
```

Assert:

```ts
assert.match(files.get(scriptFile) || "", /href=kawaii-vscode-colors-ui\.min\.css\?v=neon/);
assert.match(files.get(styleFile) || "", /data:image\/svg\+xml;base64,/);
assert.doesNotMatch(files.get(styleFile) || "", /\[EDITOR_BACKGROUND_IMAGE\]/);
```

## 3. Update Service Read Paths

In `src/extensionHost/services/NeonEffectService.ts`, read:

```ts
const uiStyles = this.buildCustomUiStyles(
  this.dependencies.fileSystem.readTextFile(path.join(this.dependencies.extensionRoot, "src", "css", "kawaii-vscode-colors-ui.min.css"))
);
```

Keep JS read:

```ts
const jsTemplate = this.dependencies.fileSystem.readTextFile(
  path.join(this.dependencies.extensionRoot, "src", "js", "theme_template.js")
);
```

## 4. Replace Script Placeholders

Use:

```ts
const finalScript = replaceRendererPlaceholders(jsTemplate, {
  DISABLE_GLOW: String(normalizedConfiguration.disableGlow),
  KAWAII_UI_STYLE_VERSION: "[KAWAII_UI_STYLE_VERSION]",
  NEON_BRIGHTNESS: normalizedConfiguration.neonBrightness
});
```

The literal placeholder value is intentional. `WorkbenchPatchService` replaces it with the actual version token.

## 5. Apply Both Assets

Replace the old call with:

```ts
const result = this.dependencies.workbenchPatchService.applyAssets(basePath, {
  scriptContent: finalScript,
  styleContent: uiStyles
});
```

## 6. Rename CSS Builder

Rename:

```ts
buildCustomChromeStyles(chromeStyles: string): string;
```

to:

```ts
buildCustomUiStyles(uiStyles: string): string;
```

Keep the replacement map unchanged. It still resolves editor background and logo placeholders.
