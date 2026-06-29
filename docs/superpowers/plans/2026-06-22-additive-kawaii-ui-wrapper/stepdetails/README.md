# Step Details Index

This directory expands `../2026-06-22-additive-kawaii-ui-wrapper.md` into isolated execution packs.

Each step folder contains:

- `context.md`: current source facts and files to open before editing.
- `analysis.md`: implementation analysis, risks, and decisions.
- `implementation-directives.md`: exact implementation instructions for that step.
- `validation.md`: commands, expected failures, expected passes, and review checks.

Execution order:

1. `01-add-sass-build-pipeline`
2. `02-extend-workbench-patch-assets`
3. `03-runtime-wrapper-and-css-link`
4. `04-wire-css-asset-generation`
5. `05-scope-static-css`
6. `06-update-docs-and-gates`
7. `07-validate-additive-behavior`

Do not execute a later step before the previous step passes its validation. Each step assumes the previous step has been merged into the local working tree.
