# Step 06 Context: Update Documentation And Gates

## Goal

Update project documentation and guard tests so the new additive runtime architecture is reflected in `.codex`, README, package facts, and strict package tests.

## Current Source Facts

- `.codex/change-impact.md` requires docs updates for:
  - package metadata/dependency changes;
  - renderer placeholders;
  - `src/js/theme_template.js`;
  - injected CSS;
  - test command/workflow changes.
- `npm run test:docs` verifies `.codex` critical facts.
- `scripts/check-codex-docs.ts` collects renderer placeholders and source anchors.

## Files To Open

- `README.md`
- `.codex/AGENTS.md`
- `.codex/docs.md`
- `.codex/structure.md`
- `.codex/system-map.md`
- `.codex/change-impact.md`
- `scripts/check-codex-docs.ts`
- `scripts/check-codex-docs.test.js`
- `test/unit/strict-typescript-package.test.ts`
- `package.json`
- `package-lock.json`

## Non-Goals

- Do not change runtime behavior in this step.
- Do not add new runtime assets beyond docs/test references.
