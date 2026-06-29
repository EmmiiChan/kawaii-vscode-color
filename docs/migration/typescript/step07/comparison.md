# Step 07 Comparison - Renderer Boundary

## Scope

- Added `src/renderer/ThemeTemplate.ts` as a browser-only TypeScript helper module for renderer token replacement contracts.
- Added typed renderer placeholder helpers in `src/shared/contracts/rendererPlaceholders.ts`.
- Replaced ad hoc placeholder `.replace(...)` chains in `NeonEffectService` with `replaceRendererPlaceholders`.
- Kept `src/js/theme_template.js` as the injected runtime template and kept `src/css/editor_chrome.css` as CSS.
- Updated `test:check` to include `out/src/renderer/ThemeTemplate.js` and the new renderer unit test.
- Updated `.codex` maps and the docs drift guard for `src/renderer`.

## Behavior Notes

- No patch marker, runtime style id, theme wrapper selector, placeholder name, or injected template file was intentionally changed.
- `src/renderer/ThemeTemplate.ts` mirrors the current token replacement contracts so they can be tested while the injected browser script remains inline.
- The extension host now writes `kawaii-vscode-colors-ui.js`; compatibility cleanup for older `neondreams.js` markers remains in the workbench patch helpers.
- Gated Neon E2E was not run because `src/js/theme_template.js`, `src/css/editor_chrome.css`, and the workbench patch marker were not changed. Generated output behavior is covered by `NeonEffectService` unit tests, `WorkbenchPatchService` unit tests from the full unit gate, and safe E2E.
- `.codex/change-impact.md` remains a pre-existing local change and is intentionally outside this step.

## Test Evidence

| Log | Purpose | Result |
| --- | --- | --- |
| `step07-before.log` | Baseline before Step 07 changes: `type-check`, unit, safe E2E, docs | Passed; unit 126 passed, safe E2E 16 passing, docs aligned |
| `step07-step-tests-before.log` | RED renderer tests before implementation | Failed as expected with missing `out/src/renderer/ThemeTemplate` |
| `step07-step-tests-after.log` | Focused renderer, shared placeholder, and Neon service tests after implementation | Passed; 17 focused tests |
| `step07-after.log` | Final Step 07 gate: status, `type-check`, unit, safe E2E, docs, syntax check | Passed; unit 130 passed, safe E2E 16 passing, docs aligned, all command exit codes 0 |

## E2E Evidence

- `test-results/e2e/kawaii-last-run.json` reports safe E2E status `passed` for VS Code `1.111.0`.
- The safe E2E artifact set includes `settings-visual-state-analysis.json`.
- Safe E2E generated `kawaii-vscode-color-0.1.31.vsix`; the generated VSIX was removed after validation and is not part of the commit.
