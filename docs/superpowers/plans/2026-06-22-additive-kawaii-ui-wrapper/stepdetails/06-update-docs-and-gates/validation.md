# Step 06 Validation

## Documentation Guard

Run:

```powershell
npm run test:docs
```

Expected result:

```text
Codex documentation is aligned with project facts.
```

## Static Gate

Run:

```powershell
npm run test:check
```

Expected result: pass.

## Unit Gate

Run:

```powershell
npm run test:unit
```

Expected result: pass.

## Manual Audit

Run:

```powershell
rg -n "CHROME_STYLES|kawaii-vscode-colors-ui.min.css|document.documentElement|Sass|sass" README.md .codex scripts test src package.json
```

Confirm:

- Docs mention top-level root, not theme-wrapper root.
- Docs mention Sass build and generated CSS.
- No docs claim the runtime rewrites `.vscode-tokens-styles`.
