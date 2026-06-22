# Codex Project Operations Guide

Last reviewed: 2026-06-22

This file tells Codex how to test, run, package, locally install, and prepare this VS Code theme extension for publishing. For architecture, read `.codex/structure.md`. For official documentation links, read `.codex/docs.md`.

## Project Reality

This repository is a VS Code color theme extension with an optional Neon Effect settings-page action that patches VS Code workbench files and a setup webview that writes theme-specific user color settings.

Current tooling state:

| Area | Current state |
| --- | --- |
| Build step | `npm run build:theme` merges protected base themes and editable overrides into the generated themes loaded by VS Code. `npm run build:local` compiles script wrappers, bumps the patch version, then builds the themes and local VSIX through the TypeScript-backed package script. |
| Automated tests | The lightweight gate starts with TypeScript no-emit checks, the Codex docs drift guard, and Node syntax checks, then the regular layers cover Node unit tests, `jsdom` DOM UI tests, VS Code Extension Development Host integration tests, and ExTester/WebDriver real VS Code UI E2E tests. A separate gated Neon E2E patches only a disposable `.vscode-test` install. |
| TypeScript | Strict TypeScript mode is active with `allowJs` disabled. `package.json.main` points to compiled `./out/src/extension.js`; the runtime entry, Settings webview source, extracted Neon and Settings host controllers/services/adapters, shared contracts, pure settings/workbench helpers, settings webview contracts, and renderer helper contracts listed below are TypeScript. |
| npm dependencies | No runtime dependencies. Dev-only tooling/test dependencies are `typescript@^6.0.3`, `@types/node@^26.0.0`, `@types/vscode@^1.33.0`, `jsdom@29.1.1`, `@vscode/test-cli@0.0.12`, `@vscode/test-electron@3.0.0`, `vscode-extension-tester@8.23.0`, and `mocha@11.7.6`. |
| Packaging tool | Not installed permanently in this repo. Use `@vscode/vsce` through the existing npm scripts when packaging. |
| Runtime entry | `package.json.main` points to `./out/src/extension.js`; run `npm run compile` before extension-host, E2E, or package validation. |
| Extension id | `ITEM-PIXEL.kawaii-vscode-color` from `publisher + name`. |
| Codex documentation | `.codex/system-map.md` is the migration-oriented contract map, `.codex/change-impact.md` defines when docs must change, and `npm run test:docs` verifies critical facts against the repo. |

Do not add another build system, test framework, or dependency unless the task explicitly requires it.

## Out-of-the-Box Test Checklist

Run these checks before and after code changes:

```powershell
npm pkg get name version publisher dependencies devDependencies engines
npm run test:docs
npm run type-check
npm run test:check
npm run test:unit
npm run test:dom
npm run test:integration
npm run test:e2e
npm run build:theme
```

Expected result:

- `npm pkg get` should show `kawaii-vscode-color`, publisher `ITEM-PIXEL`, no runtime dependency object, and the pinned dev-only tooling/test dependencies.
- `npm run test:docs` should confirm `.codex` docs match package metadata, themes, message contracts, state keys, schemas, renderer placeholders, and `semanticTokenColors`.
- `npm run type-check` should run the TypeScript compatibility configs in no-emit mode for current JS migration source, scripts, and tests.
- `npm run test:check` should run `type-check`, `test:docs`, compile `out/`, then exit without syntax errors in selected scripts, compiled runtime output, and E2E files.
- `npm run test:unit` should compile strict TypeScript output first, then pass build, version, workbench patch, shared contract, settings persistence, Settings Sync / JSON import-export chain, and mocked settings message-chain unit tests.
- `npm run test:dom` should compile first, then pass settings webview DOM tests covering all safe webview events, app navigation, Help metadata, Color Settings inputs/debounce, image/logo state, incoming webview messages, warnings/errors, split webview contracts, and editor-provided `--vscode-*` tokens instead of a standalone UI palette.
- `npm run test:integration` should compile, activate the extension in the Extension Development Host, and execute `kawaii_synthwave.openSettings` without running the real Neon Effect patch.
- `npm run test:e2e` should compile, package the extension, open disposable VS Code `1.111.0` through ExTester/WebDriver, navigate the real settings webview, avoid all real Neon patch actions, cover safe fixture-backed upload/import/export/download and Random Neko flows without native dialogs or network, write safe Settings visual screenshots plus PNG analysis under `test-results/e2e`, and update `test-results/e2e/kawaii-last-run.json`.
- `npm run test:e2e:current` should compile and run the same safe E2E suite in `.vscode-test/extest-current` using ExTester's `max` version by default; use `KAWAII_E2E_CURRENT_CODE_VERSION=<version>` when probing a specific VS Code stable build.
- `npm run build:theme` should regenerate the generated theme files from protected bases and overrides without unexpected diffs.

