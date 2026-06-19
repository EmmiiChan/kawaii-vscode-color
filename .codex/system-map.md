# Kawaii VS Code Color System Map

Last reviewed: 2026-06-19

This file is the migration-oriented contract map for the extension. Keep it factual and close to source. `npm run test:docs` verifies the critical facts in this file against the repository.

## Package and Public Surface

| Surface | Contract |
| --- | --- |
| Package | `kawaii-vscode-color`; patch version is managed automatically in `package.json` and `package-lock.json` |
| Publisher | `ITEM-PIXEL` |
| Runtime entry | `./out/src/extension.js` |
| VS Code engine | `^1.33.0` |
| Extension kind | `ui` |
| Activation events | `onStartupFinished`, `onCommand:kawaii_synthwave.openSettings` |
| Public command | `kawaii_synthwave.openSettings` -> `Kawaii VS Code Color: Settings` |
| Documentation guard | `npm run test:docs` -> `node scripts/check-codex-docs.js` |
| Lockfile | `lockfileVersion: 3`; root package patch version is automatic and not duplicated in `.codex` docs |

Dev dependency contract:

- `@vscode/test-cli@0.0.12`
- `@vscode/test-electron@3.0.0`
- `@types/node@^26.0.0`
- `@types/vscode@^1.33.0`
- `jsdom@29.1.1`
- `mocha@11.7.6`
- `typescript@^6.0.3`
- `vscode-extension-tester@8.23.0`

## Critical Source Anchors

- `.codex/AGENTS.md`
- `.codex/README.md`
- `.codex/change-impact.md`
- `.codex/color_scheme_reference.md`
- `.codex/docs.md`
- `.codex/structure.md`
- `.codex/system-map.md`
- `package.json`
- `package-lock.json`
- `scripts/build-color-theme.js`
- `scripts/check-codex-docs.js`
- `scripts/e2e-last-run.js`
- `scripts/run-e2e.js`
- `scripts/run-test-all.js`
- `src/css/editor_chrome.css`
- `src/emptyEditorLogoStyles.ts`
- `src/extension.js`
- `src/extensionRoot.ts`
- `src/js/theme_template.js`
- `src/randomNekoImage.ts`
- `src/settings.js`
- `src/settingsBundle.ts`
- `src/settingsColorService.ts`
- `src/settingsEffectsPersistence.ts`
- `src/settingsPersistence.ts`
- `src/settingsStore.ts`
- `src/settingsWebview.js`
- `src/shared`
- `src/workbenchPatch.ts`
- `test/dom`
- `test/e2e`
- `test/integration`
- `test/unit`
- `tsconfig.base.json`
- `tsconfig.extension.json`
- `tsconfig.json`
- `tsconfig.scripts.json`
- `tsconfig.tests.json`

## Theme Build Contract

| Variant | uiTheme | Base | Overrides | Generated |
| --- | --- | --- | --- | --- |
| `Kawaii VS Code Color` | `vs-dark` | `themes/kawaii_synthwave-color-theme.json` | `themes/kawaii_synthwave-color-theme-overrides.json` | `./themes/kawaii_synthwave-generated-color-theme.json` / `themes/kawaii_synthwave-generated-color-theme.json` |
| `Kawaii VS Code Color Light` | `vs` | `themes/kawaii_synthwave-color-theme-light.json` | `themes/kawaii_synthwave-color-theme-light-overrides.json` | `./themes/kawaii_synthwave-generated-color-theme-light.json` / `themes/kawaii_synthwave-generated-color-theme-light.json` |

Build behavior:

- `scripts/build-color-theme.js` reads base and override JSON/JSONC sources for both variants.
- `colors` and `semanticTokenColors` merge by object key.
- `tokenColors` replace matching base rules by `name` or `scope`; unmatched override rules append.
- Generated theme files are strict JSON written by `npm run build:theme`.
- Current generated themes define `semanticTokenColors`: dark true, light true.

## Runtime Modules

