# Kawaii VS Code Color System Map

Last reviewed: 2026-06-25

This file is the migration-oriented contract map for the extension. Keep it factual and close to source. `npm run test:docs` verifies the critical facts in this file against the repository.

## Package and Public Surface

| Surface | Contract |
| --- | --- |
| Package | `kawaii-vscode-color`; patch version is managed automatically in `package.json` and `package-lock.json` |
| Publisher | `ITEM-PIXEL` |
| Changelog | `CHANGELOG.md` is the release-notes source for users, maintainers, and GitHub Releases |
| Runtime entry | `./out/src/extension.js` |
| VS Code engine | `^1.33.0` |
| Extension kind | `ui` |
| Activation events | `onStartupFinished`, `onCommand:kawaii_synthwave.openSettings` |
| Public command | `kawaii_synthwave.openSettings` -> `Kawaii VS Code Color: Settings` |
| Documentation guard | `npm run test:docs` -> `npm run compile:scripts` -> `node scripts/check-codex-docs.js` wrapper -> `out-scripts/scripts/check-codex-docs.js` |
| Test artifact cleanup | `npm run clean:test-artifacts` -> `npm run compile:scripts` -> `node scripts/clean-test-artifacts.js`; `npm run build:clean` runs cleanup before `npm run build:local` |
| Disposable VS Code cleanup diagnostics | `npm run test:cleanup-diagnostics` audits stale disposable VS Code processes and test artifacts; `npm run test:cleanup-processes` runs the same diagnostic in kill mode |
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
- `CHANGELOG.md`
- `package.json`
- `package-lock.json`
- `scripts/build-color-theme.js`
- `scripts/build-color-theme.ts`
- `scripts/update-theme-color-packs.js`
- `scripts/update-theme-color-packs.ts`
- `scripts/build-ui-css.js`
- `scripts/build-ui-css.ts`
- `scripts/check-codex-docs.js`
- `scripts/check-codex-docs.ts`
- `scripts/clean-test-artifacts.js`
- `scripts/clean-test-artifacts.ts`
- `scripts/e2e-last-run.js`
- `scripts/e2e-last-run.ts`
- `scripts/increment-package-version.js`
- `scripts/increment-package-version.ts`
- `scripts/package-local-vsix.js`
- `scripts/package-local-vsix.ts`
- `scripts/require-e2e-neon-flag.js`
- `scripts/require-e2e-neon-flag.ts`
- `scripts/run-e2e.js`
- `scripts/run-e2e.ts`
- `scripts/test-process-cleanup-diagnostics.js`
- `scripts/test-process-cleanup-diagnostics.ts`
- `scripts/run-test-all.js`
- `scripts/run-test-all.ts`
- `src/css/editor_chrome.css`
- `src/css/kawaii-vscode-colors-ui.min.css`
- `src/core-themes`
- `src/emptyEditorLogoStyles.ts`
- `src/extension.ts`
- `src/extensionHost`
- `src/extensionRoot.ts`
- `src/generated-themes`
- `src/js/theme_template.js`
- `src/randomNekoImage.ts`
- `src/renderer`
- `src/scss/kawaii-vscode-colors-ui.scss`
- `src/scss/generated/_editor-chrome.generated.scss`
- `src/settings.ts`
- `src/settingsBundle.ts`
- `src/settingsColorService.ts`
- `src/settingsEffectsPersistence.ts`
- `src/settingsPersistence.ts`
- `src/settingsStore.ts`
- `src/settingsWebview.ts`
- `src/shared`
- `src/webview`
- `src/workbenchPatch.ts`
- `test/dom`
- `test/e2e`
- `test/integration`
- `test/unit`
- `themes/dark-pink-kawaii.json`
- `themes/light-pink-pastel-kawaii.json`
- `tsconfig.tests.emit.json`
- `tsconfig.base.json`
- `tsconfig.extension.json`
- `tsconfig.json`
- `tsconfig.scripts.json`
- `tsconfig.tests.json`

## Theme Build Contract

| Variant | uiTheme | Base | Overrides | Generated |
| --- | --- | --- | --- | --- |
| `Dark Pink Kawaii` | `vs-dark` | `src/core-themes/kawaii_synthwave-color-theme.json` | `themes/dark-pink-kawaii.json` | `./src/generated-themes/kawaii_synthwave-generated-color-theme.json` / `src/generated-themes/kawaii_synthwave-generated-color-theme.json` |
| `Light Pink-Pastel Kawaii` | `vs` | `src/core-themes/kawaii_synthwave-color-theme-light.json` | `themes/light-pink-pastel-kawaii.json` | `./src/generated-themes/kawaii_synthwave-generated-color-theme-light.json` / `src/generated-themes/kawaii_synthwave-generated-color-theme-light.json` |