`npm test` runs the unit, DOM, and VS Code integration layers in sequence. `npm run test:all` runs the unit, DOM, VS Code integration, and safe real VS Code E2E layers in sequence, then prints a final pass/fail/skipped summary for launch-terminal readability. It is the safe local gate and must not include `npm run test:e2e:neon`. There is no lint command in the current project.

`test-results/e2e/kawaii-last-run.json` is the project-owned last-run marker for safe, current, and gated E2E runs. Treat `test-results/e2e/.last-run.json` as optional ExTester diagnostics only, because it can remain stale after a later successful run.

TypeScript migration note:

- `tsconfig.base.json`, `tsconfig.extension.json`, `tsconfig.scripts.json`, and `tsconfig.tests.json` type-check strict TypeScript source with `allowJs` disabled.
- `npm run compile:scripts` compiles script TypeScript into `out-scripts`; `npm run compile` compiles the extension and scripts into `out` and `out-scripts`, and the extension host runtime loads `./out/src/extension.js`.
- `tsconfig.tests.emit.json` and `npm run compile:tests` emit TypeScript tests into `out-tests` without compiling JavaScript test suites.
- Real E2E orchestration lives in `scripts/run-e2e.ts` behind the stable `scripts/run-e2e.js` wrapper; E2E commands compile scripts before invoking the wrapper.
- Safe all-tests orchestration lives in `scripts/run-test-all.ts` behind the stable `scripts/run-test-all.js` wrapper; `npm run test:all` compiles scripts before invoking the wrapper.
- `vscode:prepublish`, `build:local`, integration tests, E2E scripts, gated Neon guard scripts, package version scripts, and local VSIX package scripts compile before loading or packaging the extension.

Codex documentation rule:

- Any addition, removal, or update to package metadata, source modules, webview messages, theme files, settings/state keys, persistence schemas, test workflows, E2E artifacts, or renderer placeholders must update `.codex/system-map.md` and any relevant `.codex` guide in the same change.
- Use `.codex/change-impact.md` to decide which docs must change.
- Do not treat `.codex/color_scheme_reference.md` as only agent-facing prose; `src/settings.ts` reads it at runtime for Settings color descriptions.

Visual validation rule:

- Require screenshot artifacts for behavior that changes visible UI, theme appearance, logos, image previews, editor backgrounds, layout, or visual state.
- Do not add screenshots for behavior that is purely data, filesystem, manifest, persistence, command routing, or non-visual validation.
- When a test changes a visual state, keep before/after screenshots or an equivalent baseline/after pair and inspect the images, not only DOM or CSS state.
- The safe Settings E2E must keep `settings-visual-*.png` screenshots and `settings-visual-state-analysis.json` for webview image previews, missing/loading states, warning/status/error states, invalid/empty color states, opacity values, fit selector state, controlled fixture dialog flows, and color picker alpha persistence.
- The gated Neon E2E must keep visual evidence for no-tab logo replacement, no-page logo fallback selector activity, editor-page background replacement, UI-backed fixture payload replacement, and every supported editor background fit area.

## Manual Theme Test

Use this when changing `package.json`, `themes`, or any visual theme behavior.

