(function () {
  //====================================
  // Theme replacement CSS (Glow styles)
  //====================================
  const darkTokenReplacements = {
    /* Red */
    'fe4450': "color: #fffafd; text-shadow: 0 0 2px #000, 0 0 10px #fc1f2c[NEON_BRIGHTNESS], 0 0 5px #fc1f2c[NEON_BRIGHTNESS], 0 0 25px #fc1f2c[NEON_BRIGHTNESS]; backface-visibility: hidden;",
    /* Neon pink */
    'ff7edb': "color: #f92aad; text-shadow: 0 0 2px #100c0f, 0 0 5px #dc078e33, 0 0 10px #fffafd33; backface-visibility: hidden;",
    /* Yellow */
    'fede5d': "color: #f4eee4; text-shadow: 0 0 2px #393a33, 0 0 8px #f39f05[NEON_BRIGHTNESS], 0 0 2px #f39f05[NEON_BRIGHTNESS]; backface-visibility: hidden;",
    /* Green */
    '72f1b8': "color: #72f1b8; text-shadow: 0 0 2px #100c0f, 0 0 10px #257c55[NEON_BRIGHTNESS], 0 0 35px #212724[NEON_BRIGHTNESS]; backface-visibility: hidden;",
    /* Blue */
    '36f9f6': "color: #fdfdfd; text-shadow: 0 0 2px #001716, 0 0 3px #03edf9[NEON_BRIGHTNESS], 0 0 5px #03edf9[NEON_BRIGHTNESS], 0 0 8px #03edf9[NEON_BRIGHTNESS]; backface-visibility: hidden;"
  };
  const lightTokenReplacements = {
    /* Light blue */
    '0000ff': "color: #244fd8; text-shadow: 0 0 2px #fffafd, 0 0 4px #59a4f9[NEON_BRIGHTNESS], 0 0 8px #59a4f966; backface-visibility: hidden;",
    /* Light green */
    '008000': "color: #1f7d56; text-shadow: 0 0 2px #fffafd, 0 0 4px #72f1b8[NEON_BRIGHTNESS], 0 0 7px #72f1b866; backface-visibility: hidden;",
    /* Light numeric green */
    '098658': "color: #1f7d56; text-shadow: 0 0 2px #fffafd, 0 0 4px #72f1b8[NEON_BRIGHTNESS], 0 0 7px #72f1b866; backface-visibility: hidden;",
    /* Sakura red */
    'a31515': "color: #a83c47; text-shadow: 0 0 2px #fffafd, 0 0 4px #f98784[NEON_BRIGHTNESS], 0 0 8px #f9878466; backface-visibility: hidden;",
    /* Error red */
    'cd3131': "color: #c43455; text-shadow: 0 0 2px #fffafd, 0 0 4px #fe4450[NEON_BRIGHTNESS], 0 0 8px #fe445066; backface-visibility: hidden;",
    /* Sakura wine */
    '811f3f': "color: #a9235d; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb[NEON_BRIGHTNESS], 0 0 8px #ff7edb66; backface-visibility: hidden;",
    /* Sakura maroon */
    '800000': "color: #a83c47; text-shadow: 0 0 2px #fffafd, 0 0 4px #f98784[NEON_BRIGHTNESS], 0 0 8px #f9878466; backface-visibility: hidden;",
    /* Light attribute red */
    'ff0000': "color: #d6336c; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb[NEON_BRIGHTNESS], 0 0 8px #ff7edb66; backface-visibility: hidden;",
    /* Light link blue */
    '0451a5': "color: #0f5fa8; text-shadow: 0 0 2px #fffafd, 0 0 4px #59a4f9[NEON_BRIGHTNESS], 0 0 8px #59a4f966; backface-visibility: hidden;",
    /* Light navy */
    '000080': "color: #3e3f9e; text-shadow: 0 0 2px #fffafd, 0 0 4px #745ca0[NEON_BRIGHTNESS], 0 0 8px #745ca066; backface-visibility: hidden;",
    /* Light foreground */
    '000000': "color: #2b1d29; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb33, 0 0 8px #ff7edb22; backface-visibility: hidden;",
    /* Light pink foreground */
    '2b1d29': "color: #2b1d29; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb33, 0 0 8px #ff7edb22; backface-visibility: hidden;"
  };
  const tokenReplacementSets = [darkTokenReplacements, lightTokenReplacements];
  const innerThemeConfigs = [
    {
      id: 'dark',
      wrapperClass: 'dark-pink-kawaii',
      selectors: [
        '[class~="vs-dark"][class*="kawaii_synthwave-generated-color-theme-json"]',
        '[class~="vs-dark"][class*="kawaii-synthwave-generated-color-theme-json"]',
        '[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"]'
      ]
    },
    {
      id: 'light',
      wrapperClass: 'light-pink-pastel-kawaii',
      selectors: [
        '[class~="vs"][class*="kawaii_synthwave-generated-color-theme-light-json"]',
        '[class~="vs"][class*="kawaii-synthwave-generated-color-theme-light-json"]',
        '[class~="vs"][class*="kawaii-vscode-color-generated-color-theme-light-json"]'
      ]
    }
  ];
  const innerThemeWrapperClasses = innerThemeConfigs.map((innerTheme) => innerTheme.wrapperClass);
  const UI_ROOT_CLASS = 'kawaii-vscode-colors-ui';
  const UI_STYLESHEET_ID = 'kawaii-vscode-colors-ui-stylesheet';
  const TOKEN_STYLES_ID = 'kawaii-vscode-colors-ui-token-styles';
  const UI_STYLESHEET_HREF = 'kawaii-vscode-colors-ui.min.css?v=[KAWAII_UI_STYLE_VERSION]';
  let activeTokenStylesSignature = '';

  //=============================
  // Helper functions
  //=============================

  /**
   * @summary Check if the style element exists and that it has Kawaii VS Code Color theme content
   * @param {HTMLElement} tokensEl the style tag
   * @param {object} replacements key/value pairs of colour hex and the glow styles to replace them with
   * @returns {boolean}
   */
  const themeStylesExist = (tokensEl) => tokensEl ? tokensEl.innerText !== '' : false;

  /**
   * @summary Normalizes a token color for replacement map lookup.
   * @param {string} color token color without the leading hash
   * @returns {string} Lowercase six-digit token color when possible
   */
  const normalizeTokenColor = (color) => {
    const normalizedColor = color.toLowerCase();
    return normalizedColor.length === 8 && normalizedColor.endsWith('ff')
      ? normalizedColor.slice(0, 6)
      : normalizedColor;
  };

  /**
   * @summary Builds a token color matcher that tolerates VS Code whitespace and alpha suffix variants.
   * @param {string} color token color without the leading hash
   * @returns {RegExp}
   */
  const createTokenColorRegex = (color) => new RegExp(`color\\s*:\\s*#${color}(?:ff)?\\s*;`, 'gi');

  /**
   * @summary Counts how many replacement colors exist in the active VS Code token style element.
   * @param {string} tokenStyles token CSS text
   * @param {object} replacements key/value pairs of colour hex and the glow styles to replace them with
   * @returns {number}
   */
  const countMatchingTokenColors = (tokenStyles, replacements) => Object.keys(replacements).filter((color) => {
    const re = createTokenColorRegex(color);
    return re.test(tokenStyles);
  }).length;

  /**
   * @summary Gets the replacement set with the most matching token colors in the active theme style.
   * @param {HTMLElement} tokensEl the style tag
   * @returns {object}
   */
  const getBestTokenReplacements = (tokensEl) => {
    const tokenStyles = tokensEl.innerText.toLowerCase();
    const rankedSets = tokenReplacementSets.map(replacements => ({
      replacements,
      matchCount: countMatchingTokenColors(tokenStyles, replacements)
    }));
    const bestMatch = rankedSets.reduce((best, current) => current.matchCount > best.matchCount ? current : best, rankedSets[0]);

    return bestMatch.matchCount > 0 ? bestMatch.replacements : darkTokenReplacements;
  };

  /**
   * @summary Orders replacement maps so the active theme family gets first pass and shared colors keep the right glow tone.
   * @param {HTMLElement} tokensEl the style tag
   * @returns {object[]}
   */
  const getOrderedTokenReplacementSets = (tokensEl) => {
    const bestTokenReplacements = getBestTokenReplacements(tokensEl);
    return [
      bestTokenReplacements,
      ...tokenReplacementSets.filter((replacements) => replacements !== bestTokenReplacements)
    ];
  };

  /**
   * @summary Gets the glow CSS for a token color from the ordered replacement sets.
   * @param {string} color token color without the leading hash
   * @param {object[]} replacementSets ordered key/value pairs of colour hex and glow CSS
   * @returns {string | null}
   */
  const getTokenColorReplacement = (color, replacementSets) => {
    const tokenColor = normalizeTokenColor(color);

    for (const replacements of replacementSets) {
      if (Object.prototype.hasOwnProperty.call(replacements, tokenColor)) {
        return replacements[tokenColor];
      }
    }

    return null;
  };

  /**
   * @summary Creates one additive token override rule scoped by the Kawaii UI root class.
   * @param {string} selector VS Code token selector
   * @param {string} replacement replacement glow declaration block
   * @param {object} innerTheme active inner theme config
   * @returns {string}
   */
  const createScopedTokenRule = (selector, replacement, innerTheme) => `.${UI_ROOT_CLASS}.${innerTheme.wrapperClass} ${selector.trim()} {${replacement}}`;

  /**
   * @summary Builds scoped token glow CSS without copying VS Code's original token stylesheet.
   * @param {string} styles the text content of the style tag
   * @param {object[]} replacementSets key/value pairs of colour hex and the glow styles to replace them with
   * @param {object} innerTheme active inner theme config
   * @returns {string}
   */
  const createScopedTokenRules = (styles, replacementSets, innerTheme) => {
    const scopedRules = [];

    styles.replace(/([^{}]+)\{[^{}]*?color\s*:\s*#([0-9a-f]{6}(?:[0-9a-f]{2})?)\s*;[^{}]*\}/gi, (match, selectorList, color) => {
      const replacement = getTokenColorReplacement(color, replacementSets);

      if (!replacement) {
        return match;
      }

      selectorList
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean)
        .forEach((selector) => scopedRules.push(createScopedTokenRule(selector, replacement, innerTheme)));

      return match;
    });

    return scopedRules.join('');
  };

  /**
   * @summary Builds a stable signature for the current token CSS and glow setting.
   * @param {string} styles the text content of the style tag
   * @param {boolean} disableGlow current glow disable flag
   * @param {object} innerTheme active inner theme config
   * @returns {string}
   */
  const getTokenStylesSignature = (styles, disableGlow, innerTheme) => `${innerTheme.wrapperClass}:${disableGlow}:${styles}`;

  /**
   * @summary Safely removes an injected style tag when it exists.
   * @param {string} styleId style tag id
   * @returns {void}
   */
  const removeInjectedStyle = (styleId) => {
    const styleTag = document.querySelector(`#${styleId}`);

    if (!styleTag || !styleTag.parentNode) {
      return;
    }

    styleTag.parentNode.removeChild(styleTag);
  };

  /**
   * @summary Safely removes an injected linked stylesheet when it exists.
   * @param {string} stylesheetId stylesheet link id
   * @returns {void}
   */
  const removeLinkedStylesheet = (stylesheetId) => {
    const stylesheet = document.querySelector(`#${stylesheetId}`);

    if (!stylesheet || !stylesheet.parentNode) {
      return;
    }

    stylesheet.parentNode.removeChild(stylesheet);
  };

  /**
   * @summary Removes runtime CSS when the active theme is outside the Kawaii VS Code Color family.
   * @returns {object | null}
   */
  const cleanupInactiveThemeStyles = () => {
    const activeInnerTheme = syncUiRootClass();

    if (activeInnerTheme) {
      return activeInnerTheme;
    }

    removeInjectedStyle(TOKEN_STYLES_ID);
    removeLinkedStylesheet(UI_STYLESHEET_ID);
    activeTokenStylesSignature = '';
    return null;
  };

  /**
   * @summary Finds the active Kawaii inner theme from VS Code's current theme classes.
   * @returns {object | null} Active inner theme config when present.
   */
  const getActiveInnerTheme = () => innerThemeConfigs.find((innerTheme) => (
    Boolean(document.querySelector(innerTheme.selectors.join(', ')))
  )) || null;

  /**
   * @summary Gets the highest DOM node available for scoping Kawaii UI effects.
   * @returns {HTMLElement | null}
   */
  const getHighestWorkbenchRoot = () => document.documentElement || document.body;

  /**
   * @summary Synchronizes the high-level Kawaii UI wrapper class with the active theme state.
   * @returns {object | null} active inner theme when Kawaii UI styles should be active
   */
  const syncUiRootClass = () => {
    const root = getHighestWorkbenchRoot();
    const activeInnerTheme = getActiveInnerTheme();

    if (!root) {
      return null;
    }

    innerThemeWrapperClasses.forEach((wrapperClass) => root.classList.remove(wrapperClass));

    if (!activeInnerTheme) {
      root.classList.remove(UI_ROOT_CLASS);
      return null;
    }

    root.classList.add(UI_ROOT_CLASS, activeInnerTheme.wrapperClass);
    return activeInnerTheme;
  };

  /**
   * @summary Checks if the theme is Kawaii VS Code Color, and that the styles exist, ready for replacement
   * @param {HTMLElement} tokensEl the style tag
   * @param {object | null} activeInnerTheme active inner theme config
   * @returns 
   */
  const readyForReplacement = (tokensEl, activeInnerTheme) => tokensEl
    ? (
      // only init if we're using a Kawaii VS Code Color subtheme
      Boolean(activeInnerTheme) &&
      // does it have content ?
      themeStylesExist(tokensEl)
    )
    : false;

  /**
   * @summary Adds the static Kawaii UI stylesheet without waiting for token glow styles.
   * @returns {void}
   */
  const ensureUiStylesheet = () => {
    if (!syncUiRootClass() || document.querySelector(`#${UI_STYLESHEET_ID}`)) {
      return;
    }

    const stylesheet = document.createElement('link');
    stylesheet.setAttribute('id', UI_STYLESHEET_ID);
    stylesheet.setAttribute('rel', 'stylesheet');
    stylesheet.setAttribute('href', UI_STYLESHEET_HREF);
    document.head.appendChild(stylesheet);

    console.log('Kawaii VS Code Color: UI stylesheet initialised!');
  };

  /**
   * @summary Attempts to bootstrap the theme
   * @param {boolean} disableGlow 
   * @param {MutationObserver} obs 
   */
  const initKawaiiVsCodeColorsUi = (disableGlow, obs) => {
    const tokensEl = document.querySelector('.vscode-tokens-styles');

    const activeInnerTheme = cleanupInactiveThemeStyles();
    ensureUiStylesheet();

    if (!tokensEl || !readyForReplacement(tokensEl, activeInnerTheme)) {
      return;
    }

    const initialThemeStyles = tokensEl.innerText;
    const tokenStylesSignature = getTokenStylesSignature(initialThemeStyles, disableGlow, activeInnerTheme);

    if (activeTokenStylesSignature === tokenStylesSignature) {
      return;
    }

    const orderedTokenReplacements = getOrderedTokenReplacementSets(tokensEl);
    const updatedThemeStyles = !disableGlow
      ? createScopedTokenRules(initialThemeStyles, orderedTokenReplacements, activeInnerTheme)
      : '';

    let themeStyleTag = document.querySelector(`#${TOKEN_STYLES_ID}`);

    if (!updatedThemeStyles) {
      removeInjectedStyle(TOKEN_STYLES_ID);
    } else if (!themeStyleTag) {
      themeStyleTag = document.createElement('style');
      themeStyleTag.setAttribute("id", TOKEN_STYLES_ID);
      document.body.appendChild(themeStyleTag);
    }

    if (themeStyleTag && updatedThemeStyles) {
      themeStyleTag.innerText = updatedThemeStyles.replace(/(\r\n|\n|\r)/gm, '');
    }

    activeTokenStylesSignature = tokenStylesSignature;

    console.log('Kawaii VS Code Color: UI effects initialised!');
  };

  /**
   * @summary A MutationObserver callback that attempts to bootstrap the theme and assigns a retry attempt if it fails
   */
  const watchForBootstrap = function(mutationsList, observer) {
    for(let mutation of mutationsList) {
      if (mutation.type === 'attributes' || mutation.type === 'childList') {
        const activeInnerTheme = cleanupInactiveThemeStyles();
        ensureUiStylesheet();

        // does the style div exist yet?
        const tokensEl = document.querySelector('.vscode-tokens-styles');
        if (readyForReplacement(tokensEl, activeInnerTheme)) {
          // If everything we need is ready, then initialise
          initKawaiiVsCodeColorsUi([DISABLE_GLOW], observer);
        }
      }
    }
  };

  //=============================
  // Start bootstrapping!
  //=============================
  // Grab body node
  const bodyNode = document.querySelector('body');
  // Use a mutation observer to check when we can bootstrap the theme
  const observer = new MutationObserver(watchForBootstrap);
  /* watch for both attribute and childList changes because, depending on 
  the VS code version, the mutations might happen on the body, or they might 
  happen on a nested div */
  observer.observe(bodyNode, { attributes: true, childList: true, subtree: true });
  ensureUiStylesheet();
  initKawaiiVsCodeColorsUi([DISABLE_GLOW], observer);
})();