Build behavior:

- `scripts/build-color-theme.ts` reads every public `themes/*.json` color pack plus the matching protected core base; `scripts/build-color-theme.js` is the stable wrapper entrypoint.
- `scripts/update-theme-color-packs.ts` reads the configured GitHub `themes` folder through the contents API, validates each JSON file as a public color pack, compares numeric versions, and writes only missing or newer packs; `scripts/update-theme-color-packs.js` is the stable wrapper entrypoint.
- Public color packs require `id`, `name`, `mode`, and non-null numeric `version.major`, `version.minor`, and `version.patch`.
- `colors` and `semanticTokenColors` merge by object key.
- `tokenColors` replace matching base rules by `name` or `scope`; unmatched override rules append.
- Generated native theme files and `src/generated-themes/internal-themes.json` are strict JSON written by `npm run build:theme`.
- Current generated themes define `semanticTokenColors`: dark true, light true.

## Runtime Modules

| Module | Responsibility |
| --- | --- |
| `src/extension.ts` -> `out/src/extension.js` | Extension activation, command registration, Settings Sync setup, and composition of typed extension-host services. |
| `src/extensionHost` -> `out/src/extensionHost` | VS Code adapters, Effects controller, Settings command/message controllers, renderer template assembly, stored image CSS values, settings host boundaries, workbench patch apply/remove orchestration, reload prompts. |
| `src/extensionRoot.ts` -> `out/src/extensionRoot.js` | Resolves package-root asset paths from both source and compiled `out/src` runtime directories. |
| `src/workbenchPatch.ts` -> `out/src/workbenchPatch.js` | Pure workbench path detection and marked HTML patch helpers for `kawaii-vscode-colors-ui.js` plus `kawaii-vscode-colors-ui.min.css`, with legacy marker cleanup for old `neondreams.js` wrappers. |
| `src/settings.ts` | Settings webview lifecycle, message routing, Settings Sync/JSON orchestration, image workflows, color state composition, runtime read of `.codex/color_scheme_reference.md`. |
| `src/settingsWebview.ts` | Compatibility settings webview renderer for inline HTML/CSS/JS, DOM state, UI event emission, and VS Code webview token styling. |
| `src/webview` -> `out/src/webview` | Typed settings webview view model, CSP/HTML helper contract, page ids, VS Code token names, and client `postMessage` names used while the renderer remains inline. |
| `src/settingsPersistence.ts` -> `out/src/settingsPersistence.js` | Pure mutation helpers for theme-scoped workbench and TextMate customization blocks. |
| `src/settingsStore.ts` -> `out/src/settingsStore.js` | VS Code configuration get/inspect/update adapter. |
| `src/settingsColorService.ts` -> `out/src/settingsColorService.js` | Generated-theme-aware color update/reset and theme switching. |
| `src/settingsBundle.ts` -> `out/src/settingsBundle.js` | Settings bundle schema, Settings Sync state, JSON export/import, and configuration/color/effects apply order. |
| `src/settingsEffectsPersistence.ts` -> `out/src/settingsEffectsPersistence.js` | Image metadata normalization, safe filenames, stored image export/restore, opacity and fit normalization. |
| `src/emptyEditorLogoStyles.ts` -> `out/src/emptyEditorLogoStyles.js` | CSS selector list and generated CSS for no-tab logo replacement. |
| `src/randomNekoImage.ts` -> `out/src/randomNekoImage.js` | Testable Random Neko API payload parsing, URL resolution, guarded HTTPS fetch, and image response normalization. |
| `src/renderer` -> `out/src/renderer` | Browser-only typed renderer token replacement maps, Kawaii theme wrapper selectors, runtime style ids, token color normalization, and token replacement helpers for the injected workbench script boundary. |
| `src/js/theme_template.js` | Renderer-side wrapper bootstrap, bounded bootstrap observer, narrow token/theme observers after initialization, stylesheet link lifecycle, token CSS detection, theme matching, and additive scoped token glow rule generation. |
| `src/css/kawaii-vscode-colors-ui.min.css` | Generated Sass output written next to the workbench HTML and linked by the injected renderer script. |
| `src/scss/kawaii-vscode-colors-ui.scss` | Sass wrapper entrypoint for additive `.kawaii-vscode-colors-ui` static workbench chrome rules. |
| `src/scss/generated/_editor-chrome.generated.scss` | Generated bridge partial created from the legacy `src/css/editor_chrome.css` source. |
| `src/css/editor_chrome.css` | Legacy bridge input for static workbench chrome CSS during migration; no longer embedded into the generated renderer script. |
| `src/shared` | TypeScript migration contracts, models, branded primitives, and runtime guards for external inputs. |

