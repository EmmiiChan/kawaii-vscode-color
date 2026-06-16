# Codex Project Operations Guide

Last reviewed: 2026-04-29

This file tells Codex how to test, run, package, locally install, and prepare this VS Code theme extension for publishing. For architecture, read `.codex/structure.md`. For official documentation links, read `.codex/docs.md`.

## Project Reality

This repository is a VS Code color theme extension with an optional "Neon Dreams" settings-page action that patches VS Code workbench files and a setup webview that writes theme-specific user color settings.

Current tooling state:

| Area | Current state |
| --- | --- |
| Build step | `npm run build:theme` merges the protected base theme and editable overrides into the generated theme loaded by VS Code. `npm run build:local` bumps the patch version, then builds the theme and local VSIX. |
| Automated tests | No project-wide test runner is configured. The version-bump utility has a focused Node test at `scripts/increment-package-version.test.js`. |
| TypeScript | Not used. Runtime source is CommonJS JavaScript. |
| npm dependencies | None. `package-lock.json` contains only the root package. |
| Packaging tool | Not installed in this repo. Use `@vscode/vsce` when packaging. |
| Runtime entry | `package.json.main` points to `./src/extension.js`. |
| Extension id | `EmmiiChan.kawaii-synthwave` from `publisher + name`. |

Do not add another build system or test framework unless the task explicitly asks for it.

## Out-of-the-Box Test Checklist

Run these checks before and after code changes:

```powershell
npm pkg get name version dependencies devDependencies engines
node --check scripts\build-color-theme.js
node --check scripts\increment-package-version.js
node --test scripts\increment-package-version.test.js
npm run build:theme
node --check src\extension.js
node --check src\settings.js
node --check src\js\theme_template.js
```

Expected result:

- `npm pkg get` should show `name`, `version`, and `engines`; it should not show dependency objects unless dependencies were intentionally added.
- `node --check` should exit without syntax errors.
- `node --test scripts\increment-package-version.test.js` should pass and should not modify the repository package files.
- `npm run build:theme` should generate `themes/kawaii_synthwave-generated-color-theme.json` from the protected base theme and the overrides file.

There is no `npm test`, `tsc --noEmit`, or lint command in the current project.

## Manual Theme Test

Use this when changing `package.json`, `themes`, or any visual theme behavior.

1. Open the repository in VS Code.
2. Run `npm run build:theme`.
3. Press `F5`, or run the existing `.vscode/launch.json` configuration named `Extension`.
4. In the Extension Development Host window, open the Command Palette.
5. Run `Preferences: Color Theme`.
6. Select `Kawaii SynthWave`.
7. Open representative files, for example JavaScript, CSS, Markdown, JSON, and any language whose token rules were changed.
8. Use `Developer: Inspect Editor Tokens and Scopes` to verify TextMate scopes before changing `tokenColors`.
9. Run `Kawaii SynthWave: Settings`, confirm the Home page opens first, use the side menu to open `Color Settings`, edit a workbench color and a syntax color, confirm the change is written under `[Kawaii SynthWave]` in user settings, then reset it. Open `Neon Effect` and confirm the enable/disable buttons and warning text are visible.

This validates the public VS Code theme contribution without installing the extension globally.

## Live Neon Test Possibility

Yes, live testing is possible, but it is risky because the Neon Effect setup action modifies the VS Code installation used by the Extension Development Host.

Use only when testing `src/extension.js`, `src/js/theme_template.js`, or `src/css/editor_chrome.css`.

Recommended safe approach:

1. Use a disposable VS Code installation or VS Code Insiders. An isolated profile can reduce settings and extension noise, but it does not protect the installed VS Code workbench files from being patched.
2. Open this repo.
3. Press `F5` to launch the Extension Development Host.
4. In the Extension Development Host, select the `Kawaii SynthWave` color theme.
5. Open settings JSON and set:

```json
{
  "kawaii_synthwave.brightness": 0.45,
  "kawaii_synthwave.disableGlow": false
}
```

6. Run `Kawaii SynthWave: Settings`, open `Neon Effect`, and select `Enable Neon Effect`.
7. Accept the reload prompt.
8. After reload, inspect whether the glow and chrome changes appear.
9. Run `Kawaii SynthWave: Settings`, open `Neon Effect`, and select `Disable Neon Effect` when done.
10. Reload again.

Important cautions:

- The enable action writes `neondreams.js` into VS Code's workbench folder.
- The enable action patches the workbench HTML with a marked script tag.
- VS Code may show an unsupported/corruption warning after the patch.
- VS Code updates can overwrite the patch; users need to re-enable the glow after updates.
- If testing on Windows, administrator permissions may be required depending on where VS Code is installed.

## Build

The only build step is the theme merge:

```powershell
npm run build:theme
```

Theme file ownership:

- `themes/kawaii_synthwave-color-theme.json` is the protected upstream/base palette. Do not edit it for Kawaii palette changes.
- `themes/kawaii_synthwave-color-theme-overrides.json` is the editable override file.
- `themes/kawaii_synthwave-generated-color-theme.json` is generated and loaded by VS Code through `package.json.contributes.themes`.
- `scripts/build-color-theme.js` applies the base first, then override `colors` when defined, then replaces matching override `tokenColors` by `name` or `scope`; new token rules append.

The package ships runtime source files directly:

