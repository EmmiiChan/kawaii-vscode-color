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

- Add modular Effects switches for Foundation / Runtime Layer, Editor Background, No-Page Logo, and Glow Effects, all enabled by default.
- Add `apply-effects`, `update-effect-features`, and structured `effects-status` webview messages for a selected patch stack.
- Add public theme color packs under `themes/` with numeric color version metadata and a generated internal theme catalog.
- Add `npm run update:themes` with GitHub folder ingestion, version-aware local updates, and `--dry-run` validation for public color packs.
- Add `colorVersion` to settings exports, starting at `0.0.1` and incrementing through Settings Sync and JSON export flows.

### Changed

- Rename the settings page from Neon Effect to Effects and refer to the injected runtime as Kawaii Neon in user-facing docs.
- Apply first-profile extension defaults for VS Code welcome page, editor tabs, tab wrapping, and folder-window behavior while preserving the user's existing session-restore setting.
- Include VS Code application settings in explicit Settings Sync and JSON settings bundles.
- Move editor background image, no-tab logo, and Apply Effects controls from Color Settings to Image Customization.
- Move Settings Sync and JSON import/export actions from Color Settings into the Sync / Files page with grouped action controls.
- Gate generated workbench CSS and renderer token glow by module classes so each Effects module can be applied independently.
- Apply Effects now persists selected modules, cleans previous generated modifications/assets, and applies the new stack in one flow.
- Move protected base theme JSON into `src/core-themes` and generated VS Code theme JSON into `src/generated-themes`.
- Make `npm run build:theme` read public `themes/*.json` color packs before generating native theme contributions and the internal catalog.

### Fixed

- Fix a legacy lightbulb selector separator in the generated workbench CSS source.
- Make Apply Effects pass the selected module stack directly to the controller so late switch persistence messages cannot apply a stale combination.
- Avoid blocking Apply Effects when a passive information notification remains open after a no-op or already-removed patch cleanup.
- Avoid stale settings webview refreshes after Effects switch changes so rapid multi-switch combinations are not overwritten before Apply.

### Tests

- Expand gated Kawaii Neon E2E validation to apply all 16 Effects switch combinations with before/after screenshots, generated asset checks, runtime module class checks, and a `neon-effects-combination-matrix.json` report.
- Cover first-profile application setting defaults plus Settings Sync and JSON bundle round trips for application settings.
- Cover public color pack validation, GitHub folder ingestion, version-aware theme update planning, generated internal theme catalog output, and settings export color version increments in unit tests.

## [0.2.7] - 2026-06-25

### Added

- Add a clean local build workflow for removing generated test artifacts before packaging.
- Add current TypeScript architecture documentation and consolidate historical README material into one chronological legacy archive.
- Add disposable VS Code cleanup diagnostics through `npm run test:cleanup-diagnostics` and `npm run test:cleanup-processes`.

### Changed

- Scope injected Neon UI assets by active Kawaii theme wrapper and keep the generated workbench runtime asset names Kawaii-specific.
- Bound the renderer bootstrap observer, keep post-bootstrap token/theme observers narrow, and rebuild glow styles only when the relevant workbench signatures change.
- Coalesce repeated Neon apply/enable/disable requests so overlapping settings UI actions do not stack concurrent workbench patch writes.
- Copy stored editor background and no-tab logo images into generated workbench assets instead of embedding large image `data:` payloads in generated CSS.
- Remove packaged VSIX artifacts from source control.

### Fixed

- Restore no-tab logo and editor background behavior across older and newer VS Code empty-editor DOM shapes.
- Align settings webview contracts with the safe DOM and E2E flows.
- Remove generated Kawaii workbench JS, CSS, and image assets when Neon Effect is disabled.
- Clean stale marked Kawaii/legacy workbench script tags and generated UI assets before the gated Neon E2E baseline launch.

### Tests

- Harden unit, DOM, package, and E2E coverage for theme wrappers, settings webview contracts, image/logo states, and disposable Neon patch behavior.
- Cover renderer observer lifecycle, runtime image asset URLs, generated asset cleanup after disable, single-flight Neon request handling, and disposable process cleanup diagnostics.

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
