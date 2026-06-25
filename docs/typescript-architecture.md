# TypeScript Architecture

Kawaii VS Code Color is a VS Code theme extension with a compiled TypeScript extension host, generated theme assets, a settings webview, and an optional modular Effects workbench patch.

## Runtime Shape

| Layer | Source | Responsibility |
| --- | --- | --- |
| Manifest | `package.json` | Declares extension identity, theme contributions, settings, command activation, and `./out/src/extension.js` as the runtime entry. |
| Extension host | `src/extension.ts`, `src/extensionHost` | Registers commands, composes services, handles Settings and Effects workflows, writes workbench assets, and shows VS Code notifications. |
| Settings webview | `src/settings.ts`, `src/settingsWebview.ts`, `src/webview/settings` | Renders the settings editor tab, sends typed webview messages, and uses VS Code webview color tokens. |
| Shared contracts | `src/shared` | Defines typed models, message contracts, schemas, renderer placeholders, guards, and validation helpers. |
| Renderer patch | `src/js/theme_template.js`, `src/renderer/ThemeTemplate.ts` | Injects the scoped workbench runtime and mirrors renderer behavior for tests. |
| Theme build | `themes/*`, `scripts/build-color-theme.ts` | Preserves base themes, applies Kawaii overrides, and writes generated VS Code theme JSON. |
| Workbench CSS | `src/scss`, `src/css`, `scripts/build-ui-css.ts` | Builds scoped CSS linked by the injected Kawaii Neon runtime for modular Effects visuals. |
| Tooling scripts | `scripts/*.ts`, `scripts/*.js` | Keeps TypeScript implementations behind stable JavaScript command wrappers. |

## Build And Validation

Core commands:

```powershell
npm run type-check
npm run test:docs
npm run test:check
npm run test:unit
npm run test:dom
npm run test:integration
npm run test:package
npm run test:e2e
npm run test:all
```

`npm run test:e2e:neon` is intentionally separate and requires `KAWAII_E2E_ALLOW_NEON_PATCH=1` because it applies the real Effects patch inside disposable VS Code storage, validates all 16 modular Effects switch combinations, and writes `test-results/e2e/neon-effects-combination-matrix.json`.

## Source Rules

- Edit theme colors in override files, then run `npm run build:theme`.
- Do not edit generated theme files by hand.
- Keep VS Code workbench patching behind the Effects flow.
- Keep Effects modules independently selectable through `kawaii_synthwave.effectFeatureSettings`, with generated CSS gated by `.kawaii-effect-editor-background`, `.kawaii-effect-no-page-logo`, and `.kawaii-effect-glow`.
- Keep settings persistence in VS Code settings or extension storage, not in generated theme files.
- Keep new runtime boundaries typed and covered by focused unit, DOM, integration, package, or E2E tests as appropriate.