## Webview Message Contract

Webview -> extension host message types handled by `src/settings.ts`:

- `apply-neon-customizations`
- `apply-effects`
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
- `update-application-settings`
- `update-color`
- `update-editor-background-fit`
- `update-editor-background-opacity`
- `update-empty-editor-logo-opacity`
- `update-effect-features`

Extension host -> webview message types:

- `effects-pending`
- `effects-status`
- `error`
- `neon-status`
- `state`

Rules:

- `ready` and `refresh` rebuild state with `createSettingsState()`.
- Incoming settings webview messages are dispatched through `src/extensionHost/controllers/SettingsMessageController.ts`; legacy handlers in `src/settings.ts` preserve existing payload names and side effects.
- Settings page messages write user-scope VS Code application settings such as `workbench.startupEditor`, `workbench.editor.showTabs`, `workbench.editor.wrapTabs`, `window.openFoldersInNewWindow`, and `window.restoreWindows`, never repository theme JSON.
- Color messages write VS Code settings, never repository theme JSON.
- Image Customization owns editor background/no-tab logo inputs, opacity, fit area, and the `Apply Effects` action. Image and opacity messages update `globalState`/global storage and require `apply-effects` to clean previous generated assets and refresh the selected modular Effects stack. `apply-neon-customizations` remains a legacy compatibility message.
- Sync / Files owns Settings Sync and JSON bundle actions for `save-settings-to-vssync`, `import-settings-from-vssync`, `export-settings`, and `import-settings`.
- `e2e-apply-settings-bundle` is test-only and must remain gated by `KAWAII_E2E_ALLOW_NEON_PATCH=1`.
- `e2e-set-test-fixtures` is test-only and must remain gated by `KAWAII_E2E_TEST_HOOKS=1` or `KAWAII_E2E_ALLOW_NEON_PATCH=1`; it replaces native dialogs and Random Neko network calls with deterministic local fixture paths during E2E.
- Host errors are surfaced to both webview `error` messages and VS Code error notifications.

## Settings, State, and Schemas

VS Code settings and extension/global state keys:

- `kawaii_synthwave.brightness`
- `kawaii_synthwave.colorExportVersion`
- `kawaii_synthwave.disableGlow`
- `kawaii_synthwave.editorBackgroundFit`
- `kawaii_synthwave.editorBackgroundImage`
- `kawaii_synthwave.editorBackgroundOpacity`
- `kawaii_synthwave.emptyEditorLogoImage`
- `kawaii_synthwave.emptyEditorLogoOpacity`
- `kawaii_synthwave.effectFeatureSettings`
- `kawaii_synthwave.openSettings`
- `kawaii_synthwave.syncedSettingsBundle`

Other VS Code settings touched by the extension:

- `workbench.colorTheme`
- `workbench.startupEditor`
- `workbench.editor.showTabs`
- `workbench.editor.wrapTabs`
- `window.openFoldersInNewWindow`
- `window.restoreWindows`
- `workbench.colorCustomizations`
- `editor.tokenColorCustomizations`

Settings bundle contract:

