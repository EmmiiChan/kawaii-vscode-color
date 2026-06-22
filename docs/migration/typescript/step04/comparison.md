# TypeScript Migration Step 04 Comparison

## Scope

- Converted the extension host entry source from `src/extension.js` to `src/extension.ts` while keeping `package.json.main` at compiled `./out/src/extension.js`.
- Extracted Neon Effect host responsibilities into typed modules under `src/extensionHost`.
- Kept the Settings webview contract unchanged: `src/settings.js` still receives `enableNeon`, `disableNeon`, and `isNeonEnabled` actions.
- Kept workbench marker, generated `neondreams.js` filename, reload prompts, brightness normalization, image placeholder behavior, and theme-switch regeneration behavior intact.

## New Architecture

| Area | Module |
| --- | --- |
| Composition root | `src/extension.ts` |
| VS Code filesystem adapter | `src/extensionHost/adapters/NodeFileSystem.ts` |
| VS Code notification/reload adapter | `src/extensionHost/adapters/VscodeNotificationService.ts` |
| VS Code global storage adapter | `src/extensionHost/adapters/VscodeExtensionStorage.ts` |
| Neon command/theme-change controller | `src/extensionHost/controllers/NeonEffectController.ts` |
| Renderer script and stored-image CSS assembly | `src/extensionHost/services/NeonEffectService.ts` |
| Workbench HTML patch service | `src/extensionHost/services/WorkbenchPatchService.ts` |

## Test Evidence

| Log | Result |
| --- | --- |
| `step04-before.log` | Baseline passed: type-check, docs, unit, integration. |
| `step04-step-tests-before.log` | Expected RED: missing `out/src/extensionHost` service/controller modules. |
| `step04-step-tests-after-failed.log` | Documented one stale controller expectation during TDD; production behavior matched the previous implementation. |
| `step04-step-tests-after.log` | Step-specific tests passed: 13 passed, 0 failed. |
| `step04-after.log` | Full gate passed: type-check, docs, test:check, unit, DOM, integration, and safe E2E. |

## Full Gate Summary

- `npm run type-check`: passed.
- `npm run test:docs`: passed.
- `npm run test:check`: passed.
- `npm run test:unit`: 121 passed.
- `npm run test:dom`: 27 passed.
- `npm run test:integration`: 2 passed.
- `npm run test:e2e`: 16 passed.

## Notes

- The safe E2E generated `kawaii-vscode-color-0.1.31.vsix`; it was removed after validation.
- `.codex/change-impact.md` was already modified before this step and remains intentionally outside this step commit.
