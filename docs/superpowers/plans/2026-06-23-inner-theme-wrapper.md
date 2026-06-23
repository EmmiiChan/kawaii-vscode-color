# Inner Theme Wrapper Plan

## Objective

Make Kawaii VS Code Color work as a parent theme with named inner themes. The runtime must add both wrapper classes to the highest available VS Code workbench root:

```html
<html class="kawaii-vscode-colors-ui dark-pink-kawaii ...">
```

or:

```html
<html class="kawaii-vscode-colors-ui light-pink-pastel-kawaii ...">
```

Custom UI effects must then target the full same-root wrapper:

```css
.kawaii-vscode-colors-ui.dark-pink-kawaii .monaco-editor { ... }
.kawaii-vscode-colors-ui.light-pink-pastel-kawaii .monaco-editor { ... }
```

Use same-element selectors because both classes are applied to the top-level root. Do not model this as `.kawaii-vscode-colors-ui .dark-pink-kawaii`, because there is no child wrapper element.

## Canonical Inner Themes

| id | canonical label | wrapper class | legacy labels | uiTheme | generated theme |
| --- | --- | --- | --- | --- | --- |
| `dark` | `Dark Pink Kawaii` | `dark-pink-kawaii` | `Kawaii VS Code Color` | `vs-dark` | `themes/kawaii_synthwave-generated-color-theme.json` |
| `light` | `Light Pink-Pastel Kawaii` | `light-pink-pastel-kawaii` | `Kawaii VS Code Color Light` | `vs` | `themes/kawaii_synthwave-generated-color-theme-light.json` |

The wrapper class is the sanitized canonical label:

```ts
function sanitizeThemeWrapperClass(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

Every inner theme must have a non-empty canonical label and a wrapper class derived from that label. A test must fail if a new inner theme is missing a label, has an invalid wrapper class, or collides with another wrapper.

## Implementation Steps

### 1. Theme Contract And Labels

Create a single shared theme registry, preferably in `src/shared/models/theme.ts`, and use it from extension host code and tests.

The registry should expose:

```ts
export type ThemeVariantId = "dark" | "light";

export interface KawaiiThemeVariant {
  readonly id: ThemeVariantId;
  readonly label: ThemeName;
  readonly legacyLabels: readonly ThemeName[];
  readonly modeLabel: string;
  readonly wrapperClass: string;
  readonly generatedThemePath: string;
}
```

Update canonical display labels in:

- `package.json` `contributes.themes[].label`
- `scripts/build-color-theme.ts` variant labels
- `src/settings.ts` theme options
- `src/shared/models/theme.ts`
- `src/extensionHost/controllers/NeonEffectController.ts`
- test fixtures and assertions

Do not edit protected base theme files just to rename generated theme metadata. For generated theme names:

- add or update `"name": "Dark Pink Kawaii"` in `themes/kawaii_synthwave-color-theme-overrides.json`
- update `"name": "Light Pink-Pastel Kawaii"` in `themes/kawaii_synthwave-color-theme-light-overrides.json`
- run `npm run build:theme` so generated JSON receives canonical names

### 2. Settings Compatibility

Changing the label changes VS Code customization keys such as `[Kawaii VS Code Color]`. Preserve existing user settings by treating old labels as aliases.

Add helpers in `src/settingsPersistence.ts`:

```ts
export function getThemeCustomizationKey(themeVariant: ThemeVariant): string {
  return `[${themeVariant.label}]`;
}

export function getThemeCustomizationKeys(themeVariant: ThemeVariant): string[] {
  return [
    getThemeCustomizationKey(themeVariant),
    ...(themeVariant.legacyLabels || []).map((label) => `[${label}]`)
  ];
}
```

Read from the canonical key first, then legacy keys. Write only the canonical key. Reset/remove should remove both canonical and legacy keys for that variant, so reset operations do not leave stale old-label blocks.

`getActiveThemeVariant()` must match both canonical labels and legacy labels. `changeThemeVariant()` must always write the canonical label to `workbench.colorTheme`.

Settings bundle export must use variant ids (`dark`, `light`) as it already does. Import must write canonical customization blocks even when reading a bundle exported before the rename.

### 3. Runtime Inner Wrapper

Refactor `src/js/theme_template.js` from one theme-family selector array into inner-theme configs:

```js
const innerThemeConfigs = [
  {
    id: "dark",
    wrapperClass: "dark-pink-kawaii",
    selectors: [
      '[class~="vs-dark"][class*="kawaii_synthwave-generated-color-theme-json"]',
      '[class~="vs-dark"][class*="kawaii-synthwave-generated-color-theme-json"]',
      '[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"]'
    ]
  },
  {
    id: "light",
    wrapperClass: "light-pink-pastel-kawaii",
    selectors: [
      '[class~="vs"][class*="kawaii_synthwave-generated-color-theme-light-json"]',
      '[class~="vs"][class*="kawaii-synthwave-generated-color-theme-light-json"]',
      '[class~="vs"][class*="kawaii-vscode-color-generated-color-theme-light-json"]'
    ]
  }
];
```

`syncUiRootClass()` should:

1. Resolve `document.documentElement || document.body`.
2. Detect the active inner theme from `innerThemeConfigs`.
3. Remove every known inner theme wrapper class on each sync.
4. If a Kawaii inner theme is active, add `kawaii-vscode-colors-ui` and the active inner wrapper.
5. If no Kawaii inner theme is active, remove `kawaii-vscode-colors-ui`, remove inner wrappers, and let existing cleanup remove the linked CSS and token style.

Token glow generation must scope to the full active wrapper:

```js
const createScopedTokenRule = (selector, replacement, innerTheme) =>
  `.${UI_ROOT_CLASS}.${innerTheme.wrapperClass} ${selector.trim()} {${replacement}}`;