| Module | Responsibility |
| --- | --- |
| `src/extension.js` -> `out/src/extension.js` | Extension activation, command registration, `workbench.colorTheme` change listener, Neon patch apply/remove, renderer template assembly, reload prompts. |
| `src/extensionRoot.ts` -> `out/src/extensionRoot.js` | Resolves package-root asset paths from both source and compiled `out/src` runtime directories. |
| `src/workbenchPatch.ts` -> `out/src/workbenchPatch.js` | Pure workbench path detection and marked HTML patch helpers for `neondreams.js`. |
| `src/settings.js` | Settings webview lifecycle, message routing, Settings Sync/JSON orchestration, image workflows, color state composition, runtime read of `.codex/color_scheme_reference.md`. |
| `src/settingsWebview.js` | Complete settings webview HTML/CSS/JS, DOM state, UI event emission, and VS Code webview token styling. |
| `src/settingsPersistence.ts` -> `out/src/settingsPersistence.js` | Pure mutation helpers for theme-scoped workbench and TextMate customization blocks. |
| `src/settingsStore.ts` -> `out/src/settingsStore.js` | VS Code configuration get/inspect/update adapter. |
| `src/settingsColorService.ts` -> `out/src/settingsColorService.js` | Generated-theme-aware color update/reset and theme switching. |
| `src/settingsBundle.ts` -> `out/src/settingsBundle.js` | Settings bundle schema, Settings Sync state, JSON export/import, and configuration/color/effects apply order. |
| `src/settingsEffectsPersistence.ts` -> `out/src/settingsEffectsPersistence.js` | Image metadata normalization, safe filenames, stored image export/restore, opacity and fit normalization. |
| `src/emptyEditorLogoStyles.ts` -> `out/src/emptyEditorLogoStyles.js` | CSS selector list and generated CSS for no-tab logo replacement. |
| `src/randomNekoImage.ts` -> `out/src/randomNekoImage.js` | Testable Random Neko API payload parsing, URL resolution, guarded HTTPS fetch, and image response normalization. |
| `src/js/theme_template.js` | Renderer-side token CSS detection, theme matching, glow transformation, style-tag management. |
| `src/css/editor_chrome.css` | CSS injected into the VS Code workbench renderer after placeholder replacement. |
| `src/shared` | TypeScript migration contracts, models, branded primitives, and runtime guards for external inputs. |

## Webview Message Contract

Webview -> extension host message types handled by `src/settings.js`:

- `apply-neon-customizations`
- `change-theme-variant`
- `disable-neon`
- `download-editor-background-image`
- `download-empty-editor-logo-image`
- `e2e-apply-settings-bundle`
- `e2e-set-test-fixtures`
- `enable-neon`
- `export-settings`
- `import-settings`
- `import-settings-from-vssync`
- `open-link`
- `ready`
- `refresh`
- `remove-editor-background-image`
- `remove-empty-editor-logo-image`
- `reset-all`
- `reset-color`
- `save-settings-to-vssync`
- `select-editor-background-image`
- `select-empty-editor-logo-image`
- `select-random-neko-editor-background-image`
- `select-random-neko-empty-editor-logo-image`
- `update-color`
- `update-editor-background-fit`
- `update-editor-background-opacity`
- `update-empty-editor-logo-opacity`

Extension host -> webview message types:

- `effects-pending`
- `error`
- `neon-status`
- `state`

Rules:

- `ready` and `refresh` rebuild state with `createSettingsState()`.
- Color messages write VS Code settings, never repository theme JSON.
- Image and opacity messages update `globalState`/global storage and require `apply-neon-customizations` to refresh injected effects.
- `e2e-apply-settings-bundle` is test-only and must remain gated by `KAWAII_E2E_ALLOW_NEON_PATCH=1`.
- `e2e-set-test-fixtures` is test-only and must remain gated by `KAWAII_E2E_TEST_HOOKS=1` or `KAWAII_E2E_ALLOW_NEON_PATCH=1`; it replaces native dialogs and Random Neko network calls with deterministic local fixture paths during E2E.
- Host errors are surfaced to both webview `error` messages and VS Code error notifications.

## Settings, State, and Schemas

VS Code settings and extension/global state keys:

