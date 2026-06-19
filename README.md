# Kawaii VS Code Color

![Kawaii VS Code Color logo](icon.png)

Kawaii VS Code Color provides dark pink and light green pastel-pink themes for Visual Studio Code, with optional glow effects, image-backed editor styling, theme-specific color customization, Settings Sync support, and JSON import/export.

## Preview

![Kawaii VS Code Color features overview](images/kawaii-vscode-color-features-1.png)

![Kawaii VS Code Color dark index view](images/kawaii-vscode-color-dark-index.png)

![Kawaii VS Code Color dark file view](images/kawaii-vscode-color-dark-file.png)

![Kawaii VS Code Color light index view](images/kawaii-vscode-color-light-index.png)

![Kawaii VS Code Color light file view](images/kawaii-vscode-color-light-file.png)

![Kawaii VS Code Color presets](images/kawaii-vscode-color-presets.png)

![Kawaii VS Code Color color customization](images/kawaii-vscode-color-color-customization.png)

![Kawaii VS Code Color image customization](images/kawaii-vscode-color-image-customization.png)

## User Guide

### Installation

Install from the Visual Studio Marketplace:

- Marketplace page: [Kawaii VS Code Color](https://marketplace.visualstudio.com/items?itemName=ITEM-PIXEL.kawaii-vscode-color)
- Extension Name: `Kawaii VS Code Color`

Install from VS Code:

1. Open the Extensions view.
2. Search for `Kawaii VS Code Color`.
3. Select `Install`.

Install from the command line:

```powershell
code --install-extension ITEM-PIXEL.kawaii-vscode-color
```

If you received a `.vsix` file:

1. Open the Extensions view.
2. Select `Views and More Actions...`.
3. Select `Install from VSIX...`.
4. Choose the `.vsix` file.

### Setup

Enable the theme:

1. Open the Command Palette.
2. Run `Preferences: Color Theme`.
3. Select `Kawaii VS Code Color` or `Kawaii VS Code Color Light`.

Open the extension settings:

1. Open the Command Palette.
2. Run `Kawaii VS Code Color: Settings`.
3. Use the side menu to switch between `Home`, `Color Settings`, `Neon Effect`, `Image Customization`, `Sync/Files`, and `Help`.

The settings window opens as a normal editor tab.

### Settings Window

| Area | Purpose |
| --- | --- |
| `Home` | Shows project links and extension information. |
| `Color Settings` | Changes theme mode and workbench or syntax color overrides. |
| `Neon Effect` | Enables or disables the unsupported VS Code workbench patch used for glow and image effects. |
| `Image Customization` | Stores editor background and no-tab logo image inputs used by the Neon Effect patch. |
| `Sync/Files` | Saves or restores settings through VS Code Settings Sync, JSON export, and JSON import. |
| `Help` | Shows repository, issue tracker, README/homepage, and publisher/contact links from project metadata. |

The settings webview must use the active editor theme for its own UI. Its CSS consumes VS Code webview tokens such as `--vscode-editor-background`, `--vscode-foreground`, `--vscode-button-background`, and `--vscode-panel-border`; it must not define a separate hardcoded product palette for page surfaces, text, controls, panels, or states.

### Color Settings

The `Color Settings` page edits local user overrides for the selected theme mode.

- Dark edits are written to `[Kawaii VS Code Color]`.
- Light edits are written to `[Kawaii VS Code Color Light]`.
- Workbench colors are stored in `workbench.colorCustomizations`.
- Syntax colors are stored in `editor.tokenColorCustomizations`.
- Packaged theme source files are not modified.

Use `Reset` to remove one custom color. Use `Reset All` to remove all color customizations for the selected theme mode.

### Image Customization

The `Color Settings` page can store one editor background image and one no-tab logo replacement.

| Setting | Behavior |
| --- | --- |
| `Upload Image` | Selects a local editor background image. |
| `Upload Logo` | Selects a local no-tab logo image. |
| `Random Neko` | Fetches a non-NSFW random image and uses it as the selected image input. |
| `Download Image` / `Download Logo` | Saves the current stored image with a Save As dialog. |
| `Remove Image` / `Remove Logo` | Removes the stored image input. |
| `Opacity` | Controls the injected image layer opacity. |
| `Fit Area` | Fits the editor background image inside full, half, or corner regions. |

Supported image formats:

- PNG
- JPG/JPEG
- WEBP
- SVG

Images are capped at 2 MB. If preview or injected effects fail, try a smaller image resolution because image previews and Neon Effect injection use data URLs.

Image changes do not auto-apply. Click `Apply Effects`, then reload VS Code when prompted. If the editor does not refresh cleanly, close and open VS Code manually.

### Sync, Export, and Import

| Button | Behavior |
| --- | --- |
| `Save to VSSync` | Saves the current Kawaii VS Code Color settings bundle into VS Code synced extension global state. |
| `Import VSSync` | Restores the synced Kawaii VS Code Color settings bundle on another synced installation. |
| `Export As` | Saves the current settings bundle as a JSON file with a Save As dialog. |
| `Import` | Opens a JSON file picker and applies a previously exported settings bundle. |

The settings bundle includes:

- Active theme mode.
- Dark and light workbench color overrides.
- Dark and light token color overrides.
- Neon brightness and glow disable setting.
- Editor background image metadata, image bytes, opacity, and fit area.
- No-tab logo image metadata, image bytes, and opacity.

VS Code Settings Sync must be enabled in VS Code for `Save to VSSync` / `Import VSSync` to move data between machines.

### Neon Effect

VS Code color themes do not natively support text glow, editor background images, no-tab logo replacement, or arbitrary editor CSS. Those effects are provided by the optional Neon Effect path.

The Neon Effect modifies VS Code workbench files by adding a generated `neondreams.js` script reference with a refresh key. Use it with caution:

- Administrator permissions may be required on Windows.
- VS Code may show an unsupported or corrupted installation warning.
- VS Code updates can overwrite the patch.
- Disable the effect before troubleshooting editor startup or workbench rendering issues.

Enable or disable the effect:

1. Run `Kawaii VS Code Color: Settings`.
2. Open `Neon Effect`.
3. Use `Enable Neon Effect` or `Disable Neon Effect`.
4. Reload VS Code when prompted.

If VS Code shows the corruption warning, the `Neon Effect` page includes the official VS Code FAQ link and an optional checksum-fix community workaround. The supported recovery path is to disable Neon Effect and reinstall or repair VS Code so the modified workbench files are replaced.

### VS Code Settings

Customize glow brightness:

```json
{
  "kawaii_synthwave.brightness": 0.45
}
```

The value should be a number from `0` to `1`. The default is `0.45`.

Keep editor chrome updates but disable token glow:

```json
{
  "kawaii_synthwave.disableGlow": true
}
```

After changing either setting, open `Kawaii VS Code Color: Settings`, apply the Neon Effect again, and reload VS Code.

## Developer Guide

### Local Setup

Install project dependencies:

```powershell
npm install
```

Validate the extension metadata and scripts:

```powershell
npm pkg get name version publisher dependencies devDependencies engines
npm run test:check
npm run test:unit
npm run test:dom
npm run test:integration
npm run test:e2e
npm run build:theme
```

### Automated Tests

The project has four regular automated test layers, plus one gated Neon Effect E2E layer:

| Command | Layer | Purpose |
| --- | --- | --- |
| `npm run test:check` | Static syntax check | Runs `node --check` against runtime and build JavaScript files. |
| `npm run test:unit` | Unit tests without UI | Uses Node's built-in test runner for build logic, workbench patch helpers, settings persistence modules, chained Settings Sync / JSON import-export state matrices, and mocked settings message chains. |
| `npm run test:dom` | DOM UI tests | Uses `jsdom` to load the settings webview HTML and verify safe `postMessage` events, app navigation, Help metadata, Color Settings inputs/debounce, image/logo state, incoming webview messages, warnings/errors, and `--vscode-*` token usage. |
| `npm run test:integration` | VS Code integration | Uses `@vscode/test-cli` and `@vscode/test-electron` to activate the extension in an Extension Development Host and execute the settings command. |
| `npm run test:e2e` | Real VS Code UI E2E | Uses ExTester/WebDriver to package the extension, open a disposable VS Code, run `Kawaii VS Code Color: Settings`, navigate the real webview, validate safe UI flows, and write the project-owned last-run marker. |
| `npm run test:e2e:current` | Experimental real VS Code UI E2E | Runs the same safe E2E suite in separate `.vscode-test/extest-current` storage using ExTester's `max` VS Code version by default; override with `KAWAII_E2E_CURRENT_CODE_VERSION=<version>` when probing a specific stable VS Code build. |
| `npm test` | Full suite | Runs unit, DOM, and VS Code integration tests in sequence. |
| `npm run test:all` | Full suite plus safe E2E | Runs unit, DOM, integration, and safe E2E layers in order, then prints a final pass/fail/skipped summary. It is the safe local gate and intentionally excludes the gated Neon patch flow. |

Safety matrix:

| Command | Safe by default | Applies real patch | Use |
| --- | --- | --- | --- |
| `npm run test:unit` | Yes | No | Logic, settings persistence, bundles, effects, fixtures, and mocked message chains. |
| `npm run test:dom` | Yes | No | Isolated settings webview DOM and `--vscode-*` token contract. |
| `npm run test:integration` | Yes | No | Extension Host activation and command smoke tests. |
| `npm run test:e2e` | Yes | No | Real disposable VS Code UI without destructive actions. |
| `npm run test:e2e:current` | Yes | No | Experimental compatibility probe for the safe E2E suite in separate storage. |
| `npm test` | Yes | No | Unit, DOM, and integration layers. |
| `npm run test:all` | Yes | No | Unit, DOM, integration, and safe E2E local gate. |
| `npm run test:e2e:neon` | No, requires flag | Yes, only under `.vscode-test/extest-111-neon` | Real `Apply Effects`, Neon patch, injected CSS, restart, image switch/revert, disable, and restore lifecycle. |

The integration suite opens `Kawaii VS Code Color: Settings`, but it does not control the rendered VS Code window. The safe E2E suite does control the real window and webview, but it is still safe by default: it does not click `Enable Neon Effect`, `Disable Neon Effect`, or `Apply Effects`. Upload/import/export/download and Random Neko flows are covered only through explicit E2E fixture hooks, so no native OS dialog or external network request is used. E2E screenshots and state notes are written under `test-results/e2e`.

`test-results/e2e/kawaii-last-run.json` is the project-owned source of truth for the last `npm run test:e2e`, `npm run test:e2e:current`, or gated `npm run test:e2e:neon` execution. It records the mode, status, timings, exit code, disposable storage paths, Mocha phase configs, failed test ids when the current run fails, and key artifact paths. `test-results/e2e/.last-run.json` is an ExTester diagnostic file only and can be stale after later successful runs.

The safe E2E suite also writes `settings-visual-*.png` screenshots plus `settings-visual-state-analysis.json`. Those artifacts cover the Settings webview image previews, selected-image warnings, missing-image states, Random Neko loading presentation, effects warning, Neon status, error status, invalid color input, empty color filter, opacity value changes, editor background fit selector state, controlled fixture dialog flows, and color picker alpha persistence. The JSON file records programmatic PNG difference, color-ratio, or contrast metrics for each before/after visual assertion.

Visual test rule: tests should create screenshots only for behavior that changes a visible UI or theme state. When a visual state changes, keep before/after evidence, or a baseline/after pair, so the rendered result can be inspected alongside DOM/CSS assertions.

The real Neon Effect patch has its own gated command:

```powershell
$env:KAWAII_E2E_ALLOW_NEON_PATCH = "1"
npm run test:e2e:neon
```

`npm run test:e2e:neon` patches only the disposable VS Code installation under `.vscode-test/extest-111-neon`. The runner refuses Neon mode unless `KAWAII_E2E_ALLOW_NEON_PATCH=1` is present and the storage path resolves inside that disposable Neon directory. It runs five separate VS Code launches to validate the same lifecycle users may need manually: before applying, after applying dstgroup images and reopening VS Code, after switching to an alternate image and reopening VS Code, after reverting to dstgroup and reopening VS Code, and after removing the patch and reopening VS Code. It verifies the workbench HTML hash returns to the original baseline and that injected runtime CSS uses editor-provided `--vscode-*` tokens rather than a standalone UI palette.

The gated Neon suite imports controlled settings fixtures through internal test hooks exposed only when `KAWAII_E2E_ALLOW_NEON_PATCH=1`. Its first apply path pre-seeds a different image bundle, then uses the real Settings UI upload controls with fixture-backed dialogs before clicking `Apply Effects`, so image/logo payload replacement is validated through the UI path. It validates generated `neondreams.js`, image data URLs, editor background opacity/fit, no-tab logo opacity, active no-page fallback selector, runtime style tags, screenshots, image replacement, dstgroup logo restoration, and final HTML restoration. It also writes a visual editor-background fit matrix under `test-results/e2e` with a no-overlay baseline plus one screenshot for each supported fit area: `full`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, and `bottom-right`.

### Build a Local VSIX

Package the extension:

```powershell
npm run build:local
```

Install the generated VSIX in VS Code:

```powershell
code --install-extension .\dist\kawaii-vscode-color-<version>.vsix --force
```

For VS Code Insiders:

```powershell
code-insiders --install-extension .\dist\kawaii-vscode-color-<version>.vsix --force
```

### Theme Color Workflow

- Keep `themes/kawaii_synthwave-color-theme.json` as the protected dark base theme.
- Keep `themes/kawaii_synthwave-color-theme-light.json` as the protected light base theme.
- Put dark palette changes in `themes/kawaii_synthwave-color-theme-overrides.json`.
- Put light palette changes in `themes/kawaii_synthwave-color-theme-light-overrides.json`.
- Run `npm run build:theme` to regenerate both generated theme JSON files.
- VS Code loads generated themes through `package.json.contributes.themes`.

### Manual Theme Test

1. Open this repository in VS Code.
2. Run `npm run build:theme`.
3. Press `F5` to launch the Extension Development Host.
4. Select `Kawaii VS Code Color` or `Kawaii VS Code Color Light`.
5. Inspect representative files and use `Developer: Inspect Editor Tokens and Scopes` for token rules.

Live Neon Effect testing is possible from the Extension Development Host, but it patches the VS Code installation used by that host. Prefer a disposable VS Code installation or VS Code Insiders.

### Publishing

Before publishing:

- Confirm `package.json.publisher` is `ITEM-PIXEL`.
- Confirm `package.json.name` is `kawaii-vscode-color`.
- Confirm `package.json.repository.url` points to the public repository that contains the README images.
- Package to `./dist` with `npm run build:local`.
- Publish only from an account authorized for the configured publisher.

## Credits

Kawaii VS Code Color is based on [SynthWave '84](https://github.com/robb0wen/synthwave-vscode). The original theme, glow concept, and much of the historical implementation came from Robb Owen's project.

Kawaii VS Code Color Light is inspired by [Sakura Theme](https://github.com/mhiratani/theme-sakura), a soft pastel VS Code theme by [mhiratani](https://github.com/mhiratani). Sakura Theme is released under the [MIT License](https://github.com/mhiratani/theme-sakura/blob/main/LICENSE).

The Random Neko image flow was inspired by [NyarchLinux/CatgirlDownloader](https://github.com/NyarchLinux/CatgirlDownloader), which uses Nekos.moe as one of its image sources.

The original SynthWave '84 README also credited:

- [Sarah Drasner](https://twitter.com/sarah_edo) and her CSS-Tricks theme tutorial.
- [Wes Bos](https://twitter.com/wesbos) and the [Cobalt2 VS Code theme](https://github.com/wesbos/cobalt2-vscode).
- [Fira Code](https://github.com/tonsky/FiraCode), used in the original screenshots.
- Banner cityscape image from [Unsplash](https://unsplash.com/photos/DxHR8K5Egjk).

## References

- Marketplace extension: [Kawaii VS Code Color](https://marketplace.visualstudio.com/items?itemName=ITEM-PIXEL.kawaii-vscode-color)
- Repository: [EmmiiChan/kawaii-vscode-color](https://github.com/EmmiiChan/kawaii-vscode-color)
- Upstream base: [robb0wen/synthwave-vscode](https://github.com/robb0wen/synthwave-vscode)
- SynthWave Marketplace extension: [SynthWave '84](https://marketplace.visualstudio.com/items?itemName=RobbOwen.synthwave-vscode)
- Light theme inspiration: [mhiratani/theme-sakura](https://github.com/mhiratani/theme-sakura)
- Nekos.moe site: [nekos.moe](https://nekos.moe)
- Nekos.moe API docs: [docs.nekos.moe](https://docs.nekos.moe/)
- Nekos.moe image routes: [Images / Posts](https://docs.nekos.moe/images.html)
- Random Neko downloader inspiration: [NyarchLinux/CatgirlDownloader](https://github.com/NyarchLinux/CatgirlDownloader)
- VS Code Color Theme guide: [Color Theme](https://code.visualstudio.com/api/extension-guides/color-theme)
- VS Code Theme Color reference: [Theme Color](https://code.visualstudio.com/api/references/theme-color)
- VS Code theme customization: [Customize a color theme](https://code.visualstudio.com/docs/configure/themes#_customize-a-color-theme)
- VS Code Settings Sync extension state: [Common Capabilities - Data Storage](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)
- VS Code extension manifest reference: [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- VS Code publishing guide: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
