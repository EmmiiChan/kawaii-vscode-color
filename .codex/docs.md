# Codex Documentation Reference Guide

Last reviewed: 2026-06-17

Purpose: give Codex a stable, source-backed link index for the Kawaii VS Code Color VS Code theme extension. Use this file before changing `package.json`, `scripts/build-color-theme.js`, `scripts/check-codex-docs.js`, `scripts/e2e-last-run.js`, `scripts/run-e2e.js`, `scripts/run-test-all.js`, `src/extension.js`, `src/randomNekoImage.js`, `src/settings.js`, `src/settingsPersistence.js`, `src/settingsStore.js`, `src/settingsColorService.js`, `src/settingsBundle.js`, `src/settingsEffectsPersistence.js`, `src/settingsWebview.js`, `src/workbenchPatch.js`, `src/js/theme_template.js`, `src/css/editor_chrome.css`, `themes/kawaii_synthwave-color-theme-overrides.json`, `themes/kawaii_synthwave-color-theme-light-overrides.json`, packaging metadata, test tooling, or marketplace docs.

## Project Snapshot

| Item | Detected value | Source in repo | Reference |
| --- | --- | --- | --- |
| Current git remote | `https://github.com/karolva/kawaii-vscode-color` | `git remote -v` | [GitHub repository](https://github.com/karolva/kawaii-vscode-color) |
| Manifest repository | `https://github.com/EmmiiChan/kawaii-vscode-color` | `package.json.repository.url` | [GitHub repository](https://github.com/EmmiiChan/kawaii-vscode-color) |
| Upstream repository | `https://github.com/robb0wen/synthwave-vscode` | README attribution, user context | [Upstream GitHub repository](https://github.com/robb0wen/synthwave-vscode) |
| Upstream Marketplace extension | `RobbOwen.synthwave-vscode` | README attribution | [Visual Studio Marketplace page](https://marketplace.visualstudio.com/items?itemName=RobbOwen.synthwave-vscode) |
| Root package name | `kawaii-vscode-color` | `package.json`, `package-lock.json` | [VS Code extension manifest](https://code.visualstudio.com/api/references/extension-manifest), [npm package.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) |
| Root package version | Managed automatically by `package.json` and `package-lock.json`; do not duplicate the patch version in `.codex` docs | `package.json`, `package-lock.json` | [VS Code extension manifest docs](https://code.visualstudio.com/api/references/extension-manifest) |
| Marketplace extension id | `ITEM-PIXEL.kawaii-vscode-color` | `package.json.publisher` + `package.json.name` | [VS Code extension manifest docs](https://code.visualstudio.com/api/references/extension-manifest) |
| VS Code engine range | `^1.33.0` | `package.json.engines.vscode` | [VS Code manifest `engines` docs](https://code.visualstudio.com/api/references/extension-manifest), [VS Code 1.33 release notes](https://code.visualstudio.com/updates/v1_33), [VS Code 1.33.0 `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/1.33.0/src/vs/vscode.d.ts) |
| Extension kind | `ui` | `package.json.extensionKind` | [Extension manifest docs](https://code.visualstudio.com/api/references/extension-manifest) |
| Activation events | `onStartupFinished`, `onCommand:kawaii_synthwave.openSettings` | `package.json.activationEvents` | [Activation Events](https://code.visualstudio.com/api/references/activation-events), [Commands guide](https://code.visualstudio.com/api/extension-guides/command) |
| Main runtime file | `./src/extension.js` | `package.json.main` | [Extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy), [Your First Extension - JavaScript note](https://code.visualstudio.com/api/get-started/your-first-extension) |
| Protected base theme files | `themes/kawaii_synthwave-color-theme.json`, `themes/kawaii_synthwave-color-theme-light.json` | Upstream/base sources in `themes` | [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| Editable override theme files | `themes/kawaii_synthwave-color-theme-overrides.json`, `themes/kawaii_synthwave-color-theme-light-overrides.json` | Kawaii-specific override sources in `themes` | [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| Generated dark theme loaded by VS Code | `./themes/kawaii_synthwave-generated-color-theme.json`, `uiTheme: vs-dark`, label `Kawaii VS Code Color` | `package.json.contributes.themes` | [contributes.themes reference](https://code.visualstudio.com/api/references/contribution-points#contributes.themes), [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme) |
| Generated light theme loaded by VS Code | `./themes/kawaii_synthwave-generated-color-theme-light.json`, `uiTheme: vs`, label `Kawaii VS Code Color Light` | `package.json.contributes.themes` | [contributes.themes reference](https://code.visualstudio.com/api/references/contribution-points#contributes.themes), [Color Theme guide](https://code.visualstudio.com/api/extension-guides/color-theme) |
| Lockfile version | `lockfileVersion: 3` | `package-lock.json.lockfileVersion` | [npm package-lock.json docs](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) |

## Exact Package Inventory

No runtime npm packages are installed or declared. Dev-only test packages are pinned in `package.json` and `package-lock.json`.

| Package/runtime surface | Exact detected version/range | Dependency type | Docs to use |
| --- | --- | --- | --- |
| Root extension package | `kawaii-vscode-color` with automatic patch versioning | Local root package | [VS Code extension manifest](https://code.visualstudio.com/api/references/extension-manifest), [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) |
| VS Code extension host API | `engines.vscode: ^1.33.0` means minimum compatible VS Code API `1.33.0` | Host-provided API, imported as `require('vscode')` | Prefer [VS Code 1.33.0 `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/1.33.0/src/vs/vscode.d.ts) for compatibility checks; use [current VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) only after confirming the API existed in 1.33.0 |
| Node.js built-ins | No `engines.node` declared; runtime code and `scripts/build-color-theme.js` use Node CommonJS built-ins | Built-in modules, not npm packages | [Node `fs`](https://nodejs.org/api/fs.html), [Node `path`](https://nodejs.org/api/path.html), [Node CommonJS modules](https://nodejs.org/api/modules.html). Avoid modern Node-only APIs unless verified against the target runtime |
| npm lockfile | `lockfileVersion: 3`, root package plus test dependency tree | Package manager metadata | [npm package-lock.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) |
| npm semver parsing | VS Code engine range `^1.33.0`; package patch version is automatic and stays sourced from `package.json` | Version semantics | [npm package.json version field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#version), [node-semver](https://github.com/npm/node-semver) |
| Node test runner | Host Node runtime | Test runner for `npm run test:unit` and `npm run test:dom` | [Node.js test runner](https://nodejs.org/api/test.html) |
| Codex docs guard | `scripts/check-codex-docs.js`, `scripts/check-codex-docs.test.js`, and `npm run test:docs` | Local CommonJS script with Node test coverage | [Node `fs`](https://nodejs.org/api/fs.html), [Node `path`](https://nodejs.org/api/path.html), [Node.js test runner](https://nodejs.org/api/test.html) |
| `jsdom` | `29.1.1` | Dev dependency for DOM UI tests | [jsdom repository and docs](https://github.com/jsdom/jsdom) |
| `@vscode/test-cli` | `0.0.12` | Dev dependency exposing `vscode-test` | [`@vscode/test-cli` repository](https://github.com/microsoft/vscode-test-cli) |
| `@vscode/test-electron` | `3.0.0` | Dev dependency used by VS Code integration tests | [`@vscode/test-electron` repository](https://github.com/microsoft/vscode-test) |
| `vscode-extension-tester` | `8.23.0` | Dev dependency for real VS Code UI E2E through Selenium WebDriver | [ExTester repository](https://github.com/redhat-developer/vscode-extension-tester) |
| `mocha` | `11.7.6` | Dev dependency used as the ExTester test runner | [Mocha docs](https://mochajs.org/) |

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
| Theme color keys | Edit `themes/kawaii_synthwave-color-theme-overrides.json.colors`; build output is `themes/kawaii_synthwave-generated-color-theme.json.colors` | [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| TextMate token colors | Edit `themes/kawaii_synthwave-color-theme-overrides.json.tokenColors`; build replaces matching base token rules by `name` or `scope`, and appends new token rules | [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide), [TextMate scope selectors](https://macromates.com/manual/en/scope_selectors) |
| Main setup webview | `src/settings.js` opens `Kawaii VS Code Color: Settings`; `src/settingsWebview.js` renders Home, Settings, `Color Settings`, `Neon Effect`, `Image Customization`, `Sync/Files`, and `Help` pages | [Webview API](https://code.visualstudio.com/api/extension-guides/webview), [Commands guide](https://code.visualstudio.com/api/extension-guides/command) |
| Settings webview color contract | `src/settingsWebview.js` uses VS Code webview color tokens such as `--vscode-editor-background`, not an independent palette | [Webview API](https://code.visualstudio.com/api/extension-guides/webview), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| Live user color settings | `src/settings.js` routes webview messages; `src/settingsColorService.js`, `src/settingsPersistence.js`, and `src/settingsStore.js` write `[Kawaii VS Code Color]` and `[Kawaii VS Code Color Light]` blocks to `workbench.colorCustomizations` and `editor.tokenColorCustomizations` | [Themes customization](https://code.visualstudio.com/docs/configure/themes#_customize-a-color-theme), [User and workspace settings](https://code.visualstudio.com/docs/configure/settings), [WorkspaceConfiguration.update](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration) |
| Semantic highlighting opt-in | Protected base currently defines `semanticHighlighting`; generated theme carries the merged value | [Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide) |
| Commands | `kawaii_synthwave.openSettings`, `vscode.commands.registerCommand`, `vscode.commands.executeCommand` | [Commands guide](https://code.visualstudio.com/api/extension-guides/command), [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) |
| Activation | `onStartupFinished`, `onCommand:*` activation events | [Activation Events](https://code.visualstudio.com/api/references/activation-events) |
| Configuration | `kawaii_synthwave.brightness`, `kawaii_synthwave.disableGlow`, `workspace.getConfiguration("kawaii_synthwave")` | [contributes.configuration](https://code.visualstudio.com/api/references/contribution-points#contributes.configuration), [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) |
| Extension lifecycle | `activate(context)`, `deactivate()` | [Extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy), [Activation Events lifecycle note](https://code.visualstudio.com/api/references/activation-events) |
| Extension debugging | `.vscode/launch.json` with `type: "extensionHost"` | [Your First Extension - debugging](https://code.visualstudio.com/api/get-started/your-first-extension), [VS Code debugging docs](https://code.visualstudio.com/docs/debugtest/debugging) |
| Extension integration tests | `.vscode-test.js`, `test/integration/**/*.test.js`, and `npm run test:integration` | [VS Code extension testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension), [`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli) |
| Real VS Code UI E2E tests | `scripts/run-e2e.js`, `scripts/e2e-last-run.js`, `test/e2e/**/*.spec.js`, `npm run test:e2e`, experimental `npm run test:e2e:current`, project marker `test-results/e2e/kawaii-last-run.json`, and gated `npm run test:e2e:neon` | [ExTester repository](https://github.com/redhat-developer/vscode-extension-tester), [Mocha docs](https://mochajs.org/), [VS Code extension testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension), [Node fs](https://nodejs.org/api/fs.html), [Node path](https://nodejs.org/api/path.html) |
| Random Neko image fetcher | `src/randomNekoImage.js` and fixture-backed E2E hooks in `src/settings.js`; safe tests must mock or fixture network responses and avoid external API calls in gates | [Node https](https://nodejs.org/api/https.html), [Node URL](https://nodejs.org/api/url.html), [Nekos.moe API docs](https://docs.nekos.moe/) |
| Safe all-tests orchestration | `scripts/run-test-all.js` and `npm run test:all`; intentionally excludes gated Neon E2E | [Node child_process.spawn](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| Codex documentation drift guard | `scripts/check-codex-docs.js`, `scripts/check-codex-docs.test.js`, `npm run test:docs`, and `npm run test:check` | [Node `fs`](https://nodejs.org/api/fs.html), [Node `path`](https://nodejs.org/api/path.html), [Node.js test runner](https://nodejs.org/api/test.html), [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts) |
| Packaging/publishing | Marketplace release workflow | [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [@vscode/vsce repository](https://github.com/microsoft/vscode-vsce) |

Compatibility rule:

- Because this project targets VS Code `^1.33.0`, do not use APIs introduced after VS Code 1.33 unless `engines.vscode` is intentionally raised.
- VS Code docs state that explicit `onCommand` activation events are unnecessary only from VS Code 1.74.0 onward; this project still needs them while the engine range remains `^1.33.0`.

## Runtime API References

### `src/extension.js`

| API/surface | Current usage | Official docs |
| --- | --- | --- |
| CommonJS modules | `require('path')`, `require('fs')`, `require('vscode')`, `module.exports` | [Node CommonJS modules](https://nodejs.org/api/modules.html) |
| `path.dirname` | Derives VS Code app directory from `vscode.env.appRoot` | [Node `path.dirname`](https://nodejs.org/api/path.html#pathdirnamepath) |
| `path.join` | Builds workbench and generated script paths | [Node `path.join`](https://nodejs.org/api/path.html#pathjoinpaths) |
| `fs.readFileSync` | Reads CSS, JS template, and VS Code workbench HTML | [Node `fs.readFileSync`](https://nodejs.org/api/fs.html#fsreadfilesyncpath-options) |
| `fs.writeFileSync` | Writes `neondreams.js` and patched workbench HTML | [Node `fs.writeFileSync`](https://nodejs.org/api/fs.html#fswritefilesyncfile-data-options) |
| `fs.existsSync` | Detects possible VS Code workbench HTML paths | [Node `fs.existsSync`](https://nodejs.org/api/fs.html#fsexistssyncpath) |
| `vscode.workspace.getConfiguration` | Reads `kawaii_synthwave` settings | [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) |
| `vscode.env.appRoot` | Locates VS Code installation root | [VS Code API reference - env](https://code.visualstudio.com/api/references/vscode-api#env) |
| `vscode.commands.registerCommand` | Registers enable/disable commands | [VS Code Commands guide](https://code.visualstudio.com/api/extension-guides/command) |
| `vscode.commands.executeCommand` | Reloads window with `workbench.action.reloadWindow` | [VS Code API reference - commands](https://code.visualstudio.com/api/references/vscode-api#commands), [Built-in Commands](https://code.visualstudio.com/api/references/commands) |
| `vscode.window.showInformationMessage` / `showErrorMessage` | User-facing activation/deactivation feedback | [VS Code API reference - window](https://code.visualstudio.com/api/references/vscode-api#window) |
| `context.subscriptions` | Disposes registered commands with extension lifecycle | [ExtensionContext in VS Code API](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext) |

Implementation caution:

- This extension modifies VS Code internal workbench files. Internal paths such as `out/vs/code/electron-browser/workbench` and `out/vs/code/electron-sandbox/workbench` are not a stable public VS Code API. Before changing this logic, check current VS Code installation layout and upstream issues.
- Prefer graceful error handling around filesystem writes because permission errors are expected on some installations.

### `src/settings.js`

| API/surface | Current usage | Official docs |
| --- | --- | --- |
| `window.createWebviewPanel` | Opens the main setup UI as a normal editor tab | [Webview API](https://code.visualstudio.com/api/extension-guides/webview), [window.createWebviewPanel](https://code.visualstudio.com/api/references/vscode-api#window.createWebviewPanel) |
| `webview.html` | Renders the Home page, side menu, color settings page, Neon Effect page, CSS, and script | [Webview API - content](https://code.visualstudio.com/api/extension-guides/webview#webview-api-basics) |
| `webview.onDidReceiveMessage` / `webview.postMessage` | Sends color updates, reset requests, Neon Effect requests, errors, and refreshed state between webview and extension host | [Webview API - passing messages](https://code.visualstudio.com/api/extension-guides/webview#passing-messages-from-a-webview-to-an-extension) |
| `vscode.env.openExternal` / `vscode.Uri.parse` | Opens allow-listed Home page reference links in the user's external browser | [VS Code API reference - env.openExternal](https://code.visualstudio.com/api/references/vscode-api#env), [VS Code API reference - Uri](https://code.visualstudio.com/api/references/vscode-api#Uri) |
| Corruption warning references | Neon Effect page links to the official unsupported-installation explanation and an optional community checksum-fix workaround | [VS Code FAQ - Installation appears to be corrupt](https://code.visualstudio.com/docs/supporting/faq#_installation-appears-to-be-corrupt-unsupported), [Fix VSCode Checksums Next Next Marketplace page](https://marketplace.visualstudio.com/items?itemName=iewnfod.vscode-fix-checksums-next-next) |
| `workspace.getConfiguration().get` | Reads current user/workspace color customization settings | [WorkspaceConfiguration](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration), [Settings docs](https://code.visualstudio.com/docs/configure/settings) |
| `workspace.getConfiguration().update(..., true)` | Writes user-scope theme-specific color overrides | [WorkspaceConfiguration.update](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration), [Settings scopes](https://code.visualstudio.com/docs/configure/settings#_settings-precedence) |
| `workbench.colorCustomizations` | Stores workbench UI color overrides under `[Kawaii VS Code Color]` and `[Kawaii VS Code Color Light]` | [Customize a Color Theme - Workbench colors](https://code.visualstudio.com/docs/configure/themes#_workbench-colors), [Theme Color reference](https://code.visualstudio.com/api/references/theme-color) |
| `editor.tokenColorCustomizations.textMateRules` | Stores TextMate foreground overrides under `[Kawaii VS Code Color]` and `[Kawaii VS Code Color Light]` | [Customize a Color Theme - Editor syntax highlighting](https://code.visualstudio.com/docs/configure/themes#_editor-syntax-highlighting), [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide) |

Implementation caution:

- The settings webview must not edit `themes/kawaii_synthwave-generated-color-theme.json` at runtime. VS Code theme contributions are declared through static manifest paths, while per-user live changes belong in user settings.
- Keep writes theme-scoped under `[Kawaii VS Code Color]` and `[Kawaii VS Code Color Light]` so reset operations do not erase unrelated user color customizations.

### Extracted Settings Modules

| Module | Responsibility | Validation |
| --- | --- | --- |
| `src/settingsPersistence.js` | Pure color customization block mutation, TextMate scope comparison, and hex validation | `test/unit/settings-persistence.test.js` |
| `src/settingsStore.js` | VS Code configuration get/inspect/update adapter for global and workspace targets | `test/unit/settings-store.test.js` |
| `src/settingsColorService.js` | Generated-theme-aware color update/reset/theme-switch orchestration | `test/unit/settings-color-service.test.js` |
| `src/settingsBundle.js` | Portable bundle creation/application, Settings Sync state, and JSON import/export actions | `test/unit/settings-bundle.test.js`, including chained state-model coverage for Save VSSync, Import VSSync, Export As, and Import |
| `src/settingsEffectsPersistence.js` | Effect/image normalization, safe storage paths, metadata/state, export/restore/store/remove helpers | `test/unit/settings-effects-persistence.test.js` |
| `src/settings.js` message chain | Mocked `openSettings -> onDidReceiveMessage -> persistence` wiring | `test/unit/settings-message-persistence.test.js` |

### `src/js/theme_template.js`

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

### `src/css/editor_chrome.css`, `kawaii_synthwave.css`, `kawaii_synthwave-noglow.css`

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

The theme palette is intentionally split so the upstream/base file is preserved.

| Theme file | Role | Modification rule |
| --- | --- | --- |
| `themes/kawaii_synthwave-color-theme.json` | Protected dark base theme copied from the upstream lineage | Do not modify for Kawaii palette changes. |
| `themes/kawaii_synthwave-color-theme-light.json` | Protected light base theme inspired by Sakura Theme | Do not modify for Kawaii palette changes. |
| `themes/kawaii_synthwave-color-theme-overrides.json` | Editable dark Kawaii override source | Put new dark `colors`, `tokenColors`, or `semanticTokenColors` overrides here. |
| `themes/kawaii_synthwave-color-theme-light-overrides.json` | Editable light Kawaii override source | Put new light `colors`, `tokenColors`, or `semanticTokenColors` overrides here. |
| `themes/kawaii_synthwave-generated-color-theme.json` | Generated dark file loaded by `package.json.contributes.themes` as `Kawaii VS Code Color` / `vs-dark` | Do not edit manually; regenerate with `npm run build:theme`. |
| `themes/kawaii_synthwave-generated-color-theme-light.json` | Generated light file loaded by `package.json.contributes.themes` as `Kawaii VS Code Color Light` / `vs` | Do not edit manually; regenerate with `npm run build:theme`. |
| `scripts/build-color-theme.js` | Build script that applies base first, then overrides | Keep dependency-free unless a future task explicitly adds a JSONC parser dependency. |
| User settings `[Kawaii VS Code Color]` blocks | Local live user overrides written by `src/settings.js` | Do not treat these as source theme files; they are per-user VS Code settings. |

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
3. For theme colors, edit only `themes/kawaii_synthwave-color-theme-overrides.json`, validate color IDs in [Theme Color reference](https://code.visualstudio.com/api/references/theme-color), then run `npm run build:theme`.
4. For `tokenColors`, edit only the overrides file, validate scopes with `Developer: Inspect Editor Tokens and Scopes` and the [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide), then run `npm run build:theme`.
5. For live user color customization behavior, prefer `workbench.colorCustomizations` and `editor.tokenColorCustomizations` over generating new contributed theme files at runtime.
6. For DOM/CSS changes, use MDN docs and test in the VS Code workbench context because injected code depends on internal workbench markup.
7. For filesystem changes, use Node official docs and keep permission/ENOENT/EPERM handling explicit.
8. Do not assume latest Node.js, latest VS Code, or latest package syntax. This repository currently targets VS Code 1.33+ and declares no Node engine.
9. If adding TypeScript, tests, bundling, or new packages, add corresponding exact-version references to this file in the same table format.