```

Mirror the runtime constants and pure helper behavior in `src/renderer/ThemeTemplate.ts` so unit tests can validate the generated selector contract.

### 4. Scoped Sass And Effect Customizations

Update `src/scss/kawaii-vscode-colors-ui.scss` so static UI effects are emitted under full wrapper selectors. The first migration can include the current generated bridge under both inner theme wrappers:

```scss
@use "generated/editor-chrome.generated" as editorChrome;

.kawaii-vscode-colors-ui.dark-pink-kawaii {
  @include editorChrome.styles;
}

.kawaii-vscode-colors-ui.light-pink-pastel-kawaii {
  @include editorChrome.styles;
}
```

This duplicates the current bridge but keeps behavior stable and makes all effect selectors full-wrapper scoped. A later optimization can split the generated bridge by inner theme if CSS size becomes a problem.

Update dynamic effect CSS generated by TypeScript:

- `src/emptyEditorLogoStyles.ts` should build selectors for every full wrapper:
  - `.kawaii-vscode-colors-ui.dark-pink-kawaii ... .letterpress`
  - `.kawaii-vscode-colors-ui.light-pink-pastel-kawaii ... .letterpress`
- editor background placeholders in generated CSS must be reachable only under full wrappers
- future Apply Effects customizations must receive either the active inner theme wrapper or the complete wrapper selector list

### 5. Tests, Docs, And Validation

Update tests around:

- theme labels and shared contract: `test/unit/shared-contracts.test.ts`
- settings persistence aliases: `test/unit/settings-persistence.test.ts`
- settings color service theme switching: `test/unit/settings-color-service.test.ts`
- settings bundle import/export: `test/unit/settings-bundle.test.ts`, `test/unit/settings-message-persistence.test.js`
- renderer selector generation: `test/unit/renderer-theme-template.test.ts`
- no-tab logo selectors: `test/unit/empty-editor-logo-styles.test.ts`
- compiled CSS selector contract: `test/unit/extension-editor-background-fit.test.ts`, `scripts/build-ui-css.test.js`
- Neon controller theme-family detection: `test/unit/neon-effect-controller.test.ts`
- E2E runtime assertions: `test/e2e/neon-real.spec.js`

Update documentation and fact gates:

- `.codex/system-map.md`
- `.codex/structure.md`
- `.codex/docs.md`
- `.codex/color_scheme_reference.md`
- `.codex/AGENTS.md`
- `scripts/check-codex-docs.ts` only if new facts need explicit extraction

Validation order:

```powershell
npm run build:theme
npm run build:ui-css
npm run compile
npm run compile:tests
node --test out-tests/test/unit/shared-contracts.test.js out-tests/test/unit/renderer-theme-template.test.js out-tests/test/unit/empty-editor-logo-styles.test.js out-tests/test/unit/extension-editor-background-fit.test.js
node --test out-tests/test/unit/settings-persistence.test.js out-tests/test/unit/settings-color-service.test.js out-tests/test/unit/settings-bundle.test.js
npm run test:docs
npm run test:check
npm run test:unit
```

Run gated Neon E2E when changing the renderer runtime:

```powershell
$env:KAWAII_E2E_ALLOW_NEON_PATCH="1"; npm run test:e2e:neon
```

## Completion Criteria

- Theme picker labels are `Dark Pink Kawaii` and `Light Pink-Pastel Kawaii`.
- Generated theme JSON names match the canonical labels.
- Active Kawaii theme root has exactly one plugin wrapper and one active inner wrapper.
- Switching dark/light removes the previous inner wrapper class.
- Inactive non-Kawaii themes remove plugin and inner wrappers and clean linked/injected CSS.
- Runtime token CSS uses `.kawaii-vscode-colors-ui.<inner-wrapper> ...`, not `.kawaii-vscode-colors-ui ...`.
- Static CSS and no-tab logo CSS use the full wrapper tree.
- Existing old-label user customization blocks are read and can be migrated by the next write/export.
- Unit, docs, type-check, and targeted runtime gates pass.
