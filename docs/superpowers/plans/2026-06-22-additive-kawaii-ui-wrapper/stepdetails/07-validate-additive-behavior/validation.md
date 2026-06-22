# Step 07 Validation

## Safe Pre-Gates

Run:

```powershell
npm run test:unit
npm run test:check
```

Expected result: both pass before the risky gated E2E.

## Gated Neon E2E

Run only against disposable storage:

```powershell
$env:KAWAII_E2E_ALLOW_NEON_PATCH="1"
npm run test:e2e:neon
```

Expected result: pass.

## Artifact Review

Inspect:

- `test-results/e2e/kawaii-last-run.json`
- screenshots under `test-results/e2e`
- generated disposable workbench files under `.vscode-test/extest-111-neon`

Confirm:

- `kawaii-vscode-colors-ui.js` exists during applied phases.
- `kawaii-vscode-colors-ui.min.css` exists during applied phases.
- workbench HTML returns to baseline after disable.
- screenshots still show editor background and no-tab logo effects.

## Failure Triage

If DOM checks fail but screenshots look correct:

1. Inspect actual workbench root classes with a one-off E2E diagnostic.
2. Verify whether VS Code moved theme classes off `<html>`.
3. Update `getHighestWorkbenchRoot()` only if the actual highest viable root changed.

If screenshots fail but DOM checks pass:

1. Inspect compiled CSS selector scoping.
2. Check whether root selectors were emitted as descendants.
3. Revisit Step 05 bridge generation and hand-authored Sass partials.