- Current schema: `kawaii-vscode-color-settings`
- Legacy accepted schema: `kawaii-synthwave-settings`
- Current `schemaVersion: 1`
- Export color version: `colorVersion` with numeric `major`, `minor`, and `patch`; first export starts at `0.0.1`, then increments globally for Settings Sync and JSON exports.
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
<!-- KAWAII VSCODE COLORS UI --><script src="kawaii-vscode-colors-ui.js?v=<timestamp>"></script><!-- /KAWAII VSCODE COLORS UI -->
```

Renderer placeholders replaced by `src/extensionHost/services/NeonEffectService.ts`:

- `DISABLE_GLOW`
- `EFFECT_ROOT_CLASSES`
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
- `KAWAII_UI_STYLE_VERSION`
- `NEON_BRIGHTNESS`

Runtime DOM/CSS contract:

- Workbench HTML receives only the marked `kawaii-vscode-colors-ui.js` script tag.
- The script adds `.kawaii-vscode-colors-ui` and exactly one sanitized inner theme class, normally `.dark-pink-kawaii` or `.light-pink-pastel-kawaii`, to the highest available workbench root, normally `document.documentElement`.
- The script also adds enabled module classes from `EFFECT_ROOT_CLASSES`: `.kawaii-effect-foundation`, `.kawaii-effect-editor-background`, `.kawaii-effect-no-page-logo`, and `.kawaii-effect-glow`.
- Static UI CSS is linked with `#kawaii-vscode-colors-ui-stylesheet` and `kawaii-vscode-colors-ui.min.css?v=<same-token-as-script>`.
- Dynamic token glow rules are additive and emitted into `#kawaii-vscode-colors-ui-token-styles` as `.kawaii-vscode-colors-ui.kawaii-effect-glow.<inner-theme-wrapper> <token-selector> { ... }`.
- Static generated CSS gates editor background selectors behind `.kawaii-effect-editor-background`, no-page logo selectors behind `.kawaii-effect-no-page-logo`, and glow chrome selectors behind `.kawaii-effect-glow`.
- Stored editor background and no-tab logo images are copied into deterministic workbench asset files next to the generated JS/CSS, and generated CSS references those relative assets with the same cache-busting token instead of embedding image `data:` payloads.
- Disabling the patch removes the marked HTML script tag plus generated JS, generated CSS, and known generated image asset variants.

The renderer code must keep using VS Code workbench/theme tokens and must not define an independent UI palette for the settings webview or injected workbench surfaces. Typed renderer helpers live in `src/renderer/ThemeTemplate.ts`; the injected runtime template remains `src/js/theme_template.js` until the browser script is fully migrated.

## Test Matrix

| Layer | Command | Contract |
| --- | --- | --- |
| Codex docs guard | `npm run test:docs` | Verifies this map and `.codex` guides still match critical repo facts. |
| TypeScript strict check | `npm run type-check` | Runs TypeScript no-emit checks for extension, script, and TypeScript test configs with `allowJs` disabled. |
| TypeScript test emit | `npm run compile:tests` | Emits `.ts` tests to `out-tests` without compiling JavaScript test suites. |
| Syntax check | `npm run test:check` | Runs `type-check`, `test:docs`, compiles, then Node syntax checks for selected script wrappers, converted script output, compiled runtime output, and E2E files. |
| Unit | `npm run test:unit` | Compiles strict TypeScript output, then runs the Node test runner for scripts, shared contracts, and dependency-light runtime helpers. |
| DOM | `npm run test:dom` | Compiles first, then runs jsdom settings webview behavior, split webview contract, and visual-state DOM contracts. |
| Integration | `npm run test:integration` | Compiles, then runs VS Code Extension Development Host activation and command smoke tests. |
| Package | `npm run test:package` | Compiles script wrappers, runs the TypeScript-backed local VSIX package helper, executes VSCE prepublish compile/theme checks, and creates a local VSIX without incrementing the package version. |
| Test artifact cleanup | `npm run clean:test-artifacts` | Compiles script wrappers, then removes `.vscode-test`, `test-results`, `playwright-report`, and `out-tests` if they exist inside the workspace. |
| Disposable process cleanup diagnostics | `npm run test:cleanup-diagnostics` / `npm run test:cleanup-processes` | Compiles script wrappers, audits stale disposable VS Code processes and disposable test artifact roots, and optionally terminates only matching disposable VS Code processes. |
| Safe E2E | `npm run test:e2e` | Compiles, then runs disposable VS Code UI automation without applying the real Neon patch. |
| Current VS Code E2E | `npm run test:e2e:current` | Compiles, then runs experimental safe E2E against the latest ExTester-supported VS Code version, isolated from the stable `1.111.0` safe gate. |
| Gated Neon E2E | `KAWAII_E2E_ALLOW_NEON_PATCH=1 npm run test:e2e:neon` | Requires the flag, removes stale marked Kawaii/legacy script tags and generated UI assets from the disposable workbench before the first launch, compiles, applies all 16 Effects switch combinations with before/after screenshots, validates generated HTML/JS/CSS/assets and runtime module classes, writes `test-results/e2e/neon-effects-combination-matrix.json`, then runs real disposable workbench patch lifecycle, screenshots, restore checks, and fit matrix. |
| Safe all-tests gate | `npm run test:all` | Runs `test:check`, unit, DOM, integration, package, and safe E2E phases in sequence with fail-fast behavior and a final pass/fail/skipped summary; gated Neon E2E is excluded. |
