# Step 04 Context: Wire CSS Asset Generation

## Goal

Wire the CSS asset from Step 01 and asset-writing contract from Step 02 into `NeonEffectService`.

## Current Source Facts

- `NeonEffectService.enable()` currently reads:
  - `src/css/editor_chrome.css`
  - `src/js/theme_template.js`
- It builds `finalTheme` by replacing:
  - `CHROME_STYLES`
  - `DISABLE_GLOW`
  - `NEON_BRIGHTNESS`
- `buildCustomChromeStyles()` replaces image/background/logo placeholders in CSS text.
- `WorkbenchPatchService` should now accept both script and style content.

## Files To Open

- `src/extensionHost/services/NeonEffectService.ts`
- `src/extensionHost/services/WorkbenchPatchService.ts`
- `src/shared/contracts/rendererPlaceholders.ts`
- `test/unit/neon-effect-service.test.ts`
- `test/unit/shared-contracts.test.ts`
- `test/e2e/neon-real.spec.js`

## Non-Goals

- Do not migrate CSS rule contents in this step.
- Do not remove legacy workbench marker cleanup.
- Do not run gated Neon E2E unless Step 07 is being executed.