1. Open the repository in VS Code.
2. Run `npm run build:theme`.
3. Press `F5`, or run the existing `.vscode/launch.json` configuration named `Extension`.
4. In the Extension Development Host window, open the Command Palette.
5. Run `Preferences: Color Theme`.
6. Select `Kawaii VS Code Color` or `Kawaii VS Code Color Light`.
7. Open representative files, for example JavaScript, CSS, Markdown, JSON, and any language whose token rules were changed.
8. Use `Developer: Inspect Editor Tokens and Scopes` to verify TextMate scopes before changing `tokenColors`.
9. Run `Kawaii VS Code Color: Settings`, confirm the side menu exposes `Home`, `Settings`, `Color Settings`, `Neon Effect`, `Image Customization`, `Sync/Files`, and `Help`; edit and reset a workbench color and a syntax color if relevant.

This validates the public VS Code theme contribution without installing the extension globally.

## Live Neon Test Possibility

Live testing is possible, but it is risky because the Neon Effect setup action modifies the VS Code installation used by the Extension Development Host. The automated integration tests intentionally do not execute `Enable Neon Effect`.

Use live Neon testing only when testing `src/extension.ts`, `src/extensionHost`, `src/workbenchPatch.ts`, `src/js/theme_template.js`, or `src/css/editor_chrome.css`.

Preferred automated path:

```powershell
$env:KAWAII_E2E_ALLOW_NEON_PATCH = "1"
npm run test:e2e:neon
```

This command is intentionally separate from `npm test`, `npm run test:all`, and `npm run test:e2e`. It uses `.vscode-test/extest-111-neon`, refuses to run without `KAWAII_E2E_ALLOW_NEON_PATCH=1`, validates before/apply/remove states, and opens VS Code five times so applied, alternate, reverted, and restored checks happen after full process restarts. It also verifies UI-backed fixture image/logo payload replacement, no-tab logos, active no-page logo fallback selector matching, real editor-page background screenshots, `.monaco-editor::before` background application, editor background fit area CSS variables, and runtime CSS that keeps using editor-provided `--vscode-*` tokens instead of a separate hardcoded palette.

Recommended safe approach:

1. Use a disposable VS Code installation or VS Code Insiders. An isolated profile can reduce settings and extension noise, but it does not protect installed VS Code workbench files from being patched.
2. Open this repo.
3. Press `F5` to launch the Extension Development Host.
4. In the Extension Development Host, select the `Kawaii VS Code Color` color theme.
5. Run `Kawaii VS Code Color: Settings`, open `Neon Effect`, and select `Enable Neon Effect`.
6. Accept the reload prompt.
7. After reload, inspect whether glow and chrome changes appear.
8. Run `Kawaii VS Code Color: Settings`, open `Neon Effect`, and select `Disable Neon Effect` when done.
9. Reload again.

Important cautions:

- The enable action writes `neondreams.js` into VS Code's workbench folder.
- The enable action patches the workbench HTML with a marked script tag.
- VS Code may show an unsupported/corruption warning after the patch.
- VS Code updates can overwrite the patch; users need to re-enable the glow after updates.
- If testing on Windows, administrator permissions may be required depending on where VS Code is installed.

## Build

The theme build step is:

```powershell
npm run build:theme
```

Theme file ownership:

- `themes/kawaii_synthwave-color-theme.json` and `themes/kawaii_synthwave-color-theme-light.json` are protected base palettes.
- `themes/kawaii_synthwave-color-theme-overrides.json` and `themes/kawaii_synthwave-color-theme-light-overrides.json` are editable override files.
- `themes/kawaii_synthwave-generated-color-theme.json` and `themes/kawaii_synthwave-generated-color-theme-light.json` are generated and loaded by VS Code through `package.json.contributes.themes`.
- `scripts/build-color-theme.js` applies the base first, then override `colors`, then replaces matching override `tokenColors` by `name` or `scope`; new token rules append.

The package loads compiled runtime JavaScript from `out/` and still ships source assets used by that runtime:

