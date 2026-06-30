# Codex Documentation Reference Guide

Last reviewed: 2026-06-25

Purpose: give Codex a stable, source-backed link index for the Kawaii VS Code Color VS Code theme extension. Use this file before changing `CHANGELOG.md`, `package.json`, `scripts/build-color-theme.js`, `scripts/update-theme-color-packs.js`, `scripts/update-theme-color-packs.ts`, `scripts/build-ui-css.js`, `scripts/build-ui-css.ts`, `scripts/check-codex-docs.js`, `scripts/clean-test-artifacts.js`, `scripts/clean-test-artifacts.ts`, `scripts/e2e-last-run.js`, `scripts/increment-package-version.js`, `scripts/increment-package-version.ts`, `scripts/package-local-vsix.js`, `scripts/package-local-vsix.ts`, `scripts/require-e2e-neon-flag.js`, `scripts/require-e2e-neon-flag.ts`, `scripts/run-e2e.js`, `scripts/run-e2e.ts`, `scripts/test-process-cleanup-diagnostics.js`, `scripts/test-process-cleanup-diagnostics.ts`, `scripts/run-test-all.js`, `scripts/run-test-all.ts`, `src/core-themes`, `src/generated-themes`, `src/extension.ts`, `src/extensionHost`, `src/extensionRoot.ts`, `src/randomNekoImage.ts`, `src/renderer`, `src/settings.ts`, `src/settingsPersistence.ts`, `src/settingsStore.ts`, `src/settingsColorService.ts`, `src/settingsBundle.ts`, `src/settingsEffectsPersistence.ts`, `src/settingsWebview.ts`, `src/webview`, `src/workbenchPatch.ts`, `src/js/theme_template.js`, `src/css/kawaii-vscode-colors-ui.min.css`, `src/scss/kawaii-vscode-colors-ui.scss`, `src/scss/generated/_editor-chrome.generated.scss`, `src/css/editor_chrome.css`, `themes/dark-pink-kawaii.json`, `themes/light-pink-pastel-kawaii.json`, packaging metadata, test tooling, or marketplace docs.

## Project Snapshot

