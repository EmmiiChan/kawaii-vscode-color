# Changelog

All notable changes to this project will be documented in this file.

This project keeps a human-written changelog for users and maintainers. GitHub Releases can reuse the current release section as the release notes body.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and release versions should follow [Semantic Versioning](https://semver.org/) where practical for this VS Code extension.

## Release Workflow

1. Keep active work under `## [Unreleased]`.
2. When cutting a release, rename `Unreleased` to the package version and date, for example `## [0.1.29] - 2026-06-18`.
3. Add a fresh empty `## [Unreleased]` section above the released version.
4. Copy the released section into the GitHub Release notes, or use GitHub's generated notes and reconcile them with this file.

Use only the sections that matter for a given release:

- `Added` for new user-facing features.
- `Changed` for behavior changes, refactors with user or maintainer impact, and workflow updates.
- `Deprecated` for features kept temporarily but planned for removal.
- `Removed` for removed features or compatibility.
- `Fixed` for bug fixes.
- `Security` for vulnerability fixes or hardening.
- `Tests` for meaningful test coverage or validation changes.

## [Unreleased]

### Added

- Add a clean local build workflow for removing generated test artifacts before packaging.
- Add current TypeScript architecture documentation and consolidate historical README material into one chronological legacy archive.

### Changed

- Scope injected Neon UI assets by active Kawaii theme wrapper and keep the generated workbench runtime asset names Kawaii-specific.
- Remove packaged VSIX artifacts from source control.

### Fixed

- Restore no-tab logo and editor background behavior across older and newer VS Code empty-editor DOM shapes.
- Align settings webview contracts with the safe DOM and E2E flows.

### Tests

- Harden unit, DOM, package, and E2E coverage for theme wrappers, settings webview contracts, image/logo states, and disposable Neon patch behavior.

## [0.2.0] - 2026-06-22

### Added

- Add strict TypeScript build and no-emit validation for extension, script, and TypeScript test sources.
- Add `npm run test:package` to validate local VSIX packaging without incrementing the package version.
- Add a `Test: all` VS Code launch configuration for `npm run test:all`.

### Changed

- Compile the extension from TypeScript into `out/src/extension.js`, with `package.json.main` pointing at the compiled runtime entry.
- Keep script entrypoints as stable JavaScript wrappers backed by TypeScript implementations in `out-scripts`.
- Tighten `.vscodeignore` so release packages exclude development artifacts while keeping compiled runtime files, generated themes, image assets, README, license, icon, and Neon runtime assets.
- Expand `npm run test:all` so the safe local gate now runs static checks, unit, DOM, integration, local package, and safe E2E phases before printing the aggregate summary.

### Fixed

- Fix local VSIX packaging from compiled script output by resolving the repository root with build-config marker files instead of accepting stale package metadata under `out-scripts`.

### Tests

- Add regression coverage for strict TypeScript package boundaries, package helper root resolution, portable VSCE command selection, and the expanded `test:all` phase list.
- Validate the full safe gate with `npm run test:all`, including the new package phase.