- `kawaii_synthwave.brightness`
- `kawaii_synthwave.disableGlow`
- `kawaii_synthwave.editorBackgroundFit`
- `kawaii_synthwave.editorBackgroundImage`
- `kawaii_synthwave.editorBackgroundOpacity`
- `kawaii_synthwave.emptyEditorLogoImage`
- `kawaii_synthwave.emptyEditorLogoOpacity`
- `kawaii_synthwave.openSettings`
- `kawaii_synthwave.syncedSettingsBundle`

Other VS Code settings touched by the extension:

- `workbench.colorTheme`
- `workbench.colorCustomizations`
- `editor.tokenColorCustomizations`

Settings bundle contract:

- Current schema: `kawaii-vscode-color-settings`
- Legacy accepted schema: `kawaii-synthwave-settings`
- Current `schemaVersion: 1`
- Export file default: `kawaii-vscode-color-settings.json`
- Apply order: extension configuration, color customizations, effects, then active theme variant.

Stored image contract:

- Stored files live under extension global storage.
- Editor background filenames must start with `editor-background-image.`.
- No-tab logo filenames must start with `empty-editor-logo-image.`.
- Supported image formats: PNG, JPG/JPEG, WEBP, SVG.
- Maximum imported image size: 2 MB.

## Renderer Injection Contract

Workbench patch marker:

```html
<!-- KAWAII SYNTHWAVE --><script src="neondreams.js?v=<timestamp>"></script><!-- NEON DREAMS -->
```

Renderer placeholders replaced by `src/extension.js`:

- `CHROME_STYLES`
- `DISABLE_GLOW`
- `EDITOR_BACKGROUND_AREA_BOTTOM`
- `EDITOR_BACKGROUND_AREA_HEIGHT`
- `EDITOR_BACKGROUND_AREA_LEFT`
- `EDITOR_BACKGROUND_AREA_RIGHT`
- `EDITOR_BACKGROUND_AREA_TOP`
- `EDITOR_BACKGROUND_AREA_WIDTH`
- `EDITOR_BACKGROUND_IMAGE`
- `EDITOR_BACKGROUND_IMAGE_OPACITY`
- `EDITOR_BACKGROUND_IMAGE_POSITION`
- `EDITOR_BACKGROUND_IMAGE_REPEAT`
- `EDITOR_BACKGROUND_IMAGE_SIZE`
- `EMPTY_EDITOR_LOGO_STYLES`
- `NEON_BRIGHTNESS`

Runtime style tags:

- `#kawaii_synthwave-chrome-styles`
- `#kawaii_synthwave-theme-styles`

The renderer code must keep using VS Code workbench/theme tokens and must not define an independent UI palette for the settings webview or injected workbench surfaces.

## Test Matrix

| Layer | Command | Contract |
| --- | --- | --- |
| Codex docs guard | `npm run test:docs` | Verifies this map and `.codex` guides still match critical repo facts. |
| TypeScript compatibility check | `npm run type-check` | Runs TypeScript no-emit checks for current mixed JS/TS migration configs. |
| Syntax check | `npm run test:check` | Runs `test:docs`, compiles, then Node syntax checks for selected scripts, compiled runtime output, and E2E files. |
| Unit | `npm run test:unit` | Compiles TypeScript-compatible migration output, then runs the Node test runner for scripts, shared contracts, and dependency-light runtime helpers. |
| DOM | `npm run test:dom` | jsdom settings webview behavior and visual-state DOM contracts. |
| Integration | `npm run test:integration` | Compiles, then runs VS Code Extension Development Host activation and command smoke tests. |
| Safe E2E | `npm run test:e2e` | Compiles, then runs disposable VS Code UI automation without applying the real Neon patch. |
| Current VS Code E2E | `npm run test:e2e:current` | Compiles, then runs experimental safe E2E against the latest ExTester-supported VS Code version, isolated from the stable `1.111.0` safe gate. |
| Gated Neon E2E | `KAWAII_E2E_ALLOW_NEON_PATCH=1 npm run test:e2e:neon` | Requires the flag, compiles, then runs real disposable workbench patch lifecycle, screenshots, restore checks, and fit matrix. |
