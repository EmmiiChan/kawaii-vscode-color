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

### Fixed

- Restore custom no-tab logo rendering on VS Code builds that wrap the empty editor watermark in `.editor-group-watermark-wrapper`.
- Keep compatibility with the older empty editor watermark DOM used by VS Code 1.111/1.124 while adding support for VS Code 1.125-style markup.

### Tests

- Add unit coverage for generated no-tab logo selectors, old/new synthetic watermark DOM shapes, data URI output, and opacity output.
- Extend gated Neon E2E coverage to assert the active VS Code workbench still exposes a watermark target for the shared selector list.
- Validate `images/dev-images/logo-nopage.png` visually in a disposable VS Code test environment.