- `out/src/extension.js` runs in the extension host and is compiled from `src/extension.ts`.
- `src/extensionHost` contains typed extension-host adapters, Neon and Settings controllers, and services for script assembly, settings message dispatch, settings state boundaries, and workbench patch application/removal.
- `src/extensionRoot.ts` owns source/compiled package-root asset resolution for runtime reads.
- `src/settings.ts` owns the settings webview orchestration, message routing, VS Code notifications/dialogs, and remaining UI-facing workflows.
- `src/settingsPersistence.ts` owns pure color customization block mutation and hex/scope helpers.
- `src/settingsStore.ts` owns the VS Code configuration adapter used by persistence services.
- `src/settingsColorService.ts` owns generated-theme-aware color customization orchestration.
- `src/settingsBundle.ts` owns settings bundle creation/application, Settings Sync, and JSON import/export actions.
- `src/settingsEffectsPersistence.ts` owns deterministic effect/image persistence helpers.
- `src/randomNekoImage.ts` owns Random Neko payload parsing, URL resolution, guarded HTTPS fetching, and testable image response normalization.
- `src/renderer/ThemeTemplate.ts` owns typed browser-only renderer token replacement maps, selector constants, style ids, token color matching helpers, and placeholder-adjacent tests for the injected workbench script.
- `src/settingsWebview.ts` renders the setup webview HTML as the compatibility renderer. It must use VS Code webview color tokens (`--vscode-*`) and must not define a separate hardcoded UI palette.
- `src/webview/settings` contains typed settings webview contracts for the view model, HTML/CSP adapter, page ids, style token names, and client `postMessage` types used by the compatibility renderer.
- `src/workbenchPatch.ts` contains pure workbench path and HTML patch helpers covered by unit tests.
- `src/js/theme_template.js` is read as a template and written as generated `neondreams.js`.
- `src/css/editor_chrome.css` is injected into the generated renderer script.
- `src/shared` contains TypeScript contracts, models, and runtime guards used as typed boundaries for external inputs.

## Test Architecture

| Layer | Command | Main coverage |
| --- | --- | --- |
| Unit without UI | `npm run test:unit` | Theme build merge behavior, version bump behavior, workbench patch helpers, settings persistence helpers, settings store adapter, color customization service, bundle/sync/file actions including chained Settings Sync / JSON import-export restoration, effect/image persistence, typed host controllers/services, and mocked settings message chains. |
| DOM UI | `npm run test:dom` | Compile first, then validate settings webview readiness, all safe webview events, app navigation, Help metadata, Color Settings inputs/debounce, image/logo state, incoming webview messages, warnings/errors, split webview contracts, and `--vscode-*` color-token contract. |
| VS Code integration | `npm run test:integration` | Compile, extension manifest registration, activation, command registration, and opening settings in the Extension Development Host. |
| Real VS Code UI E2E | `npm run test:e2e` | Compile, then ExTester/WebDriver opens disposable VS Code, runs the Command Palette, switches into the real settings webview iframe, validates navigation, layout, safe UI flows, color picker alpha persistence, controlled fixture dialog/Random Neko flows without native dialogs or network, screenshot artifacts for visible settings pages and dynamic visual UI states, and programmatic PNG analysis for Settings visual before/after states. |
| Current VS Code UI E2E | `npm run test:e2e:current` | Compile, then run experimental safe E2E in `.vscode-test/extest-current`; uses ExTester `max` by default and can probe a specific VS Code build via `KAWAII_E2E_CURRENT_CODE_VERSION`. |
| Gated Neon E2E | `KAWAII_E2E_ALLOW_NEON_PATCH=1 npm run test:e2e:neon` | Requires the flag, compiles, applies the real workbench patch only inside `.vscode-test`, validates UI-backed dstgroup image/logo payload replacement, validates dstgroup runtime state after full restart, captures no-tab logo and editor-page background screenshots, checks no-page logo fallback selector activity, checks editor background fit area CSS variables, switches to an alternate image and validates it after restart, captures a baseline plus screenshots for the complete editor background fit matrix, reverts to dstgroup after restart, disables the patch, and validates restored state after another full restart. |

