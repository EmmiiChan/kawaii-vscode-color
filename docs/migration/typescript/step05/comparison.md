# TypeScript Migration Step 05 Comparison

## Scope

- Added typed Settings host command/message controllers under `src/extensionHost/controllers`.
- Added typed Settings host service boundaries under `src/extensionHost/services`.
- Kept `src/settings.js` as the compatibility layer for existing persistence, dialog, color, image, bundle, and color-reference behavior.
- Moved message dispatch flow, E2E hook gates, state/warning sequencing, and message-error reporting into `SettingsMessageController`.
- Kept existing webview message names and legacy payload fields such as `themeVariantId`, `section`, `id`, `url`, and effect opacity fields.

## New Architecture

| Area | Module |
| --- | --- |
| Settings command facade | `src/extensionHost/controllers/SettingsCommandController.ts` |
| Settings message dispatcher | `src/extensionHost/controllers/SettingsMessageController.ts` |
| Settings state boundary | `src/extensionHost/services/SettingsStateService.ts` |
| Settings bundle boundary | `src/extensionHost/services/SettingsBundleService.ts` |
| Settings effects boundary | `src/extensionHost/services/SettingsEffectsService.ts` |
| Legacy implementation adapter | `src/settings.js` |

## Test Evidence

| Log | Result |
| --- | --- |
| `step05-before.log` | Baseline passed: type-check, unit, DOM, integration, docs. |
| `step05-step-tests-before.log` | Expected RED: missing Settings host controller/service modules. |
| `step05-step-tests-after-failed.log` | Documented one stale unit-test expectation while wiring import handler call logging. |
| `step05-step-tests-after.log` | Step-specific tests passed: 9 passed, 0 failed. |
| `step05-after.log` | Final gate passed: type-check, test:check, unit, DOM, integration, docs. |

## Final Gate Summary

- `npm run type-check`: passed.
- `npm run test:check`: passed.
- `npm run test:unit`: 126 passed.
- `npm run test:dom`: 27 passed.
- `npm run test:integration`: 2 passed.
- `npm run test:docs`: passed.

## Notes

- The Settings webview UI source remains unchanged for Step 06.
- Test-only messages remain gated by `KAWAII_E2E_TEST_HOOKS=1` or `KAWAII_E2E_ALLOW_NEON_PATCH=1`.
- `.codex/change-impact.md` was already modified before this step and remains intentionally outside this step commit.
