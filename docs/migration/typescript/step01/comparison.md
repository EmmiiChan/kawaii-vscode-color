# Step 01 Tooling Comparison

## Summary

Step 01 added TypeScript tooling without moving runtime source files and without changing the extension entry point.

Runtime entry remains:

```text
./src/extension.js
```

## Branches

- Base branch: `development`
- Step branch: `typescript-migration-step01-tooling`

## Before Gate

All existing pre-step gates in `step01-before.log` exited with code `0`:

- `git status --short --branch`
- `npm pkg get name version publisher dependencies devDependencies engines`
- `npm run test:docs`
- `npm run test:check`
- `npm run test:unit`
- `npm run test:dom`

## Step-Specific Before Test

`step01-step-tests-before.log` records that `npm run type-check` did not exist before this step:

```text
ExitCode: 1
```

This was expected before TypeScript tooling was added.

## Implementation Notes

Added dev-only TypeScript tooling:

- `typescript@^6.0.3`
- `@types/node@^26.0.0`
- `@types/vscode@^1.33.0`

Added config files:

- `tsconfig.json`
- `tsconfig.base.json`
- `tsconfig.extension.json`
- `tsconfig.scripts.json`
- `tsconfig.tests.json`

Added scripts:

- `npm run compile`
- `npm run type-check`

Added ignored output directories:

- `out/`
- `out-scripts/`
- `out-tests/`

## TypeScript 6 Note

The first post-implementation `npm run type-check` attempt failed because TypeScript 6 reports `moduleResolution: "Node"` as deprecated `node10` resolution.

The fix was to add this compatibility setting to `tsconfig.base.json`:

```json
"ignoreDeprecations": "6.0"
```

After that, the retry passed:

```text
RetryExitCode: 0
```

## After Gate

All post-step gates in `step01-after.log` exited with code `0`:

- `git status --short --branch`
- `npm pkg get name version publisher dependencies devDependencies engines`
- `npm run type-check`
- `npm run test:docs`
- `npm run test:check`
- `npm run test:unit`
- `npm run test:dom`

`step01-compile-after.log` also confirms:

- `npm run compile` exited with code `0`.

## Existing Unrelated Change

The working tree still contains an unrelated pre-existing local modification:

```text
.codex/change-impact.md
```

It must remain unstaged for this checkpoint.

## Result

No inherited test failures were found.

No new failures were introduced by Step 01.