- `src/extension.js` runs in the extension host.
- `src/settings.js` opens the setup webview. Its Home page contains theme/reference links, its `Color Settings` page writes live user overrides to `workbench.colorCustomizations` and `editor.tokenColorCustomizations`, and its `Neon Effect` page requests internal enable/disable patch actions.
- `src/js/theme_template.js` is read as a template and written as generated `neondreams.js`.
- `src/css/editor_chrome.css` is injected into the generated renderer script.
- `themes/kawaii_synthwave-generated-color-theme.json` is loaded by VS Code as the public theme definition.

If a future task adds TypeScript, bundling, minification, or generated output:

1. Add explicit npm scripts.
2. Add exact devDependencies.
3. Update `package-lock.json`.
4. Update `package.json.main` if the runtime entry moves.
5. Update `.vscodeignore` so packaged files are correct.
6. Update `.codex/docs.md` and `.codex/structure.md`.

## Package a Local VSIX

Official VS Code packaging uses `vsce`, provided by `@vscode/vsce`.

Preferred command:

```powershell
npm run build:local
```

This command increments `package.json.version` by one patch version before packaging and synchronizes `package-lock.json` root version fields. The Extension Host launch flow that only runs `build:theme` does not bump the package version.

Equivalent one-off commands:

```powershell
node .\scripts\increment-package-version.js
npm run build:theme
npx --yes @vscode/vsce package --out .\dist\kawaii-synthwave-0.1.20.vsix
```

Expected output:

```text
.\dist\kawaii-synthwave-0.1.20.vsix
```

Before packaging:

```powershell
npm pkg get name version publisher engines
node --check scripts\build-color-theme.js
npm run build:theme
node --check src\extension.js
node --check src\js\theme_template.js
```

Review `.vscodeignore` before packaging. It controls what is excluded from the VSIX.

## Install the Modified Version Locally

After generating the VSIX:

```powershell
code --install-extension .\dist\kawaii-synthwave-0.1.20.vsix --force
```

For VS Code Insiders:

```powershell
code-insiders --install-extension .\dist\kawaii-synthwave-0.1.20.vsix --force
```

GUI alternative:

1. Open VS Code.
2. Open the Extensions view.
3. Use `...` / `Views and More Actions`.
4. Select `Install from VSIX...`.
5. Choose the generated `.vsix` file.

Local install cautions:

- This package now uses its own extension id: `EmmiiChan.kawaii-synthwave`.
- If an older local build used the upstream id, uninstall `RobbOwen.synthwave-vscode` before comparing behavior.
- VSIX-installed extensions have auto update disabled by default in VS Code.
- If publishing or sharing this fork independently, change `publisher`, `name`, display branding, repository links, and any extension-id-dependent selectors intentionally.

## Use the Installed Extension

Normal theme usage:

1. Install the VSIX.
2. Run `Preferences: Color Theme`.
3. Select `Kawaii SynthWave`.

Optional glow usage:

1. Select `Kawaii SynthWave`.
2. Configure settings if needed:

```json
{
  "kawaii_synthwave.brightness": 0.45,
  "kawaii_synthwave.disableGlow": false
}
```

3. Run `Kawaii SynthWave: Settings`, open `Neon Effect`, and select `Enable Neon Effect`.
4. Reload VS Code when prompted.

To keep chrome changes but disable token glow:

```json
{
  "kawaii_synthwave.disableGlow": true
}
```

Then open `Kawaii SynthWave: Settings`, use the `Neon Effect` page to enable the effect again, and reload.

To disable the workbench patch, open `Kawaii SynthWave: Settings`, open `Neon Effect`, select `Disable Neon Effect`, and reload when prompted.

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
- `package-lock.json` is current if dependencies were added.
- `.codex/docs.md` is updated if tooling, package versions, or official references changed.

The current project has no native dependencies, so platform-specific VSIX packages are not needed.

## Publish to Marketplace

Only publish when the publisher identity and Marketplace ownership are intentionally configured.

Official global-tool flow:

```powershell
npm install -g @vscode/vsce
vsce login <publisher>
npm run build:theme
vsce publish
```

Package first, then publish the VSIX:

```powershell
npm run build:local
npx --yes @vscode/vsce publish --packagePath .\dist\kawaii-synthwave-0.1.20.vsix
```

Do not publish until `publisher` is confirmed to be the intended Marketplace publisher for Kawaii SynthWave.

## Cleanup and Recovery Notes

If a Neon Dreams test leaves VS Code patched:

1. Run `Kawaii SynthWave: Settings`, open `Neon Effect`, and select `Disable Neon Effect`.
2. Reload VS Code.
3. If VS Code cannot open, reinstall VS Code or manually restore the workbench HTML from a clean install.

If local VSIX installation needs to be removed:

```powershell
code --uninstall-extension EmmiiChan.kawaii-synthwave
```

For Insiders:

```powershell
code-insiders --uninstall-extension EmmiiChan.kawaii-synthwave
```

## Sources

- VS Code extension testing uses the Extension Development Host for integration testing: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- VS Code publishing docs define `@vscode/vsce`, `vsce package`, VSIX packaging, `vsce publish`, and `engines.vscode` compatibility: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- VS Code marketplace docs describe installing from VSIX and note that VSIX installs disable auto update by default: https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_install-from-a-vsix
- VS Code CLI docs define `--install-extension`, `--uninstall-extension`, `--profile`, `--extensions-dir`, and `--user-data-dir`: https://code.visualstudio.com/docs/configure/command-line#_working-with-extensions
