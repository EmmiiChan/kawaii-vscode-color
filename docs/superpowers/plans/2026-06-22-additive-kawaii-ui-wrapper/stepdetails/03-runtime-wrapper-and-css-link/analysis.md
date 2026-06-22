# Step 03 Analysis: Runtime Wrapper And CSS Link

## Main Behavioral Shift

Before:

```js
const updatedThemeStyles = replaceTokens(initialThemeStyles, orderedTokenReplacements);
themeStyleTag.innerText = updatedThemeStyles;
```

After:

```js
const updatedThemeStyles = createScopedTokenRules(initialThemeStyles, orderedTokenReplacements);
themeStyleTag.innerText = updatedThemeStyles;
```

The original `.vscode-tokens-styles` is read but not copied wholesale.

## Highest-Level Wrapper

The class must be placed on `<html>` where possible:

```js
const getHighestWorkbenchRoot = () => document.documentElement || document.body;
```

The active Kawaii theme wrapper remains only a condition:

```js
const hasActiveKawaiiTheme = Boolean(getKawaiiVsCodeColorThemeWrapper());
```

This avoids binding Kawaii UI effects to an internal child wrapper that may not contain all workbench surfaces.

## Stylesheet Link

The runtime should link:

```html
<link id="kawaii-vscode-colors-ui-stylesheet" rel="stylesheet" href="kawaii-vscode-colors-ui.min.css?v=<token>">
```

Use a link rather than a style tag for static CSS because the CSS is a generated asset from Sass.

## Token Rule Generation

The dynamic token glow rules must scope every generated rule:

```css
.kawaii-vscode-colors-ui .mtk5 {
  color: #fffafd;
  text-shadow: ...;
}
```

Do not generate unscoped `.mtk5` rules.

## Risk Analysis

- VS Code token CSS may include compound selector lists. Split selector lists conservatively and keep selector text unchanged.
- The regex-based rule extraction should only process simple CSS rules with `color: #...;`.
- Keep the MutationObserver signature logic so token rules update after theme changes.
- Do not add unbounded polling or timers.
- Remove linked CSS and token style when the active theme is no longer Kawaii.