| Item | Detected value | Source in repo | Reference |
| --- | --- | --- | --- |
| Current git remote | `https://github.com/karolva/kawaii-vscode-color` | `git remote -v` | [GitHub repository](https://github.com/karolva/kawaii-vscode-color) |
| Manifest repository | `https://github.com/EmmiiChan/kawaii-vscode-color` | `package.json.repository.url` | [GitHub repository](https://github.com/EmmiiChan/kawaii-vscode-color) |
| Upstream repository | `https://github.com/robb0wen/synthwave-vscode` | README attribution, user context | [Upstream GitHub repository](https://github.com/robb0wen/synthwave-vscode) |
| Upstream Marketplace extension | `RobbOwen.synthwave-vscode` | README attribution | [Visual Studio Marketplace page](https://marketplace.visualstudio.com/items?itemName=RobbOwen.synthwave-vscode) |
| Root package name | `kawaii-vscode-color` | `package.json`, `package-lock.json` | [VS Code extension manifest](https://code.visualstudio.com/api/references/extension-manifest), [npm package.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) |
| Root package version | Managed automatically by `package.json` and `package-lock.json`; do not duplicate the patch version in `.codex` docs | `package.json`, `package-lock.json` | [VS Code extension manifest docs](https://code.visualstudio.com/api/references/extension-manifest) |
| Release notes | Human-written release history for users, maintainers, and GitHub Releases | `CHANGELOG.md` | [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [Semantic Versioning](https://semver.org/) |
| Marketplace extension id | `ITEM-PIXEL.kawaii-vscode-color` | `package.json.publisher` + `package.json.name` | [VS Code extension manifest docs](https://code.visualstudio.com/api/references/extension-manifest) |
| VS Code engine range | `^1.33.0` | `package.json.engines.vscode` | [VS Code manifest `engines` docs](https://code.visualstudio.com/api/references/extension-manifest), [VS Code 1.33 release notes](https://code.visualstudio.com/updates/v1_33), [VS Code 1.33.0 `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/1.33.0/src/vs/vscode.d.ts) |
| Extension kind | `ui` | `package.json.extensionKind` | [Extension manifest docs](https://code.visualstudio.com/api/references/extension-manifest) |
| Activation events | `onStartupFinished`, `onCommand:kawaii_synthwave.openSettings` | `package.json.activationEvents` | [Activation Events](https://code.visualstudio.com/api/references/activation-events), [Commands guide](https://code.visualstudio.com/api/extension-guides/command) |
| Main runtime file | `./out/src/extension.js` | `package.json.main` | [Extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy), [Your First Extension - JavaScript note](https://code.visualstudio.com/api/get-started/your-first-extension) |
| Protected base theme files | `src/core-themes/kawaii_synthwave-color-theme.json`, `src/core-themes/kawaii_synthwave-color-theme-light.json` | Core upstream/base sources under `src/core-themes` | [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| Public color pack files | `themes/dark-pink-kawaii.json`, `themes/light-pink-pastel-kawaii.json` | Build-readable color packs in `themes/`, each with non-null numeric `version.major`, `version.minor`, and `version.patch` | [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| Public color pack update script | `scripts/update-theme-color-packs.js`, `scripts/update-theme-color-packs.ts`, `npm run update:themes` | Version-aware GitHub folder ingestion for public `themes/*.json` packs; `--dry-run` validates without local writes | [GitHub REST API - repository contents](https://docs.github.com/en/rest/repos/contents), [Node `https`](https://nodejs.org/api/https.html), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| Generated dark theme loaded by VS Code | `./src/generated-themes/kawaii_synthwave-generated-color-theme.json`, `uiTheme: vs-dark`, label `Dark Pink Kawaii` | `package.json.contributes.themes` | [contributes.themes reference](https://code.visualstudio.com/api/references/contribution-points#contributes.themes), [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme) |
| Generated light theme loaded by VS Code | `./src/generated-themes/kawaii_synthwave-generated-color-theme-light.json`, `uiTheme: vs`, label `Light Pink-Pastel Kawaii` | `package.json.contributes.themes` | [contributes.themes reference](https://code.visualstudio.com/api/references/contribution-points#contributes.themes), [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme) |
| Lockfile version | `lockfileVersion: 3` | `package-lock.json.lockfileVersion` | [npm package-lock.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) |

## Exact Package Inventory

No runtime npm packages are installed or declared. Dev-only tooling and test packages are pinned in `package.json` and `package-lock.json`.

| Package/runtime surface | Exact detected version/range | Dependency type | Docs to use |
| --- | --- | --- | --- |
| Root extension package | `kawaii-vscode-color` with automatic patch versioning | Local root package | [VS Code extension manifest](https://code.visualstudio.com/api/references/extension-manifest), [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) |
| VS Code extension host API | `engines.vscode: ^1.33.0` means minimum compatible VS Code API `1.33.0` | Host-provided API, imported as `require('vscode')` | Prefer [VS Code 1.33.0 `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/1.33.0/src/vs/vscode.d.ts) for compatibility checks; use [current VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) only after confirming the API existed in 1.33.0 |
| Node.js built-ins | No `engines.node` declared; runtime code and script wrappers such as `scripts/build-color-theme.js` use Node CommonJS built-ins | Built-in modules, not npm packages | [Node `fs`](https://nodejs.org/api/fs.html), [Node `path`](https://nodejs.org/api/path.html), [Node CommonJS modules](https://nodejs.org/api/modules.html). Avoid modern Node-only APIs unless verified against the target runtime |
| npm lockfile | `lockfileVersion: 3`, root package plus test dependency tree | Package manager metadata | [npm package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) |
| npm semver parsing | VS Code engine range `^1.33.0`; package patch version is automatic and stays sourced from `package.json` | Version semantics | [npm package.json version field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#version), [node-semver](https://github.com/npm/node-semver) |
| Node test runner | Host Node runtime | Test runner for `npm run test:unit` and `npm run test:dom` | [Node.js test runner](https://nodejs.org/api/test.html) |
| Codex docs guard | `scripts/check-codex-docs.js` wrapper, `scripts/check-codex-docs.ts` implementation, `scripts/check-codex-docs.test.js`, and `npm run test:docs` | Local Node script with TypeScript-compiled implementation and Node test coverage | [Node `fs`](https://nodejs.org/api/fs.html), [Node `path`](https://nodejs.org/api/path.html), [Node.js test runner](https://nodejs.org/api/test.html) |
| `jsdom` | `29.1.1` | Dev dependency for DOM UI tests | [jsdom repository and docs](https://github.com/jsdom/jsdom) |
| `@vscode/test-cli` | `0.0.12` | Dev dependency exposing `vscode-test` | [`@vscode/test-cli` repository](https://github.com/microsoft/vscode-test-cli) |
| `@vscode/test-electron` | `3.0.0` | Dev dependency used by VS Code integration tests | [`@vscode/test-electron` repository](https://github.com/microsoft/vscode-test) |
| `@types/node` | `^26.0.0` | Dev dependency for TypeScript migration checks over Node APIs | [DefinitelyTyped `@types/node`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) |
| `@types/vscode` | `^1.33.0` | Dev dependency for TypeScript migration checks against the VS Code extension API type surface | [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api), [VS Code 1.33.0 `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/1.33.0/src/vs/vscode.d.ts) |
| `vscode-extension-tester` | `8.23.0` | Dev dependency for real VS Code UI E2E through Selenium WebDriver | [ExTester repository](https://github.com/redhat-developer/vscode-extension-tester) |
| `mocha` | `11.7.6` | Dev dependency used as the ExTester test runner | [Mocha docs](https://mochajs.org/) |
| `sass` | `^1.93.3` | Dev dependency compiling the additive workbench UI Sass entrypoint to `src/css/kawaii-vscode-colors-ui.min.css` | [Sass JavaScript API](https://sass-lang.com/documentation/js-api/), [Sass CLI docs](https://sass-lang.com/documentation/cli/dart-sass/) |
| `typescript` | `^6.0.3` | Dev dependency for migration type-check and compile scripts | [TypeScript docs](https://www.typescriptlang.org/docs/) |

When adding any dependency later, update this table with:

- Exact package name and resolved version from `package-lock.json`.
- Official docs for that exact major/minor version.
- Registry page, repository, issue tracker, and migration/deprecation notes.
- Compatibility with the VS Code engine range and the extension host Node runtime.

## VS Code Extension References

Use these as primary references for manifest and runtime changes.

| Area | Used by | Official docs |
| --- | --- | --- |
| Extension manifest fields (`name`, `displayName`, `publisher`, `version`, `engines`, `activationEvents`, `main`, `contributes`) | `package.json` | [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest) |
| Contribution points | `contributes.themes`, `contributes.commands`, `contributes.configuration` | [Contribution Points](https://code.visualstudio.com/api/references/contribution-points) |
| Color theme contribution | `contributes.themes[].label`, `uiTheme`, `path` | [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme), [contributes.themes reference](https://code.visualstudio.com/api/references/contribution-points#contributes.themes) |
| Theme color keys | Edit `themes/dark-pink-kawaii.json.colors` or another public color pack; build output is `src/generated-themes/kawaii_synthwave-generated-color-theme.json.colors` for the native dark pack | [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| TextMate token colors | Edit `themes/dark-pink-kawaii.json.tokenColors` or another public color pack; build replaces matching base token rules by `name` or `scope`, and appends new token rules | [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide), [TextMate scope selectors](https://macromates.com/manual/en/scope_selectors) |
| Main setup webview | `src/settings.ts` opens `Kawaii VS Code Color: Settings`; `src/settingsWebview.ts` renders Home, Settings, `Color Settings`, `Effects`, `Image Customization`, `Sync/Files`, and `Help` pages; `src/webview/settings` holds typed view model, HTML/CSP, page-id, style-token, and client-message contracts | [Webview API](https://code.visualstudio.com/api/extension-guides/webview), [Commands guide](https://code.visualstudio.com/api/extension-guides/command) |
| Settings webview color contract | `src/settingsWebview.ts` and `src/webview/settings/SettingsWebviewStyles.ts` use VS Code webview color tokens such as `--vscode-editor-background`, not an independent palette | [Webview API](https://code.visualstudio.com/api/extension-guides/webview), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| Live user color settings | `src/settings.ts` routes webview messages; `src/settingsColorService.ts`, `src/settingsPersistence.ts`, and `src/settingsStore.ts` write `[Dark Pink Kawaii]` and `[Light Pink-Pastel Kawaii]` blocks to `workbench.colorCustomizations` and `editor.tokenColorCustomizations`, reading old `[Kawaii VS Code Color]` keys as aliases | [Themes customization](https://code.visualstudio.com/docs/configure/themes#_customize-a-color-theme), [User and workspace settings](https://code.visualstudio.com/docs/configure/settings), [WorkspaceConfiguration.update](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration) |
| Semantic highlighting opt-in | Protected base currently defines `semanticHighlighting`; generated theme carries the merged value | [Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide) |
| Commands | `kawaii_synthwave.openSettings`, `vscode.commands.registerCommand`, `vscode.commands.executeCommand` | [Commands guide](https://code.visualstudio.com/api/extension-guides/command), [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) |
| Activation | `onStartupFinished`, `onCommand:*` activation events | [Activation Events](https://code.visualstudio.com/api/references/activation-events) |
| Configuration | `kawaii_synthwave.brightness`, `kawaii_synthwave.disableGlow`, `workspace.getConfiguration("kawaii_synthwave")` | [contributes.configuration](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration), [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) |
| Extension lifecycle | `activate(context)`, `deactivate()` | [Extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy), [Activation Events lifecycle note](https://code.visualstudio.com/api/references/activation-events) |
| Extension debugging | `.vscode/launch.json` with `type: "extensionHost"` | [Your First Extension - debugging](https://code.visualstudio.com/api/get-started/your-first-extension), [VS Code debugging docs](https://code.visualstudio.com/docs/debugtest/debugging) |
| Extension integration tests | `.vscode-test.js`, `test/integration/**/*.test.js`, and `npm run test:integration`; the script compiles before launching the Extension Development Host | [VS Code extension testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension), [`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli) |
| Real VS Code UI E2E tests | `scripts/run-e2e.js` wrapper, `scripts/run-e2e.ts` implementation, `scripts/e2e-last-run.js` wrapper, `scripts/e2e-last-run.ts` implementation, `scripts/require-e2e-neon-flag.js` wrapper, `scripts/require-e2e-neon-flag.ts` implementation, `test/e2e/**/*.spec.js`, `npm run test:e2e`, experimental `npm run test:e2e:current`, project marker `test-results/e2e/kawaii-last-run.json`, gated `npm run test:e2e:neon`, and gated matrix report `test-results/e2e/neon-effects-combination-matrix.json`; E2E scripts compile before launch/package work, and Neon mode removes stale marked Kawaii/legacy workbench script tags plus generated UI assets from disposable storage before the first launch and validates all 16 modular Effects switch combinations | [ExTester repository](https://github.com/redhat-developer/vscode-extension-tester), [Mocha docs](https://mochajs.org/), [VS Code extension testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension), [Node fs](https://nodejs.org/api/fs.html), [Node path](https://nodejs.org/api/path.html) |
| Disposable VS Code cleanup diagnostics | `scripts/test-process-cleanup-diagnostics.js` wrapper, `scripts/test-process-cleanup-diagnostics.ts` implementation, `scripts/test-process-cleanup-diagnostics.test.js`, `npm run test:cleanup-diagnostics`, and `npm run test:cleanup-processes`; audits disposable test artifact roots and optionally terminates only matching disposable VS Code processes | [Node child_process.spawnSync](https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options), [Node fs](https://nodejs.org/api/fs.html), [Node path](https://nodejs.org/api/path.html), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| Random Neko image fetcher | `src/randomNekoImage.ts` and fixture-backed E2E hooks in `src/settings.ts`; safe tests must mock or fixture network responses and avoid external API calls in gates | [Node https](https://nodejs.org/api/https.html), [Node URL](https://nodejs.org/api/url.html), [Nekos.moe API docs](https://docs.nekos.moe/) |
| Local VSIX package check | `scripts/package-local-vsix.js` wrapper, `scripts/package-local-vsix.ts` implementation, and `npm run test:package`; validates the VSIX packaging path without incrementing `package.json.version` | [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [@vscode/vsce repository](https://github.com/microsoft/vscode-vsce), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| Test artifact cleanup | `scripts/clean-test-artifacts.js` wrapper, `scripts/clean-test-artifacts.ts` implementation, `npm run clean:test-artifacts`, and `npm run build:clean`; removes `.vscode-test`, `test-results`, `playwright-report`, and `out-tests` before optional local VSIX packaging | [Node fs](https://nodejs.org/api/fs.html), [Node path](https://nodejs.org/api/path.html), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| Safe all-tests orchestration | `scripts/run-test-all.js` wrapper, `scripts/run-test-all.ts` implementation, and `npm run test:all`; runs `test:check`, unit, DOM, integration, `test:package`, and safe E2E phases while intentionally excluding gated Neon E2E | [Node child_process.spawn](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| Codex documentation drift guard | `scripts/check-codex-docs.js`, `scripts/check-codex-docs.ts`, `scripts/check-codex-docs.test.js`, `npm run test:docs`, and `npm run test:check` | [Node `fs`](https://nodejs.org/api/fs.html), [Node `path`](https://nodejs.org/api/path.html), [Node.js test runner](https://nodejs.org/api/test.html), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| TypeScript migration checks | `tsconfig.base.json`, `tsconfig.extension.json`, `tsconfig.scripts.json`, `tsconfig.tests.json`, `tsconfig.tests.emit.json`, `npm run type-check`, `npm run compile`, `npm run compile:scripts`, and `npm run compile:tests` | [TypeScript TSConfig reference](https://www.typescriptlang.org/tsconfig/), [TypeScript command line compiler](https://www.typescriptlang.org/docs/handbook/compiler-options.html) |
| Packaging/publishing | Marketplace release workflow | [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [@vscode/vsce repository](https://github.com/microsoft/vscode-vsce) |

Compatibility rule:

- Because this project targets VS Code `^1.33.0`, do not use APIs introduced after VS Code 1.33 unless `engines.vscode` is intentionally raised.
- VS Code docs state that explicit `onCommand` activation events are unnecessary only from VS Code 1.74.0 onward; this project still needs them while the engine range remains `^1.33.0`.

## Runtime API References

### `src/extension.ts` and `src/extensionHost`

| API/surface | Current usage | Official docs |
| --- | --- | --- |
| TypeScript CommonJS output | `src/extension.ts` compiles to `out/src/extension.js`; `src/extensionHost` compiles to `out/src/extensionHost` | [Node CommonJS modules](https://nodejs.org/api/modules.html), [TypeScript Modules](https://www.typescriptlang.org/docs/handbook/modules.html) |
| `path.dirname` / `path.join` | Derives VS Code app directory from `vscode.env.appRoot` and builds workbench/generated script paths in services | [Node `path.dirname`](https://nodejs.org/api/path.html#pathdirnamepath), [Node `path.join`](https://nodejs.org/api/path.html#pathjoinpaths) |
| `fs.readFileSync` / `fs.writeFileSync` / `fs.existsSync` | Adapter-backed filesystem reads/writes for CSS, JS template, workbench HTML, `kawaii-vscode-colors-ui.js`, and stored images | [Node `fs.readFileSync`](https://nodejs.org/api/fs.html#fsreadfilesyncpath-options), [Node `fs.writeFileSync`](https://nodejs.org/api/fs.html#fswritefilesyncfile-data-options), [Node `fs.existsSync`](https://nodejs.org/api/fs.html#fsexistssyncpath) |
| `vscode.workspace.getConfiguration` | Reads `kawaii_synthwave` settings | [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) |
| `vscode.env.appRoot` | Locates VS Code installation root | [VS Code API reference - env](https://code.visualstudio.com/api/references/vscode-api#env) |
| `vscode.commands.registerCommand` | Registers enable/disable commands | [VS Code Commands guide](https://code.visualstudio.com/api/extension-guides/command) |
| `vscode.commands.executeCommand` | Reloads window with `workbench.action.reloadWindow` | [VS Code API reference - commands](https://code.visualstudio.com/api/references/vscode-api#commands), [Built-in Commands](https://code.visualstudio.com/api/references/commands) |
| `vscode.window.showInformationMessage` / `showErrorMessage` | User-facing activation/deactivation feedback | [VS Code API reference - window](https://code.visualstudio.com/api/references/vscode-api#window) |
| `context.subscriptions` | Disposes registered commands with extension lifecycle | [ExtensionContext in VS Code API](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext) |

Implementation caution:

- This extension modifies VS Code internal workbench files. Internal paths such as `out/vs/code/electron-browser/workbench` and `out/vs/code/electron-sandbox/workbench` are not a stable public VS Code API. Before changing this logic, check current VS Code installation layout and upstream issues.
- Prefer graceful error handling around filesystem writes because permission errors are expected on some installations.

### `src/settings.ts`

| API/surface | Current usage | Official docs |
| --- | --- | --- |
| `window.createWebviewPanel` | Opens the main setup UI as a normal editor tab | [Webview API](https://code.visualstudio.com/api/extension-guides/webview), [window.createWebviewPanel](https://code.visualstudio.com/api/references/vscode-api#window.createWebviewPanel) |
| `webview.html` | Renders the Home page, side menu, color settings page, Effects page, CSS, and script | [Webview API - content](https://code.visualstudio.com/api/extension-guides/webview#webview-api-basics) |
| `webview.onDidReceiveMessage` / `webview.postMessage` | Sends color updates, reset requests, Effects requests, errors, and refreshed state between webview and extension host | [Webview API - passing messages](https://code.visualstudio.com/api/extension-guides/webview#passing-messages-from-a-webview-to-an-extension) |
| `vscode.env.openExternal` / `vscode.Uri.parse` | Opens allow-listed Home page reference links in the user's external browser | [VS Code API reference - env.openExternal](https://code.visualstudio.com/api/references/vscode-api#env), [VS Code API reference - Uri](https://code.visualstudio.com/api/references/vscode-api#Uri) |
| Corruption warning references | Effects page links to the official unsupported-installation explanation and an optional community checksum-fix workaround | [VS Code FAQ - Installation appears to be corrupt](https://code.visualstudio.com/docs/supporting/faq#_installation-appears-to-be-corrupt-unsupported), [Fix VSCode Checksums Next Next Marketplace page](https://marketplace.visualstudio.com/items?itemName=iewnfod.vscode-fix-checksums-next-next) |
| `workspace.getConfiguration().get` | Reads current user/workspace color customization settings | [WorkspaceConfiguration](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration), [Settings docs](https://code.visualstudio.com/docs/configure/settings) |
| `workspace.getConfiguration().update(..., true)` | Writes user-scope theme-specific color overrides | [WorkspaceConfiguration.update](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration), [Settings scopes](https://code.visualstudio.com/docs/configure/settings#_settings-precedence) |
| `workbench.colorCustomizations` | Stores workbench UI color overrides under `[Dark Pink Kawaii]` and `[Light Pink-Pastel Kawaii]` | [Customize a Color Theme - Workbench colors](https://code.visualstudio.com/docs/configure/themes#_workbench-colors), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| `editor.tokenColorCustomizations.textMateRules` | Stores TextMate foreground overrides under `[Dark Pink Kawaii]` and `[Light Pink-Pastel Kawaii]` | [Customize a Color Theme - Editor syntax highlighting](https://code.visualstudio.com/docs/configure/themes#_editor-syntax-highlighting), [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide) |

Implementation caution:

- The settings webview must not edit `src/generated-themes/kawaii_synthwave-generated-color-theme.json` at runtime. VS Code theme contributions are declared through static manifest paths, while per-user live changes belong in user settings.
- Keep writes theme-scoped under `[Dark Pink Kawaii]` and `[Light Pink-Pastel Kawaii]` so reset operations do not erase unrelated user color customizations.

### Extracted Settings Modules

| Module | Responsibility | Validation |
| --- | --- | --- |
| `src/settingsPersistence.ts` | Pure color customization block mutation, TextMate scope comparison, and hex validation | `test/unit/settings-persistence.test.js` |
| `src/settingsStore.ts` | VS Code configuration get/inspect/update adapter for global and workspace targets | `test/unit/settings-store.test.js` |
| `src/settingsColorService.ts` | Generated-theme-aware color update/reset/theme-switch orchestration | `test/unit/settings-color-service.test.js` |
| `src/settingsBundle.ts` | Portable bundle creation/application, application settings export/import, Settings Sync state, and JSON import/export actions | `test/unit/settings-bundle.test.js`, including chained state-model coverage for Save VSSync, Import VSSync, Export As, and Import |
| `src/settingsEffectsPersistence.ts` | Effect/image normalization, safe storage paths, metadata/state, export/restore/store/remove helpers | `test/unit/settings-effects-persistence.test.js` |
| `src/settings.ts` message chain | Mocked `openSettings -> onDidReceiveMessage -> persistence` wiring | `test/unit/settings-message-persistence.test.js` |
| `src/webview/settings` | Typed settings webview view model, CSP helper, page ids, style token names, and client message names while the legacy inline renderer remains in `src/settingsWebview.ts` | `test/dom/settings-webview-split.test.js` |

### `src/renderer` and `src/js/theme_template.js`

| Module | Responsibility | Validation |
| --- | --- | --- |
| `src/renderer/ThemeTemplate.ts` | Browser-only typed constants and pure helpers for renderer token replacement maps, Kawaii wrapper selectors, runtime style ids, token color normalization, and token CSS replacement behavior | `test/unit/renderer-theme-template.test.js` |
| `src/shared/contracts/rendererPlaceholders.ts` | Typed renderer placeholder names plus helper functions to find and replace known placeholders without touching unknown template text | `test/unit/renderer-theme-template.test.js`, `test/unit/shared-contracts.test.js` |
| `src/js/theme_template.js` | Injected browser runtime template still read by the extension host and written as `kawaii-vscode-colors-ui.js`; it adds `.kawaii-vscode-colors-ui`, links `kawaii-vscode-colors-ui.min.css`, and emits additive token rules | Safe E2E and gated Neon E2E when renderer behavior changes |

| API/surface | Current usage | Docs |
| --- | --- | --- |
| `MutationObserver` | Waits for VS Code theme/token style nodes to become available | [MDN MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) |
| `document.querySelector` | Finds body, theme markers, token style nodes, injected style tag | [MDN Document.querySelector](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) |
| `document.createElement` | Creates injected `<style>` element | [MDN Document.createElement](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement) |
| `Element.setAttribute` | Sets injected style element id | [MDN Element.setAttribute](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute) |
| `HTMLElement.innerText` | Reads/replaces generated token CSS content | [MDN HTMLElement.innerText](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText) |
| `Node.appendChild` | Appends generated style tag to body | [MDN Node.appendChild](https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild) |
| `MutationObserver.observe` / `disconnect` | Starts and stops DOM mutation observation | [MDN MutationObserver.observe](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe), [MDN MutationObserver.disconnect](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect) |
| `RegExp` | Builds token color replacement regexes | [MDN RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) |
| `String.prototype.replace`, `includes`, `toLowerCase` | Template/token replacement and matching | [MDN String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) |
| `Object.keys`, `Array.prototype.every`, `Array.prototype.reduce` | Iterates token replacement map | [MDN Object.keys](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys), [MDN Array.every](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every), [MDN Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce) |

DOM compatibility rule:

- The script runs inside VS Code's Electron renderer context after being injected into workbench HTML. Verify selectors against the target VS Code version before changing `.vscode-tokens-styles`, `theme-json`, or extension-id class matching.

### `src/scss/kawaii-vscode-colors-ui.scss`, `src/css/kawaii-vscode-colors-ui.min.css`, `src/css/editor_chrome.css`

| CSS feature | Current usage | Docs |
| --- | --- | --- |
| CSS selectors and pseudo-elements | Workbench and Monaco selector overrides, `::after`, `:before` | [MDN CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors), [MDN pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements) |
| `linear-gradient()` | Editor background, active tab/sidebar stripes, badges | [MDN linear-gradient](https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/linear-gradient) |
| `text-shadow` | Neon token glow styles generated in JS template | [MDN text-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/text-shadow) |
| `box-shadow` | Active tab/sidebar glow effects | [MDN box-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow) |
| `filter: drop-shadow()` | Lightbulb glyph glow | [MDN drop-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow) |
| `background`, `background-image`, `background-size`, `background-position`, `background-repeat` | Chrome backgrounds and embedded SVG icon | [MDN background](https://developer.mozilla.org/en-US/docs/Web/CSS/background), [MDN background-image](https://developer.mozilla.org/en-US/docs/Web/CSS/background-image) |
| `position: sticky`, `absolute`, `relative` | Active tab and activity item overlays | [MDN position](https://developer.mozilla.org/en-US/docs/Web/CSS/position) |
| `z-index` | Overlay stripe stacking | [MDN z-index](https://developer.mozilla.org/en-US/docs/Web/CSS/z-index) |
| `transition`, `opacity` | Active/inactive stripe transitions | [MDN transition](https://developer.mozilla.org/en-US/docs/Web/CSS/transition), [MDN opacity](https://developer.mozilla.org/en-US/docs/Web/CSS/opacity) |
| `data:` URLs | Embedded SVG lightbulb icon | [MDN data URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data) |
| SVG | Inline SVG icon data | [MDN SVG](https://developer.mozilla.org/en-US/docs/Web/SVG) |

CSS maintenance rule:

- Workbench/Monaco class names are internal implementation details. Validate visually in an Extension Development Host or local VS Code install after selector changes.

## Theme JSON References

The theme palette is intentionally split so upstream/base files stay in core and public color packs stay in `themes/`.

| Theme file | Role | Modification rule |
| --- | --- | --- |
| `src/core-themes/kawaii_synthwave-color-theme.json` | Protected dark base theme copied from the upstream lineage | Do not modify for Kawaii palette changes. |
| `src/core-themes/kawaii_synthwave-color-theme-light.json` | Protected light base theme inspired by Sakura Theme | Do not modify for Kawaii palette changes. |
| `themes/dark-pink-kawaii.json` | Public dark Kawaii color pack | Put native dark `colors`, `tokenColors`, `semanticTokenColors`, and numeric color pack `version` metadata here. |
| `themes/light-pink-pastel-kawaii.json` | Public light Kawaii color pack | Put native light `colors`, `tokenColors`, `semanticTokenColors`, and numeric color pack `version` metadata here. |
| `src/generated-themes/kawaii_synthwave-generated-color-theme.json` | Generated dark file loaded by `package.json.contributes.themes` as `Dark Pink Kawaii` / `vs-dark` | Do not edit manually; regenerate with `npm run build:theme`. |
| `src/generated-themes/kawaii_synthwave-generated-color-theme-light.json` | Generated light file loaded by `package.json.contributes.themes` as `Light Pink-Pastel Kawaii` / `vs` | Do not edit manually; regenerate with `npm run build:theme`. |
| `src/generated-themes/internal-themes.json` | Generated internal catalog of every public color pack, version, and merged theme payload | Do not edit manually; regenerate with `npm run build:theme`. |
| `scripts/build-color-theme.js` / `scripts/build-color-theme.ts` | Stable wrapper plus TypeScript implementation that reads public color packs and applies the matching core base first | Keep dependency-free unless a future task explicitly adds a JSONC parser dependency. |
| `scripts/update-theme-color-packs.js` / `scripts/update-theme-color-packs.ts` | Stable wrapper plus TypeScript implementation that reads the public GitHub `themes` folder, validates each JSON as a public color pack, compares numeric versions, and writes only missing or newer packs | Use `npm run update:themes -- --dry-run` before trusting remote folder changes. |
| User settings `[Dark Pink Kawaii]` blocks | Local live user overrides written by `src/settings.ts`; old `[Kawaii VS Code Color]` blocks are legacy aliases | Do not treat these as source theme files; they are per-user VS Code settings. |

| Theme section | Use in this project | Docs |
| --- | --- | --- |
| `name`, `type` | Theme identity and dark theme classification in the generated theme | [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme) |
| `semanticHighlighting` | Opts the generated theme into semantic highlighting | [Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide) |
| `semanticTokenColors` | Both generated themes currently define semantic token color overrides after base/override merge | [Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide) |
| `colors` | Workbench UI color IDs such as `editor.background`, `activityBar.background`, `terminal.ansiBlue`; override values replace base values by key | [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| `tokenColors` | TextMate scope color rules for syntax tokens; matching override rules replace base rules by `name` or `scope`, and new override rules append | [Syntax Highlight Guide - theming](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide#theming), [TextMate scope selectors](https://macromates.com/manual/en/scope_selectors) |
| TextMate scopes | Language-specific scopes such as `source.go`, `source.elixir`, `storage.type.cs` | [Syntax Highlight Guide - TextMate tokens and scopes](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide#textmate-tokens-and-scopes), [TextMate naming conventions](https://macromates.com/manual/en/language_grammars#naming_conventions) |

Theme validation checklist:

- Run `npm run build:theme` before testing, packaging, or publishing.
- Run `npm run update:themes -- --dry-run` when validating the public GitHub `themes` folder before downloading community color packs.
- Use `Developer: Inspect Editor Tokens and Scopes` to verify any token scope before changing `tokenColors`.
- Check whether semantic tokens override TextMate rules when a language server is active.
- Keep color values in VS Code-supported hex formats: `#RGB`, `#RGBA`, `#RRGGBB`, or `#RRGGBBAA`.

## npm, Packaging, and Marketplace

| Area | Docs |
| --- | --- |
| npm package metadata | [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) |
| npm lockfile metadata | [npm package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) |
| SemVer ranges | [node-semver](https://github.com/npm/node-semver) |
| VS Code extension publishing | [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) |
| VS Code packaging CLI | [@vscode/vsce GitHub](https://github.com/microsoft/vscode-vsce) |
| Release notes format | [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [Semantic Versioning](https://semver.org/) |
| Upstream Marketplace extension page | [SynthWave '84 - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=RobbOwen.synthwave-vscode) |
| Marketplace publisher reference | [Visual Studio Marketplace publishers](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token) |

Packaging caution:

- `package-lock.json` contains the dev-only test dependency tree for `jsdom`, `@vscode/test-cli`, `@vscode/test-electron`, `vscode-extension-tester`, and `mocha`.
- `.vscodeignore` controls files excluded from the extension package. Check it before packaging assets or docs.
- If publishing from this fork under a different publisher/name, update `publisher`, `name`, repository URLs, README links, badges, marketplace references, and extension id assumptions in code.

## Community and Support Links

Use these after official docs when examples or issue history are needed.

| Topic | Link |
| --- | --- |
| VS Code source and issues | [microsoft/vscode](https://github.com/microsoft/vscode) |
| VS Code public docs source | [microsoft/vscode-docs](https://github.com/microsoft/vscode-docs) |
| VS Code extension samples | [microsoft/vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples) |
| VS Code packaging CLI issues | [microsoft/vscode-vsce](https://github.com/microsoft/vscode-vsce) |
| TextMate manual | [TextMate 1.x manual](https://macromates.com/manual/en/) |
| MDN Web Docs source/community | [mdn/content](https://github.com/mdn/content) |
| npm CLI docs/source | [npm/cli](https://github.com/npm/cli) |
| npm semver implementation | [npm/node-semver](https://github.com/npm/node-semver) |
| Current git remote | [karolva/kawaii-vscode-color](https://github.com/karolva/kawaii-vscode-color) |
| Manifest repository | [EmmiiChan/kawaii-vscode-color](https://github.com/EmmiiChan/kawaii-vscode-color) |
| Upstream project | [robb0wen/synthwave-vscode](https://github.com/robb0wen/synthwave-vscode) |

## Codex Lookup Rules for This Project

1. Start with `package.json` and `package-lock.json` to confirm exact versions before suggesting APIs or packages.
2. For `vscode` APIs, check the current docs for shape and examples, then verify the API exists in [VS Code 1.33.0 `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/1.33.0/src/vs/vscode.d.ts) unless `engines.vscode` is raised.
3. For theme colors, edit only the relevant public color pack in `themes/`, validate color IDs in [Theme Color reference](https://code.visualstudio.com/api/references/theme-color), optionally run `npm run update:themes -- --dry-run` when the public GitHub folder is involved, then run `npm run build:theme`.
4. For `tokenColors`, edit only the relevant public color pack in `themes/`, validate scopes with `Developer: Inspect Editor Tokens and Scopes` and the [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide), then run `npm run build:theme`.
5. For live user color customization behavior, prefer `workbench.colorCustomizations` and `editor.tokenColorCustomizations` over generating new contributed theme files at runtime.
6. For DOM/CSS changes, use MDN docs and test in the VS Code workbench context because injected code depends on internal workbench markup.
7. For filesystem changes, use Node official docs and keep permission/ENOENT/EPERM handling explicit.
8. Do not assume latest Node.js, latest VS Code, or latest package syntax. This repository currently targets VS Code 1.33+ and declares no Node engine.
9. If adding TypeScript, tests, bundling, or new packages, add corresponding exact-version references to this file in the same table format.
