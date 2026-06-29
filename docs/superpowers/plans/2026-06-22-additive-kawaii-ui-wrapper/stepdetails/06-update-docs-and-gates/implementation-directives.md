# Step 06 Implementation Directives

## 1. Update `.codex/system-map.md`

Update runtime modules:

```markdown
| `src/js/theme_template.js` | Renderer-side Kawaii theme detection, top-level wrapper class management, stylesheet link injection, and scoped token glow rule generation. |
| `src/scss/kawaii-vscode-colors-ui.scss` | Sass entrypoint for wrapper-scoped workbench UI effects. |
| `src/css/kawaii-vscode-colors-ui.min.css` | Generated configured runtime stylesheet linked by the injected workbench script. |
```

Update renderer placeholders to include:

```markdown
- `KAWAII_UI_STYLE_VERSION`
```

Remove `CHROME_STYLES` if no source file still contains `[CHROME_STYLES]`.

## 2. Update `.codex/structure.md`

Update renderer flow:

```text
VS Code loads patched workbench HTML
  -> kawaii-vscode-colors-ui.js runs in the workbench renderer
  -> script confirms the active theme belongs to this extension
  -> script adds kawaii-vscode-colors-ui to document.documentElement or document.body
  -> script links kawaii-vscode-colors-ui.min.css
  -> script reads .vscode-tokens-styles to derive token classes
  -> script injects scoped token glow rules under .kawaii-vscode-colors-ui
```

## 3. Update `.codex/docs.md`

Add package inventory row for `sass` using the resolved version from `package-lock.json`.

Add runtime source references:

```markdown
| `src/scss/kawaii-vscode-colors-ui.scss` | Sass source for wrapper-scoped UI effects | Sass docs |
| `src/css/kawaii-vscode-colors-ui.min.css` | Generated runtime stylesheet linked from the patched workbench script | MDN CSS docs |
| `scripts/build-ui-css.ts` | Compiles Sass and generated bridge partials for runtime CSS | Sass JavaScript API docs |
```

## 4. Update README

In the Neon Effect section, explain:

```markdown
The injected script adds `kawaii-vscode-colors-ui` to the highest available workbench root, links the generated `kawaii-vscode-colors-ui.min.css`, and injects token glow rules scoped to that wrapper. It reads VS Code token styles to discover runtime token classes, but it does not rewrite the original `.vscode-tokens-styles` tag.
```

## 5. Update Docs Checker

In `scripts/check-codex-docs.ts`, add facts for:

```ts
"src/scss/kawaii-vscode-colors-ui.scss",
"src/css/kawaii-vscode-colors-ui.min.css",
"scripts/build-ui-css.ts",
"kawaii-vscode-colors-ui"
```

Update `scripts/check-codex-docs.test.js` fixtures so the base docs contain those facts.

## 6. Update Strict Package Test

In `test/unit/strict-typescript-package.test.ts`, assert:

```ts
assert.ok(fs.existsSync(path.join(process.cwd(), "src", "css", "kawaii-vscode-colors-ui.min.css")));
assert.ok(fs.existsSync(path.join(process.cwd(), "src", "scss", "kawaii-vscode-colors-ui.scss")));
```

Keep the runtime JavaScript restriction to `src/js/theme_template.js`.
