# Step 07 Context: Validate Additive Behavior

## Goal

Validate the full additive runtime in the disposable gated Neon E2E flow.

## Current Source Facts

- `npm run test:e2e:neon` is intentionally gated by `KAWAII_E2E_ALLOW_NEON_PATCH=1`.
- It patches only `.vscode-test/extest-111-neon`.
- `test/e2e/neon-real.spec.js` already captures:
  - workbench HTML;
  - generated runtime script;
  - screenshots;
  - editor background and logo states;
  - restore behavior.

## Files To Open

- `test/e2e/neon-real.spec.js`
- `scripts/require-e2e-neon-flag.ts`
- `scripts/run-e2e.ts`
- `scripts/e2e-last-run.ts`
- `test/e2e/helpers/extester-app.js`

## Non-Goals

- Do not run gated Neon E2E on a primary VS Code installation.
- Do not fold this validation into safe E2E.
