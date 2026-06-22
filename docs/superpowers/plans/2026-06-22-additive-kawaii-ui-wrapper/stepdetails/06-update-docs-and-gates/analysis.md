# Step 06 Analysis: Update Documentation And Gates

## Documentation Truths To Record

The docs must state:

```text
The workbench HTML patch inserts only `kawaii-vscode-colors-ui.js`.
The runtime detects the active Kawaii theme wrapper, adds `kawaii-vscode-colors-ui` to `document.documentElement` or `document.body`, links `kawaii-vscode-colors-ui.min.css`, and injects scoped token glow rules under that top-level wrapper.
The runtime does not rewrite `.vscode-tokens-styles`; it reads that style tag only to derive current `.mtk*` token classes.
The Sass entrypoint can initially load generated bridge partials made from existing CSS files, then migrate those sections into native Sass partials incrementally.
```

## Check-Docs Impact

If `scripts/check-codex-docs.ts` validates the current source file list, add:

- `src/scss/kawaii-vscode-colors-ui.scss`
- `src/css/kawaii-vscode-colors-ui.min.css`
- `scripts/build-ui-css.ts`
- `scripts/build-ui-css.js`

If `sass` is added, `.codex/docs.md` package inventory must include exact resolved version from `package-lock.json`.

## Strict Package Test Impact

`test/unit/strict-typescript-package.test.ts` currently constrains runtime JS and packaging assumptions. It should allow:

- Sass source entrypoint;
- generated runtime CSS asset;
- generated Sass bridge partial if committed.

## Risk Analysis

- Missing docs updates will fail `npm run test:docs`.
- Package dependency docs must match `package-lock.json`, not just `package.json`.
- Do not overstate E2E validation until Step 07 has run.
