# Codex Documentation Change Impact Matrix

Last reviewed: 2026-06-25

Use this file before finishing any change. The project goal is that `.codex` reflects additions, removals, and updates in the actual system, not only the initial architecture.

## Required Rule

Every behavior, structure, workflow, test, settings, schema, theme, or tooling change must answer:

1. Which `.codex` document describes this fact?
2. Does the document still match the code after the change?
3. Does `npm run test:docs` pass?

If the answer to 2 or 3 is no, update the documentation in the same change.

## Impact Matrix

| Changed area | Required documentation update |
| --- | --- |
| `package.json` identity, scripts, activation events, commands, themes, settings, engine, dependencies, publisher, repository, or package metadata | Update `.codex/docs.md`, `.codex/AGENTS.md`, and `.codex/system-map.md`. Run `npm run test:docs`. |
| `package-lock.json` lockfile version, dependency tree, or package additions/removals | Update `.codex/docs.md` exact package inventory. If validation workflow changes, update `.codex/AGENTS.md`. Run `npm run test:docs`. Automatic root package patch-version bumps do not require `.codex` doc updates. |
| `src/extension.ts`, command registration, activation, configuration listener, Neon patch apply/remove, reload behavior, or workbench path behavior | Update `.codex/structure.md` and `.codex/system-map.md`. If official API usage changes, update `.codex/docs.md`. |
| `src/settings*.ts`, webview messages, Settings Sync, JSON import/export, image persistence, globalState keys, or settings writes | Update `.codex/system-map.md`. If user-facing workflow changes, update `.codex/AGENTS.md` and README as needed. |
| `src/settingsWebview.ts`, visible pages, controls, state shape, selectors, or UI events | Update `.codex/system-map.md`; update `.codex/structure.md` if the UI surface or page ownership changes. |
| Webview messages added, removed, renamed, or with changed payload semantics | Update the message contract in `.codex/system-map.md`, DOM tests, E2E tests when relevant, and run `npm run test:docs`. |
| Theme base, override, generated theme files, colors, tokenColors, semanticTokenColors, or color reference behavior | Update `.codex/color_scheme_reference.md`, `.codex/structure.md`, and `.codex/system-map.md`. Run `npm run build:theme` and `npm run test:docs`. |
| `.codex/color_scheme_reference.md` table headings or color/token descriptions | Remember this file is read at runtime by `src/settings.ts`; update tests if parsing assumptions change. Run `npm run test:docs` and relevant DOM/unit tests. |
| Renderer placeholders, `src/js/theme_template.js`, `src/css/editor_chrome.css`, no-tab logo selectors, or injected style ids | Update `.codex/system-map.md` and `.codex/structure.md`. Run unit tests covering placeholders/fit/logo behavior. |
| Settings bundle schema, `schemaVersion: 1`, current schema `kawaii-vscode-color-settings`, legacy schema `kawaii-synthwave-settings`, or fixtures | Update `.codex/system-map.md`, fixtures, and bundle tests. |
| Test commands, E2E phases, `test-results/e2e/kawaii-last-run.json`, screenshots, visual metrics, or safe/gated boundaries | Update `.codex/AGENTS.md`, `.codex/docs.md`, and `.codex/system-map.md`. |
| `scripts/check-codex-docs.js` or `npm run test:docs` rules | Update this matrix, `.codex/system-map.md`, and `scripts/check-codex-docs.test.js`. |
| New source module, deleted module, renamed module, or responsibility move | Update `.codex/system-map.md` and `.codex/structure.md` in the same change. |
| Changelog, release notes, published-version summary, or GitHub Release body | Update `CHANGELOG.md`, README release-note links if user-facing, and `.codex/AGENTS.md` / `.codex/docs.md` when release workflow expectations change. |
| Marketplace docs, README screenshots, icon, install/publish workflow, or extension id assumptions | Update `.codex/AGENTS.md`, `.codex/docs.md`, README, `CHANGELOG.md` if user-facing release notes change, and `.vscodeignore` notes if packaging changes. |

## Completion Checklist

- Run `npm run test:docs` for every change that touches code, package metadata, tests, themes, or `.codex`.
- Run `npm run test:check` before claiming the repository-level lightweight gate passes.
- For docs-only edits, `npm run test:docs` is the minimum gate.
- Do not leave `.codex` files as stale snapshots after additions, removals, or updates.
