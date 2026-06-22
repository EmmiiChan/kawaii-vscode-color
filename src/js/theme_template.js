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
  const kawaiiVsCodeColorThemeWrapperSelectors = [
    '[class~="vs-dark"][class*="kawaii_synthwave-generated-color-theme-json"]',
    '[class~="vs-dark"][class*="kawaii-synthwave-generated-color-theme-json"]',
    '[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"]',
    '[class~="vs"][class*="kawaii_synthwave-generated-color-theme-light-json"]',
    '[class~="vs"][class*="kawaii-synthwave-generated-color-theme-light-json"]',
    '[class~="vs"][class*="kawaii-vscode-color-generated-color-theme-light-json"]'
  ];
  const themeStylesId = 'kawaii_synthwave-theme-styles';
  const chromeStylesId = 'kawaii_synthwave-chrome-styles';
  const chromeStyles = `[CHROME_STYLES]`;
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
   * @summary Search and replace colours within a CSS definition
   * @param {string} styles the text content of the style tag
   * @param {object[]} replacementSets key/value pairs of colour hex and the glow styles to replace them with
   * @returns 
   */
  const replaceTokens = (styles, replacementSets) => styles.replace(
    /color\s*:\s*#([0-9a-f]{6}(?:[0-9a-f]{2})?)\s*;/gi,
    (match, color) => getTokenColorReplacement(color, replacementSets) || match
  );

  /**
   * @summary Builds a stable signature for the current token CSS and glow setting.
   * @param {string} styles the text content of the style tag
   * @param {boolean} disableGlow current glow disable flag
   * @returns {string}
   */
  const getTokenStylesSignature = (styles, disableGlow) => `${disableGlow}:${styles}`;

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
   * @summary Removes runtime CSS when the active theme is outside the Kawaii VS Code Color family.
   * @returns {void}
   */
  const cleanupInactiveThemeStyles = () => {
    if (usingKawaiiVsCodeColor()) {
      return;
    }

    removeInjectedStyle(themeStylesId);
    removeInjectedStyle(chromeStylesId);
    activeTokenStylesSignature = '';
  };

  /**
   * @summary Checks if a theme is applied, and that the theme belongs to the Kawaii VS Code Color family
   * @returns {boolean}
   */
  const usingKawaiiVsCodeColor = () => Boolean(getKawaiiVsCodeColorThemeWrapper());

  /**
   * @summary Finds the VS Code workbench wrapper for an active Kawaii VS Code Color theme.
   * @returns {Element | null} Active Kawaii VS Code Color theme wrapper when present
   */
  const getKawaiiVsCodeColorThemeWrapper = () => document.querySelector(kawaiiVsCodeColorThemeWrapperSelectors.join(', '));

  /**
   * @summary Checks if the theme is Kawaii VS Code Color, and that the styles exist, ready for replacement
   * @param {HTMLElement} tokensEl the style tag
   * @param {object[]} replacementSets key/value pairs of colour hex and the glow styles to replace them with
   * @returns 
   */
  const readyForReplacement = (tokensEl) => tokensEl
    ? (
      // only init if we're using a Kawaii VS Code Color subtheme
      usingKawaiiVsCodeColor() &&
      // does it have content ?
      themeStylesExist(tokensEl)
    )
    : false;

  /**
   * @summary Adds workbench chrome styles without waiting for token glow styles.
   * @returns {void}
   */
  const appendChromeStyles = () => {
    if (!usingKawaiiVsCodeColor() || document.querySelector(`#${chromeStylesId}`)) {
      return;
    }

    const chromeStyleTag = document.createElement('style');
    chromeStyleTag.setAttribute("id", chromeStylesId);
    chromeStyleTag.innerText = chromeStyles.replace(/(\r\n|\n|\r)/gm, '');
    document.body.appendChild(chromeStyleTag);

    console.log('Kawaii VS Code Color: chrome styles initialised!');
  };

  /**
   * @summary Attempts to bootstrap the theme
   * @param {boolean} disableGlow 
   * @param {MutationObserver} obs 
   */
  const initKawaiiVsCodeColorsUi = (disableGlow, obs) => {
    const tokensEl = document.querySelector('.vscode-tokens-styles');

    cleanupInactiveThemeStyles();
    appendChromeStyles();

    if (!tokensEl || !readyForReplacement(tokensEl)) {
      return;
    }

    const initialThemeStyles = tokensEl.innerText;
    const tokenStylesSignature = getTokenStylesSignature(initialThemeStyles, disableGlow);

    if (activeTokenStylesSignature === tokenStylesSignature) {
      return;
    }

    const orderedTokenReplacements = getOrderedTokenReplacementSets(tokensEl);
    const updatedThemeStyles = !disableGlow
      ? replaceTokens(initialThemeStyles, orderedTokenReplacements)
      : initialThemeStyles;

    let themeStyleTag = document.querySelector(`#${themeStylesId}`);

    if (!themeStyleTag) {
      themeStyleTag = document.createElement('style');
      themeStyleTag.setAttribute("id", themeStylesId);
      document.body.appendChild(themeStyleTag);
    }

    themeStyleTag.innerText = updatedThemeStyles.replace(/(\r\n|\n|\r)/gm, '');
    activeTokenStylesSignature = tokenStylesSignature;

    console.log('Kawaii VS Code Color: UI effects initialised!');
  };

  /**
   * @summary A MutationObserver callback that attempts to bootstrap the theme and assigns a retry attempt if it fails
   */
  const watchForBootstrap = function(mutationsList, observer) {
    for(let mutation of mutationsList) {
      if (mutation.type === 'attributes' || mutation.type === 'childList') {
        cleanupInactiveThemeStyles();
        appendChromeStyles();

        // does the style div exist yet?
        const tokensEl = document.querySelector('.vscode-tokens-styles');
        if (readyForReplacement(tokensEl)) {
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
  appendChromeStyles();
  initKawaiiVsCodeColorsUi([DISABLE_GLOW], observer);
})();
