# Step 03 Context: Runtime Wrapper And CSS Link

## Goal

Change `src/js/theme_template.js` from direct style replacement to additive runtime behavior:

- detect whether a Kawaii theme is active;
- add `kawaii-vscode-colors-ui` to `document.documentElement`, falling back to `document.body`;
- link `kawaii-vscode-colors-ui.min.css`;
- generate scoped token glow rules under `.kawaii-vscode-colors-ui`;
- stop embedding `[CHROME_STYLES]` in JS.

## Current Source Facts

- `src/js/theme_template.js` currently defines:
  - `themeStylesId = 'kawaii_synthwave-theme-styles'`
  - `chromeStylesId = 'kawaii_synthwave-chrome-styles'`
  - `chromeStyles = \`[CHROME_STYLES]\``
- It appends chrome CSS as a `<style>` tag to `document.body`.
- It reads `.vscode-tokens-styles`, copies the CSS text, replaces color declarations, and writes the result into a style tag.
- `src/renderer/ThemeTemplate.ts` mirrors runtime token constants and style ids for tests.

## Files To Open

- `src/js/theme_template.js`
- `src/renderer/ThemeTemplate.ts`
- `test/unit/renderer-theme-template.test.ts`
- `test/e2e/neon-real.spec.js`

## Runtime Target

Wrapper class target:

```js
document.documentElement || document.body
```

Theme active check:

```js
Boolean(getKawaiiVsCodeColorThemeWrapper())
```

The theme wrapper is not the wrapper-class target.