Do not fold the gated Neon E2E into the safe suite. It must stay behind `KAWAII_E2E_ALLOW_NEON_PATCH=1`.
Both E2E commands update `test-results/e2e/kawaii-last-run.json`; use that file instead of ExTester's `.last-run.json` when deciding the last project run status.

## Package a Local VSIX

Preferred command:

```powershell
npm run build:local
```

This command compiles script wrappers, increments `package.json.version` by one patch version before packaging, synchronizes `package-lock.json` root version fields, and writes the local VSIX through `scripts/package-local-vsix.ts`.

Equivalent one-off commands:

```powershell
npm run compile:scripts
node .\scripts\increment-package-version.js
npm run build:theme
npx --yes @vscode/vsce package --out .\dist\kawaii-vscode-color-<version>.vsix
```

Before packaging:

```powershell
npm pkg get name version publisher engines
npm run type-check
npm run test:check
npm run test:unit
npm run test:dom
npm run test:integration
npm run test:e2e
npm run build:theme
```

Review `.vscodeignore` before packaging. It controls what is excluded from the VSIX.

## Install the Modified Version Locally

After generating the VSIX:

```powershell
code --install-extension .\dist\kawaii-vscode-color-<version>.vsix --force
```

For VS Code Insiders:

```powershell
code-insiders --install-extension .\dist\kawaii-vscode-color-<version>.vsix --force
```

Local install cautions:

- This package uses extension id `ITEM-PIXEL.kawaii-vscode-color`.
- VSIX-installed extensions have auto update disabled by default in VS Code.
- If publishing or sharing this fork independently, change `publisher`, `name`, display branding, repository links, and any extension-id-dependent selectors intentionally.

## Package for Publish

Use this when preparing a Marketplace-ready artifact but not publishing yet:

```powershell
npm run build:local
```

Before a publish package, verify:

- `package.json.name` is the intended extension name.
- `package.json.publisher` is the intended Marketplace publisher.
- `package.json.version` is bumped according to SemVer.
- `package.json.repository.url` points to the intended repository.
- `README.md`, screenshots, icon, and links match the fork being published.
- `.vscodeignore` does not exclude required runtime files.
- `LICENSE` is present.
- `package-lock.json` is current if dependencies were added or changed.
- `.codex/docs.md` is updated if tooling, package versions, or official references changed.

## Cleanup and Recovery Notes

If a live Neon Effect test leaves VS Code patched:

1. Run `Kawaii VS Code Color: Settings`, open `Neon Effect`, and select `Disable Neon Effect`.
2. Reload VS Code.
3. If VS Code cannot open, reinstall VS Code or manually restore the workbench HTML from a clean install.

If local VSIX installation needs to be removed:

```powershell
code --uninstall-extension ITEM-PIXEL.kawaii-vscode-color
```

For Insiders:

```powershell
code-insiders --uninstall-extension ITEM-PIXEL.kawaii-vscode-color
```

## Sources

- VS Code extension testing uses the Extension Development Host for integration testing: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- Node.js test runner is used for dependency-light unit tests: https://nodejs.org/api/test.html
- jsdom is used for DOM webview tests: https://github.com/jsdom/jsdom
- `@vscode/test-cli` provides the `vscode-test` runner configuration: https://github.com/microsoft/vscode-test-cli
- ExTester drives real VS Code UI tests through Selenium WebDriver: https://github.com/redhat-developer/vscode-extension-tester
- Mocha runs the ExTester suites: https://mochajs.org/
- VS Code publishing docs define `@vscode/vsce`, `vsce package`, VSIX packaging, `vsce publish`, and `engines.vscode` compatibility: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- VS Code marketplace docs describe installing from VSIX and note that VSIX installs disable auto update by default: https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_install-from-a-vsix
- VS Code CLI docs define `--install-extension`, `--uninstall-extension`, `--profile`, `--extensions-dir`, and `--user-data-dir`: https://code.visualstudio.com/docs/configure/command-line#_working-with-extensions
