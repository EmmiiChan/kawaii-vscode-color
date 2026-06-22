# Step 03 Implementation Directives

## 1. Add Source Contract Tests

In `test/unit/renderer-theme-template.test.ts`, add:

```ts
test("renderer template uses additive wrapper class and stylesheet link", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src", "js", "theme_template.js"), "utf8");

  assert.match(source, /kawaii-vscode-colors-ui/);
  assert.match(source, /document\.documentElement/);
  assert.match(source, /classList\.add\(UI_ROOT_CLASS\)/);
  assert.match(source, /rel', 'stylesheet'/);
  assert.doesNotMatch(source, /const chromeStyles = `\[CHROME_STYLES\]`/);
});

test("renderer template scopes generated token rules under the wrapper class", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src", "js", "theme_template.js"), "utf8");

  assert.match(source, /createScopedTokenRule/);
  assert.match(source, /`\\.\$\{UI_ROOT_CLASS\} \$\{selector\} \\{\$\{replacement\}\\}`/);
  assert.doesNotMatch(source, /replaceTokens\(initialThemeStyles/);
});
```

Use quote style matching the actual source. If the source uses double quotes, update the assertion to match double quotes.

## 2. Add Runtime Constants

In `src/js/theme_template.js`, replace the old style ids with:

```js
const UI_ROOT_CLASS = 'kawaii-vscode-colors-ui';
const UI_STYLESHEET_ID = 'kawaii-vscode-colors-ui-stylesheet';
const TOKEN_STYLES_ID = 'kawaii-vscode-colors-ui-token-styles';
const UI_STYLESHEET_HREF = 'kawaii-vscode-colors-ui.min.css?v=[KAWAII_UI_STYLE_VERSION]';
let activeUiRoot = null;
let activeTokenStylesSignature = '';
```

Remove:

```js
const chromeStylesId = 'kawaii_synthwave-chrome-styles';
const chromeStyles = `[CHROME_STYLES]`;
```

## 3. Add Root Class Helpers

Add:

```js
const getHighestWorkbenchRoot = () => document.documentElement || document.body;

const removeUiRootClass = () => {
  document.querySelectorAll(`.${UI_ROOT_CLASS}`).forEach((element) => {
    element.classList.remove(UI_ROOT_CLASS);
  });
  activeUiRoot = null;
};

const syncUiRootClass = () => {
  const hasActiveKawaiiTheme = Boolean(getKawaiiVsCodeColorThemeWrapper());
  const uiRoot = getHighestWorkbenchRoot();

  if (!hasActiveKawaiiTheme || !uiRoot) {
    removeUiRootClass();
    return null;
  }

  if (activeUiRoot && activeUiRoot !== uiRoot) {
    activeUiRoot.classList.remove(UI_ROOT_CLASS);
  }

  uiRoot.classList.add(UI_ROOT_CLASS);
  activeUiRoot = uiRoot;
  return uiRoot;
};
```

## 4. Add Stylesheet Link Helpers

Add:

```js
const removeLinkedStylesheet = () => {
  const linkTag = document.querySelector(`#${UI_STYLESHEET_ID}`);

  if (linkTag && linkTag.parentNode) {
    linkTag.parentNode.removeChild(linkTag);
  }
};

const ensureUiStylesheet = () => {
  if (!syncUiRootClass()) {
    removeInjectedStyle(TOKEN_STYLES_ID);
    removeLinkedStylesheet();
    return;
  }

  if (document.querySelector(`#${UI_STYLESHEET_ID}`)) {
    return;
  }

  const linkTag = document.createElement('link');
  linkTag.setAttribute('id', UI_STYLESHEET_ID);
  linkTag.setAttribute('rel', 'stylesheet');
  linkTag.setAttribute('href', UI_STYLESHEET_HREF);
  document.head.appendChild(linkTag);
};
```

## 5. Replace Token Rewriting

Remove `replaceTokens()` and add:

```js
const createScopedTokenRule = (selector, replacement) => `.${UI_ROOT_CLASS} ${selector} {${replacement}}`;

const createScopedTokenRules = (styles, replacementSets) => {
  const tokenRules = [];
  const tokenRuleRegex = /([^{}]+)\{([^{}]*color\s*:\s*#([0-9a-f]{6}(?:[0-9a-f]{2})?)\s*;[^{}]*)\}/gi;
  let match = tokenRuleRegex.exec(styles);

  while (match) {
    const selector = match[1].trim();
    const replacement = getTokenColorReplacement(match[3], replacementSets);

    if (replacement) {
      tokenRules.push(createScopedTokenRule(selector, replacement));
    }

    match = tokenRuleRegex.exec(styles);
  }

  return tokenRules.join('');
};
```

## 6. Update Initialization

In `initKawaiiVsCodeColorsUi()`:

```js
ensureUiStylesheet();
```

Then:

```js
const updatedThemeStyles = !disableGlow
  ? createScopedTokenRules(initialThemeStyles, orderedTokenReplacements)
  : '';
```

Use `TOKEN_STYLES_ID` for the injected token style tag.

## 7. Update Cleanup

When the active theme is not Kawaii:

```js
removeInjectedStyle(TOKEN_STYLES_ID);
removeLinkedStylesheet();
removeUiRootClass();
activeTokenStylesSignature = '';
```
