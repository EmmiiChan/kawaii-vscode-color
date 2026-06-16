const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const vscode = require("vscode");

const PANEL_VIEW_TYPE = "kawaiiVsCodeColor.settings";
const SETTINGS_EXPORT_SCHEMA = "kawaii-vscode-color-settings";
const LEGACY_SETTINGS_EXPORT_SCHEMA = "kawaii-synthwave-settings";
const SETTINGS_EXPORT_SCHEMA_VERSION = 1;
const SYNC_SETTINGS_STATE_KEY = "kawaii_synthwave.syncedSettingsBundle";
const THEME_VARIANTS = [
  {
    id: "dark",
    label: "Kawaii VS Code Color",
    modeLabel: "Dark",
    generatedThemePath: path.join(__dirname, "..", "themes", "kawaii_synthwave-generated-color-theme.json")
  },
  {
    id: "light",
    label: "Kawaii VS Code Color Light",
    modeLabel: "Light",
    generatedThemePath: path.join(__dirname, "..", "themes", "kawaii_synthwave-generated-color-theme-light.json")
  }
];
const DEFAULT_THEME_VARIANT_ID = "dark";
const COLOR_THEME_SETTING = "workbench.colorTheme";
const WORKBENCH_CUSTOMIZATIONS_SETTING = "workbench.colorCustomizations";
const TOKEN_CUSTOMIZATIONS_SETTING = "editor.tokenColorCustomizations";
const BRIGHTNESS_SETTING = "kawaii_synthwave.brightness";
const DISABLE_GLOW_SETTING = "kawaii_synthwave.disableGlow";
const COLOR_SCHEME_REFERENCE_PATH = path.join(__dirname, "..", ".codex", "color_scheme_reference.md");
const COLOR_HEX_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const EDITOR_BACKGROUND_IMAGE_STATE_KEY = "kawaii_synthwave.editorBackgroundImage";
const EDITOR_BACKGROUND_OPACITY_STATE_KEY = "kawaii_synthwave.editorBackgroundOpacity";
const EDITOR_BACKGROUND_IMAGE_FILE_PREFIX = "editor-background-image";
const EDITOR_BACKGROUND_ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"];
const EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL = "PNG, JPG/JPEG, WEBP, SVG";
const IMAGE_DATA_URL_WARNING = "If preview image fails to apply, try a smaller image resolution. Image previews and injected effects use data URLs, so oversized images can make the settings page or VS Code reload unstable.";
const NEKOS_MOE_RANDOM_IMAGE_ENDPOINT = "https://nekos.moe/api/v1/random/image?nsfw=false";
const NEKOS_MOE_IMAGE_BASE_URL = "https://nekos.moe/image/";
const NEKOS_MOE_USER_AGENT = "KawaiiVSCodeColor (https://github.com/EmmiiChan/kawaii-vscode-color)";
const NETWORK_REQUEST_TIMEOUT_MS = 20000;
const NETWORK_REDIRECT_LIMIT = 3;
const NETWORK_JSON_MAX_BYTES = 1024 * 1024;
const SETTINGS_EXPORT_FILE_NAME = "kawaii-vscode-color-settings.json";
const EDITOR_BACKGROUND_MIME_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml"
};
const EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const EDITOR_BACKGROUND_DEFAULT_OPACITY = 0.12;
const EDITOR_BACKGROUND_MIN_OPACITY = 0;
const EDITOR_BACKGROUND_MAX_OPACITY = 0.35;
const EDITOR_BACKGROUND_OPACITY_STEP = 0.01;
const EDITOR_BACKGROUND_FIT_STATE_KEY = "kawaii_synthwave.editorBackgroundFit";
const EDITOR_BACKGROUND_DEFAULT_FIT = "full";
const EDITOR_BACKGROUND_FIT_OPTIONS = [
  { id: "full", label: "Full", description: "100% x 100%" },
  { id: "top", label: "Top", description: "100% x 50%" },
  { id: "bottom", label: "Bottom", description: "100% x 50%" },
  { id: "left", label: "Left", description: "50% x 100%" },
  { id: "right", label: "Right", description: "50% x 100%" },
  { id: "top-left", label: "Top Left", description: "50% x 50%" },
  { id: "top-right", label: "Top Right", description: "50% x 50%" },
  { id: "bottom-left", label: "Bottom Left", description: "50% x 50%" },
  { id: "bottom-right", label: "Bottom Right", description: "50% x 50%" }
];
const EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY = "kawaii_synthwave.emptyEditorLogoImage";
const EMPTY_EDITOR_LOGO_OPACITY_STATE_KEY = "kawaii_synthwave.emptyEditorLogoOpacity";
const EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX = "empty-editor-logo-image";
const EMPTY_EDITOR_LOGO_DEFAULT_OPACITY = 0.75;
const EMPTY_EDITOR_LOGO_MIN_OPACITY = 0;
const EMPTY_EDITOR_LOGO_MAX_OPACITY = 1;
const EMPTY_EDITOR_LOGO_OPACITY_STEP = 0.01;
const MARKDOWN_CODE_FENCE_CHARACTER = "`";
const TOKEN_DESCRIPTION_RULES = [
  {
    patterns: ["string.regexp", "constant.regexp"],
    description: "Regular expression literals and regex-specific string content."
  },
  {
    patterns: ["string", "quoted", "unquoted", "cdata"],
    description: "String literals, quoted text, and string-like embedded content."
  },
  {
    patterns: ["comment"],
    description: "Comments and documentation text."
  },
  {
    patterns: ["constant.numeric", "enummember", "exponent"],
    description: "Numeric literals, enum members, and numeric exponent operators."
  },
  {
    patterns: ["constant.language"],
    description: "Built-in language constants such as booleans, null, or nil."
  },
  {
    patterns: ["constant.sha.git-rebase"],
    description: "Commit hash constants in Git rebase files."
  },
  {
    patterns: ["constant.other.color", "rgb-value", "support.constant.color"],
    description: "Color literals and color values in stylesheets."
  },
  {
    patterns: ["variable.language"],
    description: "Built-in language variables such as this, self, or similar aliases."
  },
  {
    patterns: ["variable"],
    description: "Variables and variable-like identifiers."
  },
  {
    patterns: ["entity.name.tag", "punctuation.definition.tag"],
    description: "HTML, XML, and markup tag names or tag delimiters."
  },
  {
    patterns: ["entity.name.selector"],
    description: "CSS selector names."
  },
  {
    patterns: ["entity.other.attribute-name"],
    description: "HTML, XML, CSS, and stylesheet attribute or selector names."
  },
  {
    patterns: ["invalid"],
    description: "Invalid or illegal syntax highlighted by the grammar."
  },
  {
    patterns: ["markup.bold"],
    description: "Bold markup text."
  },
  {
    patterns: ["markup.heading"],
    description: "Markup headings and section titles."
  },
  {
    patterns: ["markup.inserted"],
    description: "Inserted lines in markup or diff-style content."
  },
  {
    patterns: ["markup.deleted"],
    description: "Deleted lines in markup or diff-style content."
  },
  {
    patterns: ["markup.changed"],
    description: "Changed lines in markup or diff-style content."
  },
  {
    patterns: ["markup.inline.raw"],
    description: "Inline raw spans, usually inline code in Markdown."
  },
  {
    patterns: ["punctuation.definition.quote", "punctuation.definition.list"],
    description: "Markdown quote markers and list markers."
  },
  {
    patterns: ["meta.preprocessor", "entity.name.function.preprocessor"],
    description: "Preprocessor directives and preprocessor function names."
  },
  {
    patterns: ["meta.structure.dictionary.key"],
    description: "Dictionary or object keys reported by a language grammar."
  },
  {
    patterns: ["storage.modifier.import.java", "storage.modifier.package.java", "variable.language.wildcard.java"],
    description: "Java import, package, and wildcard identifiers."
  },
  {
    patterns: ["storage.type"],
    description: "Type declaration keywords and storage type tokens."
  },
  {
    patterns: ["storage.modifier"],
    description: "Storage modifiers and declaration modifiers."
  },
  {
    patterns: ["storage"],
    description: "Declaration and storage keywords."
  },
  {
    patterns: ["support.type.property-name"],
    description: "CSS, JSON, and language property names."
  },
  {
    patterns: ["support.constant.property-value", "support.constant.font-name", "support.constant.media"],
    description: "CSS property values, font names, media constants, and related style constants."
  },
  {
    patterns: ["support.function"],
    description: "Built-in or grammar-provided support functions."
  },
  {
    patterns: ["keyword.operator"],
    description: "Operators and operator-like language keywords."
  },
  {
    patterns: ["keyword.control"],
    description: "Control-flow keywords."
  },
  {
    patterns: ["keyword.other.unit"],
    description: "Unit suffixes, commonly CSS or numeric units."
  },
  {
    patterns: ["keyword"],
    description: "Language keywords."
  },
  {
    patterns: ["meta.diff.header"],
    description: "Diff headers and file metadata in diff content."
  },
  {
    patterns: ["meta.embedded"],
    description: "Embedded language regions inside another language."
  }
];
const DOCUMENTATION_LINKS = [
  {
    label: "Kawaii VS Code Color repository",
    url: "https://github.com/EmmiiChan/kawaii-vscode-color"
  },
  {
    label: "SynthWave '84 upstream",
    url: "https://github.com/robb0wen/synthwave-vscode"
  },
  {
    label: "SynthWave '84 Marketplace",
    url: "https://marketplace.visualstudio.com/items?itemName=RobbOwen.synthwave-vscode"
  },
  {
    label: "Sakura Theme inspiration",
    url: "https://github.com/mhiratani/theme-sakura"
  },
  {
    label: "Nekos.moe site",
    url: "https://nekos.moe"
  },
  {
    label: "Nekos.moe API docs",
    url: "https://docs.nekos.moe/"
  },
  {
    label: "Nekos.moe image routes",
    url: "https://docs.nekos.moe/images.html"
  },
  {
    label: "Random Neko downloader inspiration",
    url: "https://github.com/NyarchLinux/CatgirlDownloader"
  },
  {
    label: "VS Code Color Theme guide",
    url: "https://code.visualstudio.com/api/extension-guides/color-theme"
  },
  {
    label: "VS Code Theme Color reference",
    url: "https://code.visualstudio.com/api/references/theme-color"
  },
  {
    label: "VS Code theme customization",
    url: "https://code.visualstudio.com/docs/configure/themes#_customize-a-color-theme"
  }
];
const CORRUPTION_WARNING_LINKS = [
  {
    label: "VS Code FAQ: Installation appears to be corrupt",
    url: "https://code.visualstudio.com/docs/supporting/faq#_installation-appears-to-be-corrupt-unsupported"
  }
];
const CHECKSUM_FIX_LINK = {
  label: "Open checksum-fix extension",
  url: "https://marketplace.visualstudio.com/items?itemName=iewnfod.vscode-fix-checksums-next-next"
};

let activePanel;
let neonEffectActions = {};
let colorDescriptionReferenceCache;

/**
 * Opens or reveals the Kawaii VS Code Color settings webview.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when the panel has been opened.
 */
async function openSettings(context, actions) {
  neonEffectActions = normalizeNeonEffectActions(actions);

  if (activePanel) {
    activePanel.reveal(vscode.ViewColumn.One);
    await postSettingsState(activePanel, context);
    return;
  }

  activePanel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Kawaii VS Code Color Settings",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: getSettingsWebviewLocalResourceRoots(context)
    }
  );

  activePanel.onDidDispose(
    function disposePanelReference() {
      activePanel = undefined;
    },
    undefined,
    context.subscriptions
  );

  activePanel.webview.onDidReceiveMessage(
    async function receiveSettingsMessage(message) {
      await handleSettingsMessage(activePanel, message, context);
    },
    undefined,
    context.subscriptions
  );

  activePanel.webview.html = getWebviewHtml(activePanel.webview, createSettingsState(context, activePanel.webview));
}

/**
 * Registers Kawaii VS Code Color global state keys that VS Code Settings Sync may synchronize.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {void}
 */
function configureSettingsSync(context) {
  if (
    context
    && context.globalState
    && typeof context.globalState.setKeysForSync === "function"
  ) {
    context.globalState.setKeysForSync([SYNC_SETTINGS_STATE_KEY]);
  }
}

/**
 * Handles a message received from the webview.
 *
 * @param {vscode.WebviewPanel | undefined} panel - Active webview panel.
 * @param {unknown} message - Message payload.
 * @returns {Promise<void>} Completes when the action has been applied.
 */
async function handleSettingsMessage(panel, message, context) {
  if (!panel || !message || typeof message !== "object") {
    return;
  }

  try {
    switch (message.type) {
      case "ready":
      case "refresh":
        await postSettingsState(panel, context);
        return;
      case "open-link":
        await openDocumentationLink(message.url);
        return;
      case "enable-neon":
        await runNeonEffectAction("enableNeon");
        postNeonEffectStatus(panel, "Enable request sent. Follow the VS Code notification to restart the editor.");
        return;
      case "disable-neon":
        await runNeonEffectAction("disableNeon");
        postNeonEffectStatus(panel, "Disable request sent. Follow the VS Code notification to restart the editor.");
        return;
      case "change-theme-variant":
        await changeThemeVariant(message.themeVariantId);
        await postSettingsState(panel, context);
        return;
      case "save-settings-to-vssync":
        await saveSettingsToVsSync(context);
        await postSettingsState(panel, context);
        return;
      case "import-settings-from-vssync":
        if (await importSettingsFromVsSync(context)) {
          await postSettingsState(panel, context);
          postEffectsPendingWarning(panel, "Settings restored from VSSync. Click Apply Effects, then reload VS Code to refresh image-backed effects.");
          return;
        }
        await postSettingsState(panel, context);
        return;
      case "export-settings":
        await exportSettingsBundle(context);
        await postSettingsState(panel, context);
        return;
      case "import-settings":
        if (await importSettingsBundle(context)) {
          await postSettingsState(panel, context);
          postEffectsPendingWarning(panel, "Settings imported. Click Apply Effects, then reload VS Code to refresh image-backed effects.");
          return;
        }
        await postSettingsState(panel, context);
        return;
      case "select-editor-background-image":
        if (await selectEditorBackgroundImage(context)) {
          await postSettingsState(panel, context);
          postEffectsPendingWarning(panel, "Editor background image saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await postSettingsState(panel, context);
        return;
      case "select-random-neko-editor-background-image":
        await selectRandomNekoEditorBackgroundImage(context);
        await postSettingsState(panel, context);
        postEffectsPendingWarning(panel, "Random neko editor background image saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "remove-editor-background-image":
        if (await removeEditorBackgroundImage(context)) {
          await postSettingsState(panel, context);
          postEffectsPendingWarning(panel, "Editor background image removed. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await postSettingsState(panel, context);
        return;
      case "download-editor-background-image":
        await downloadEditorBackgroundImage(context);
        await postSettingsState(panel, context);
        return;
      case "update-editor-background-opacity":
        await updateEditorBackgroundOpacity(context, message.opacity);
        await postSettingsState(panel, context);
        postEffectsPendingWarning(panel, "Editor background opacity saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "update-editor-background-fit":
        await updateEditorBackgroundFit(context, message.fit);
        await postSettingsState(panel, context);
        postEffectsPendingWarning(panel, "Editor background fit area saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "select-empty-editor-logo-image":
        if (await selectEmptyEditorLogoImage(context)) {
          await postSettingsState(panel, context);
          postEffectsPendingWarning(panel, "No-tab logo saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await postSettingsState(panel, context);
        return;
      case "select-random-neko-empty-editor-logo-image":
        await selectRandomNekoEmptyEditorLogoImage(context);
        await postSettingsState(panel, context);
        postEffectsPendingWarning(panel, "Random neko no-tab logo saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "remove-empty-editor-logo-image":
        if (await removeEmptyEditorLogoImage(context)) {
          await postSettingsState(panel, context);
          postEffectsPendingWarning(panel, "No-tab logo removed. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await postSettingsState(panel, context);
        return;
      case "download-empty-editor-logo-image":
        await downloadEmptyEditorLogoImage(context);
        await postSettingsState(panel, context);
        return;
      case "update-empty-editor-logo-opacity":
        await updateEmptyEditorLogoOpacity(context, message.opacity);
        await postSettingsState(panel, context);
        postEffectsPendingWarning(panel, "No-tab logo opacity saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "apply-neon-customizations":
        await updateEditorBackgroundOpacity(context, message.editorBackgroundOpacity);
        await updateEditorBackgroundFit(context, message.editorBackgroundFit);
        await updateEmptyEditorLogoOpacity(context, message.emptyEditorLogoOpacity);
        await applyAllEffects(panel);
        await postSettingsState(panel, context);
        return;
      case "update-color":
        await updateColorCustomization(message.section, message.id, message.value, message.themeVariantId);
        await postSettingsState(panel, context);
        return;
      case "reset-color":
        await resetColorCustomization(message.section, message.id, message.themeVariantId);
        await postSettingsState(panel, context);
        return;
      case "reset-all":
        await resetAllColorCustomizations(message.themeVariantId);
        await postSettingsState(panel, context);
        return;
      default:
        return;
    }
  } catch (error) {
    logSettingsError("handleSettingsMessage", error, { message });
    panel.webview.postMessage({
      type: "error",
      message: getErrorMessage(error)
    });
    vscode.window.showErrorMessage(`Kawaii VS Code Color settings failed: ${getErrorMessage(error)}`);
  }
}

/**
 * Normalizes optional Neon Effect actions passed by the extension host.
 *
 * @param {unknown} actions - Action handlers from the extension entry point.
 * @returns {Record<string, Function>} Normalized action handlers.
 */
function normalizeNeonEffectActions(actions) {
  return actions && typeof actions === "object" ? actions : {};
}

/**
 * Runs one Neon Effect action.
 *
 * @param {string} actionName - Action handler name.
 * @returns {Promise<void>} Completes when the action has been requested.
 */
async function runNeonEffectAction(actionName) {
  const action = neonEffectActions[actionName];

  if (typeof action !== "function") {
    throw new Error(`Neon Effect action is unavailable: ${actionName}`);
  }

  await Promise.resolve(action());
}

/**
 * Applies all CSS-backed Kawaii VS Code Color effects through the Neon Effect patch.
 *
 * @param {vscode.WebviewPanel} panel - Active webview panel.
 * @returns {Promise<void>} Completes when the enable action has been requested.
 */
async function applyAllEffects(panel) {
  await runNeonEffectAction("enableNeon");
  postNeonEffectStatus(panel, "Effects apply request sent. Follow the VS Code notification to restart the editor.");
}

/**
 * Sends a Neon Effect status message to the webview.
 *
 * @param {vscode.WebviewPanel} panel - Active webview panel.
 * @param {string} message - Status message.
 * @returns {void}
 */
function postNeonEffectStatus(panel, message) {
  panel.webview.postMessage({
    type: "neon-status",
    message
  });
}

/**
 * Sends an effects-pending warning to the webview.
 *
 * @param {vscode.WebviewPanel} panel - Active webview panel.
 * @param {string} message - Warning message.
 * @returns {void}
 */
function postEffectsPendingWarning(panel, message) {
  panel.webview.postMessage({
    type: "effects-pending",
    message
  });
}

/**
 * Opens an allow-listed documentation URL in the user's external browser.
 *
 * @param {unknown} url - URL requested by the webview.
 * @returns {Promise<void>} Completes when the URL handling attempt finishes.
 */
async function openDocumentationLink(url) {
  if (typeof url !== "string" || !isDocumentationLinkAllowed(url)) {
    throw new Error(`Unsupported documentation link: ${String(url)}`);
  }

  const opened = await vscode.env.openExternal(vscode.Uri.parse(url));

  if (!opened) {
    vscode.window.showWarningMessage(`Unable to open Kawaii VS Code Color link: ${url}`);
  }
}

/**
 * Checks whether a URL is part of the settings home allow-list.
 *
 * @param {string} url - URL to validate.
 * @returns {boolean} True when the URL is safe to open.
 */
function isDocumentationLinkAllowed(url) {
  return DOCUMENTATION_LINKS
    .concat(CORRUPTION_WARNING_LINKS)
    .concat([CHECKSUM_FIX_LINK])
    .some(function matchDocumentationLink(link) {
      return link.url === url;
    });
}

/**
 * Updates one workbench or syntax token color customization.
 *
 * @param {unknown} section - Customization section.
 * @param {unknown} id - Color identifier.
 * @param {unknown} value - Hex color value.
 * @param {unknown} themeVariantId - Theme variant id.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function updateColorCustomization(section, id, value, themeVariantId) {
  const themeVariant = getThemeVariantById(themeVariantId);
  const colorValue = normalizeHexColor(value);

  if (section === "workbench") {
    await updateWorkbenchColor(String(id), colorValue, themeVariant);
    return;
  }

  if (section === "token") {
    await updateTokenColor(Number(id), colorValue, themeVariant);
    return;
  }

  throw new Error(`Unsupported color settings section: ${String(section)}`);
}

/**
 * Resets one workbench or syntax token color customization.
 *
 * @param {unknown} section - Customization section.
 * @param {unknown} id - Color identifier.
 * @param {unknown} themeVariantId - Theme variant id.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function resetColorCustomization(section, id, themeVariantId) {
  const themeVariant = getThemeVariantById(themeVariantId);

  if (section === "workbench") {
    await resetWorkbenchColor(String(id), themeVariant);
    return;
  }

  if (section === "token") {
    await resetTokenColor(Number(id), themeVariant);
    return;
  }

  throw new Error(`Unsupported color settings section: ${String(section)}`);
}

/**
 * Switches the active VS Code color theme to one Kawaii VS Code Color variant.
 *
 * @param {unknown} themeVariantId - Theme variant id.
 * @returns {Thenable<void>} Completes when VS Code persists the active theme.
 */
function changeThemeVariant(themeVariantId) {
  const themeVariant = getThemeVariantById(themeVariantId);
  return vscode.workspace.getConfiguration().update(COLOR_THEME_SETTING, themeVariant.label, true);
}

/**
 * Updates one workbench color inside the theme-specific user settings block.
 *
 * @param {string} colorId - VS Code workbench color id.
 * @param {string} colorValue - Hex color value.
 * @param {Record<string, string>} themeVariant - Active theme variant.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function updateWorkbenchColor(colorId, colorValue, themeVariant) {
  const theme = readGeneratedTheme(themeVariant);

  if (!theme.colors || !Object.prototype.hasOwnProperty.call(theme.colors, colorId)) {
    throw new Error(`Unknown ${themeVariant.label} workbench color: ${colorId}`);
  }

  const customizations = getSettingsObject(WORKBENCH_CUSTOMIZATIONS_SETTING);
  const themeCustomizations = ensurePlainObject(customizations[getThemeCustomizationKey(themeVariant)]);
  themeCustomizations[colorId] = colorValue;
  customizations[getThemeCustomizationKey(themeVariant)] = themeCustomizations;

  await updateGlobalSetting(WORKBENCH_CUSTOMIZATIONS_SETTING, customizations);
}

/**
 * Resets one workbench color from the theme-specific user settings block.
 *
 * @param {string} colorId - VS Code workbench color id.
 * @param {Record<string, string>} themeVariant - Active theme variant.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function resetWorkbenchColor(colorId, themeVariant) {
  await updateThemeCustomizationSetting(
    WORKBENCH_CUSTOMIZATIONS_SETTING,
    true,
    themeVariant,
    function deleteWorkbenchColor(themeCustomizations) {
      delete themeCustomizations[colorId];
    }
  );

  if (canUpdateWorkspaceSettings()) {
    await updateThemeCustomizationSetting(
      WORKBENCH_CUSTOMIZATIONS_SETTING,
      false,
      themeVariant,
      function deleteWorkspaceWorkbenchColor(themeCustomizations) {
        delete themeCustomizations[colorId];
      }
    );
  }
}

/**
 * Updates one TextMate token foreground override.
 *
 * @param {number} tokenIndex - Token rule index in the generated theme.
 * @param {string} colorValue - Hex color value.
 * @param {Record<string, string>} themeVariant - Active theme variant.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function updateTokenColor(tokenIndex, colorValue, themeVariant) {
  const tokenRule = getGeneratedTokenRule(tokenIndex, themeVariant);

  if (!tokenRule || !tokenRule.scope) {
    throw new Error(`Unknown ${themeVariant.label} token color index: ${tokenIndex}`);
  }

  const customizations = getSettingsObject(TOKEN_CUSTOMIZATIONS_SETTING);
  const themeCustomizations = ensurePlainObject(customizations[getThemeCustomizationKey(themeVariant)]);
  const textMateRules = getTextMateRules(themeCustomizations);
  const customRule = {
    scope: tokenRule.scope,
    settings: {
      foreground: colorValue
    }
  };
  const existingIndex = findMatchingTokenRuleIndex(textMateRules, tokenRule);

  if (existingIndex >= 0) {
    textMateRules[existingIndex] = customRule;
  } else {
    textMateRules.push(customRule);
  }

  themeCustomizations.textMateRules = textMateRules;
  customizations[getThemeCustomizationKey(themeVariant)] = themeCustomizations;

  await updateGlobalSetting(TOKEN_CUSTOMIZATIONS_SETTING, customizations);
}

/**
 * Resets one TextMate token foreground override.
 *
 * @param {number} tokenIndex - Token rule index in the generated theme.
 * @param {Record<string, string>} themeVariant - Active theme variant.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function resetTokenColor(tokenIndex, themeVariant) {
  const tokenRule = getGeneratedTokenRule(tokenIndex, themeVariant);

  if (!tokenRule || !tokenRule.scope) {
    return;
  }

  await deleteTokenColorFromTarget(tokenRule, true, themeVariant);

  if (canUpdateWorkspaceSettings()) {
    await deleteTokenColorFromTarget(tokenRule, false, themeVariant);
  }
}

/**
 * Removes all user color customizations for one Kawaii VS Code Color theme variant.
 *
 * @param {unknown} themeVariantId - Theme variant id.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function resetAllColorCustomizations(themeVariantId) {
  const themeVariant = getThemeVariantById(themeVariantId);

  await removeThemeCustomizationBlock(WORKBENCH_CUSTOMIZATIONS_SETTING, true, themeVariant);
  await removeThemeCustomizationBlock(TOKEN_CUSTOMIZATIONS_SETTING, true, themeVariant);

  if (canUpdateWorkspaceSettings()) {
    await removeThemeCustomizationBlock(WORKBENCH_CUSTOMIZATIONS_SETTING, false, themeVariant);
    await removeThemeCustomizationBlock(TOKEN_CUSTOMIZATIONS_SETTING, false, themeVariant);
  }
}

/**
 * Saves the current Kawaii VS Code Color settings bundle into VS Code synced global state.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when the bundle is stored for Settings Sync.
 */
async function saveSettingsToVsSync(context) {
  const bundle = await createSettingsBundle(context);
  await context.globalState.update(SYNC_SETTINGS_STATE_KEY, bundle);
  vscode.window.showInformationMessage("Kawaii VS Code Color settings saved to VS Code Settings Sync state.");
}

/**
 * Imports the latest Kawaii VS Code Color settings bundle from VS Code synced global state.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when a synced bundle was imported.
 */
async function importSettingsFromVsSync(context) {
  const bundle = context.globalState.get(SYNC_SETTINGS_STATE_KEY);

  if (!bundle) {
    vscode.window.showWarningMessage("No Kawaii VS Code Color settings bundle was found in VS Code Settings Sync state.");
    return false;
  }

  await applySettingsBundle(context, bundle);
  vscode.window.showInformationMessage("Kawaii VS Code Color settings restored from VS Code Settings Sync state.");
  return true;
}

/**
 * Exports the current Kawaii VS Code Color settings bundle to a JSON file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the bundle was exported.
 */
async function exportSettingsBundle(context) {
  const targetUri = await vscode.window.showSaveDialog({
    title: "Export Kawaii VS Code Color settings",
    defaultUri: vscode.Uri.file(path.join(os.homedir(), SETTINGS_EXPORT_FILE_NAME)),
    filters: {
      JSON: ["json"]
    }
  });

  if (!targetUri) {
    return false;
  }

  if (!targetUri.fsPath) {
    throw new Error("Selected export target does not expose a local file path.");
  }

  const bundle = await createSettingsBundle(context);
  await fs.promises.writeFile(targetUri.fsPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  vscode.window.showInformationMessage("Kawaii VS Code Color settings exported.");
  return true;
}

/**
 * Imports a Kawaii VS Code Color settings bundle from a JSON file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when a bundle was imported.
 */
async function importSettingsBundle(context) {
  const selectedUris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    title: "Import Kawaii VS Code Color settings",
    filters: {
      JSON: ["json"]
    }
  });

  if (!selectedUris || selectedUris.length === 0) {
    return false;
  }

  const sourcePath = selectedUris[0].fsPath;

  if (!sourcePath) {
    throw new Error("Selected import file does not expose a local file path.");
  }

  const bundle = JSON.parse(await fs.promises.readFile(sourcePath, "utf8"));
  await applySettingsBundle(context, bundle);
  vscode.window.showInformationMessage("Kawaii VS Code Color settings imported.");
  return true;
}

/**
 * Creates the portable Kawaii VS Code Color settings bundle.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<Record<string, unknown>>} Exportable settings bundle.
 */
async function createSettingsBundle(context) {
  const activeThemeVariant = getActiveThemeVariant();

  return {
    schema: SETTINGS_EXPORT_SCHEMA,
    schemaVersion: SETTINGS_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    activeThemeVariantId: activeThemeVariant.id,
    activeThemeLabel: activeThemeVariant.label,
    extensionConfiguration: getExtensionConfigurationExport(),
    colorCustomizations: getColorCustomizationsExport(),
    effects: await getEffectsExport(context)
  };
}

/**
 * Applies a portable Kawaii VS Code Color settings bundle.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} bundle - Imported bundle.
 * @returns {Promise<void>} Completes when settings are restored.
 */
async function applySettingsBundle(context, bundle) {
  const normalizedBundle = normalizeSettingsBundle(bundle);

  await applyExtensionConfigurationExport(normalizedBundle.extensionConfiguration);
  await applyColorCustomizationsExport(normalizedBundle.colorCustomizations);
  await applyEffectsExport(context, normalizedBundle.effects);

  if (normalizedBundle.activeThemeVariantId) {
    await changeThemeVariant(normalizedBundle.activeThemeVariantId);
  }
}

/**
 * Validates and normalizes an imported settings bundle.
 *
 * @param {unknown} bundle - Candidate bundle.
 * @returns {Record<string, unknown>} Normalized bundle.
 */
function normalizeSettingsBundle(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new Error("Invalid Kawaii VS Code Color settings file.");
  }

  if (![SETTINGS_EXPORT_SCHEMA, LEGACY_SETTINGS_EXPORT_SCHEMA].includes(bundle.schema)) {
    throw new Error("This JSON file is not a Kawaii VS Code Color settings export.");
  }

  if (bundle.schemaVersion !== SETTINGS_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported Kawaii VS Code Color settings version: ${String(bundle.schemaVersion)}`);
  }

  return bundle;
}

/**
 * Reads extension-owned VS Code configuration values.
 *
 * @returns {{brightness: unknown, disableGlow: unknown}} Exported configuration values.
 */
function getExtensionConfigurationExport() {
  return {
    brightness: getConfigurationSettingValue(BRIGHTNESS_SETTING),
    disableGlow: getConfigurationSettingValue(DISABLE_GLOW_SETTING)
  };
}

/**
 * Applies extension-owned VS Code configuration values.
 *
 * @param {unknown} configuration - Exported configuration values.
 * @returns {Promise<void>} Completes when configuration is persisted.
 */
async function applyExtensionConfigurationExport(configuration) {
  const settings = ensurePlainObject(configuration);

  if (Object.prototype.hasOwnProperty.call(settings, "brightness")) {
    await vscode.workspace.getConfiguration().update(
      BRIGHTNESS_SETTING,
      normalizeBrightnessSetting(settings.brightness),
      true
    );
  }

  if (Object.prototype.hasOwnProperty.call(settings, "disableGlow")) {
    await vscode.workspace.getConfiguration().update(
      DISABLE_GLOW_SETTING,
      Boolean(settings.disableGlow),
      true
    );
  }
}

/**
 * Reads a VS Code configuration value, preferring explicit global user settings.
 *
 * @param {string} settingName - Setting name.
 * @returns {unknown} Setting value.
 */
function getConfigurationSettingValue(settingName) {
  const configuration = vscode.workspace.getConfiguration();
  const inspection = typeof configuration.inspect === "function" ? configuration.inspect(settingName) : undefined;

  if (inspection && Object.prototype.hasOwnProperty.call(inspection, "globalValue")) {
    return inspection.globalValue !== undefined
      ? inspection.globalValue
      : configuration.get(settingName);
  }

  return configuration.get(settingName);
}

/**
 * Normalizes imported Neon Effect brightness.
 *
 * @param {unknown} brightness - Candidate brightness.
 * @returns {number} Safe brightness.
 */
function normalizeBrightnessSetting(brightness) {
  const numericBrightness = Number.parseFloat(String(brightness));

  if (!Number.isFinite(numericBrightness)) {
    return 0.45;
  }

  return Number(Math.min(1, Math.max(0, numericBrightness)).toFixed(2));
}

/**
 * Reads Kawaii VS Code Color theme customization blocks from global user settings.
 *
 * @returns {{workbench: Record<string, unknown>, token: Record<string, unknown>}} Exported color blocks.
 */
function getColorCustomizationsExport() {
  return {
    workbench: getThemeCustomizationBlocksExport(WORKBENCH_CUSTOMIZATIONS_SETTING),
    token: getThemeCustomizationBlocksExport(TOKEN_CUSTOMIZATIONS_SETTING)
  };
}

/**
 * Reads all Kawaii VS Code Color theme blocks from one customization setting.
 *
 * @param {string} settingName - VS Code setting name.
 * @returns {Record<string, unknown>} Theme blocks keyed by variant id.
 */
function getThemeCustomizationBlocksExport(settingName) {
  const customizations = getTargetSettingsObject(settingName, true);

  return THEME_VARIANTS.reduce(function reduceThemeBlocks(blocks, themeVariant) {
    blocks[themeVariant.id] = ensurePlainObject(customizations[getThemeCustomizationKey(themeVariant)]);
    return blocks;
  }, {});
}

/**
 * Applies exported Kawaii VS Code Color theme customization blocks to global user settings.
 *
 * @param {unknown} colorCustomizations - Exported color customization blocks.
 * @returns {Promise<void>} Completes when customizations are persisted.
 */
async function applyColorCustomizationsExport(colorCustomizations) {
  const customizations = ensurePlainObject(colorCustomizations);

  await applyThemeCustomizationBlocksExport(
    WORKBENCH_CUSTOMIZATIONS_SETTING,
    ensurePlainObject(customizations.workbench)
  );
  await applyThemeCustomizationBlocksExport(
    TOKEN_CUSTOMIZATIONS_SETTING,
    ensurePlainObject(customizations.token)
  );
}

/**
 * Applies all exported Kawaii VS Code Color theme blocks to one customization setting.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {Record<string, unknown>} blocks - Theme blocks keyed by variant id.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function applyThemeCustomizationBlocksExport(settingName, blocks) {
  const customizations = getTargetSettingsObject(settingName, true);

  THEME_VARIANTS.forEach(function applyThemeBlock(themeVariant) {
    writeThemeCustomizationBlock(
      customizations,
      ensurePlainObject(blocks[themeVariant.id]),
      themeVariant
    );
  });

  await updateGlobalSetting(settingName, customizations);
}

/**
 * Reads image-backed effect settings and image bytes.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<Record<string, unknown>>} Exported effect settings.
 */
async function getEffectsExport(context) {
  return {
    editorBackground: {
      opacity: getStoredEditorBackgroundOpacity(context),
      fit: getStoredEditorBackgroundFit(context),
      image: await getStoredImageExport(context, getStoredEditorBackgroundImageMetadata(context), getEditorBackgroundImagePath)
    },
    emptyEditorLogo: {
      opacity: getStoredEmptyEditorLogoOpacity(context),
      image: await getStoredImageExport(context, getStoredEmptyEditorLogoImageMetadata(context), getEmptyEditorLogoImagePath)
    }
  };
}

/**
 * Reads a stored image into an exportable base64 object.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {{fileName: string, originalName: string, mimeType: string, size: number} | undefined} metadata - Stored image metadata.
 * @param {(context: vscode.ExtensionContext, fileName: string) => string} resolvePath - Stored image path resolver.
 * @returns {Promise<Record<string, unknown> | undefined>} Exported image or undefined.
 */
async function getStoredImageExport(context, metadata, resolvePath) {
  if (!metadata) {
    return undefined;
  }

  const imagePath = resolvePath(context, metadata.fileName);

  if (!fs.existsSync(imagePath)) {
    return undefined;
  }

  const imageBuffer = await fs.promises.readFile(imagePath);
  const extension = getSupportedEditorBackgroundImageExtension(metadata.fileName);

  if (!extension) {
    return undefined;
  }

  return {
    fileName: metadata.fileName,
    originalName: metadata.originalName,
    mimeType: metadata.mimeType,
    extension,
    size: imageBuffer.length,
    dataBase64: imageBuffer.toString("base64")
  };
}

/**
 * Applies image-backed effect settings from an imported bundle.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} effects - Exported effects.
 * @returns {Promise<void>} Completes when effects are restored.
 */
async function applyEffectsExport(context, effects) {
  const exportedEffects = ensurePlainObject(effects);
  const editorBackground = ensurePlainObject(exportedEffects.editorBackground);
  const emptyEditorLogo = ensurePlainObject(exportedEffects.emptyEditorLogo);

  await updateEditorBackgroundOpacity(context, editorBackground.opacity);
  await updateEditorBackgroundFit(context, editorBackground.fit);
  await restoreEditorBackgroundImageExport(context, editorBackground.image);
  await updateEmptyEditorLogoOpacity(context, emptyEditorLogo.opacity);
  await restoreEmptyEditorLogoImageExport(context, emptyEditorLogo.image);
}

/**
 * Restores the editor background image from an exported image object.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} image - Exported image object.
 * @returns {Promise<void>} Completes when the image is restored.
 */
async function restoreEditorBackgroundImageExport(context, image) {
  const imageData = normalizeExportedImage(image);

  if (!imageData) {
    await removeStoredEditorBackgroundImage(context);
    return;
  }

  await storeEditorBackgroundImage(context, imageData);
}

/**
 * Restores the no-tab logo image from an exported image object.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} image - Exported image object.
 * @returns {Promise<void>} Completes when the image is restored.
 */
async function restoreEmptyEditorLogoImageExport(context, image) {
  const imageData = normalizeExportedImage(image);

  if (!imageData) {
    await removeStoredEmptyEditorLogoImage(context);
    return;
  }

  await storeEmptyEditorLogoImage(context, imageData);
}

/**
 * Normalizes an exported image object into storeable image data.
 *
 * @param {unknown} image - Exported image object.
 * @returns {{imageBuffer: Buffer, extension: string, originalName: string, mimeType: string} | undefined} Normalized image data.
 */
function normalizeExportedImage(image) {
  const exportedImage = ensurePlainObject(image);
  const dataBase64 = typeof exportedImage.dataBase64 === "string" ? exportedImage.dataBase64 : "";

  if (!dataBase64) {
    return undefined;
  }

  const extension = normalizeExportedImageExtension(exportedImage.extension || exportedImage.fileName);
  const imageBuffer = Buffer.from(dataBase64, "base64");

  if (imageBuffer.length > EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Imported image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`);
  }

  return {
    imageBuffer,
    extension,
    originalName: getExportedImageOriginalName(exportedImage, extension),
    mimeType: getEditorBackgroundImageMimeType(extension)
  };
}

/**
 * Normalizes the file extension from an exported image object.
 *
 * @param {unknown} extensionSource - Extension or file name.
 * @returns {string} Supported extension.
 */
function normalizeExportedImageExtension(extensionSource) {
  const rawSource = String(extensionSource || "");
  const source = rawSource.includes(".")
    ? rawSource
    : `image.${rawSource}`;
  const extension = getSupportedEditorBackgroundImageExtension(source);

  if (!extension) {
    throw new Error(`Imported image format is unsupported. Use ${EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL}.`);
  }

  return extension;
}

/**
 * Gets a safe display name for an imported image.
 *
 * @param {Record<string, unknown>} exportedImage - Exported image object.
 * @param {string} extension - Image extension.
 * @returns {string} Safe original image name.
 */
function getExportedImageOriginalName(exportedImage, extension) {
  const originalName = path.basename(String(exportedImage.originalName || ""));

  if (originalName && getSupportedEditorBackgroundImageExtension(originalName)) {
    return originalName;
  }

  return `imported-kawaii-vscode-color-image.${extension}`;
}

/**
 * Removes the stored editor background image without user-facing notifications.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when the stored image is absent.
 */
async function removeStoredEditorBackgroundImage(context) {
  const metadata = getStoredEditorBackgroundImageMetadata(context);
  await deleteStoredEditorBackgroundImageFile(context, metadata);
  await context.globalState.update(EDITOR_BACKGROUND_IMAGE_STATE_KEY, undefined);
}

/**
 * Removes the stored no-tab logo image without user-facing notifications.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when the stored image is absent.
 */
async function removeStoredEmptyEditorLogoImage(context) {
  const metadata = getStoredEmptyEditorLogoImageMetadata(context);
  await deleteStoredEmptyEditorLogoImageFile(context, metadata);
  await context.globalState.update(EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY, undefined);
}

/**
 * Opens the system image picker and stores the selected editor background image.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the image metadata and file are stored.
 */
async function selectEditorBackgroundImage(context) {
  const selectedUris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    title: "Select Kawaii VS Code Color editor background image",
    filters: {
      Images: EDITOR_BACKGROUND_ALLOWED_EXTENSIONS
    }
  });

  if (!selectedUris || selectedUris.length === 0) {
    return false;
  }

  const sourceUri = selectedUris[0];
  const sourcePath = sourceUri.fsPath;
  const extension = getSupportedEditorBackgroundImageExtension(sourcePath);

  if (!extension) {
    throw new Error(`Unsupported image format. Use ${EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL}.`);
  }

  const sourceStats = await fs.promises.stat(sourcePath);

  if (sourceStats.size > EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Editor background image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`);
  }

  const imageBuffer = await fs.promises.readFile(sourcePath);
  await storeEditorBackgroundImage(context, {
    imageBuffer,
    extension,
    originalName: path.basename(sourcePath),
    mimeType: getEditorBackgroundImageMimeType(extension)
  });

  vscode.window.showInformationMessage("Kawaii VS Code Color editor background image saved. Click Apply Effects in settings when you are ready to reload.");
  return true;
}

/**
 * Fetches a random non-NSFW neko image from nekos.moe and stores it as editor background input.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the image metadata and file are stored.
 */
async function selectRandomNekoEditorBackgroundImage(context) {
  const nekoImage = await fetchRandomNekoImage();

  await storeEditorBackgroundImage(context, {
    imageBuffer: nekoImage.imageBuffer,
    extension: nekoImage.extension,
    originalName: nekoImage.originalName,
    mimeType: nekoImage.mimeType
  });

  vscode.window.showInformationMessage("Kawaii VS Code Color random neko image saved. Click Apply Effects in settings when you are ready to reload.");
  return true;
}

/**
 * Stores editor background image bytes in extension global storage.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {{imageBuffer: Buffer, extension: string, originalName: string, mimeType: string}} imageData - Image bytes and metadata.
 * @returns {Promise<void>} Completes when the image is stored.
 */
async function storeEditorBackgroundImage(context, imageData) {
  const fileName = `${EDITOR_BACKGROUND_IMAGE_FILE_PREFIX}.${imageData.extension}`;
  const previousMetadata = getStoredEditorBackgroundImageMetadata(context);
  const targetPath = getEditorBackgroundImagePath(context, fileName);

  if (imageData.imageBuffer.length > EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Editor background image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`);
  }

  await ensureGlobalStorageDirectory(context);
  await deleteStoredEditorBackgroundImageFile(context, previousMetadata, fileName);
  await fs.promises.writeFile(targetPath, imageData.imageBuffer);
  await context.globalState.update(EDITOR_BACKGROUND_IMAGE_STATE_KEY, {
    fileName,
    originalName: imageData.originalName,
    mimeType: imageData.mimeType,
    size: imageData.imageBuffer.length,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Fetches a random image metadata object from nekos.moe and downloads the image bytes.
 *
 * @returns {Promise<{imageBuffer: Buffer, extension: string, originalName: string, mimeType: string}>} Downloaded image data.
 */
async function fetchRandomNekoImage() {
  const payload = await requestJson(NEKOS_MOE_RANDOM_IMAGE_ENDPOINT, NETWORK_REDIRECT_LIMIT);
  const image = getRandomNekoImageFromPayload(payload);
  const imageUrl = getRandomNekoImageUrl(image);
  const response = await requestBuffer(imageUrl, EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES, NETWORK_REDIRECT_LIMIT);
  const extension = getImageExtensionFromResponse(response.contentType, imageUrl);
  const mimeType = getEditorBackgroundImageMimeType(extension);
  const originalName = `nekos.moe_${image.id}.${extension}`;

  return {
    imageBuffer: response.body,
    extension,
    originalName,
    mimeType
  };
}

/**
 * Extracts one random neko image object from the API response.
 *
 * @param {unknown} payload - Parsed nekos.moe API response.
 * @returns {{id: string, image_url?: string}} Random image object.
 */
function getRandomNekoImageFromPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.images) || payload.images.length === 0) {
    throw new Error("Nekos.moe returned no images.");
  }

  const image = payload.images[0];

  if (!image || typeof image !== "object" || typeof image.id !== "string" || !image.id) {
    throw new Error("Nekos.moe returned an image without a valid id.");
  }

  return image;
}

/**
 * Builds the image download URL from a nekos.moe image object.
 *
 * @param {{id: string, image_url?: string}} image - Nekos.moe image object.
 * @returns {string} Image download URL.
 */
function getRandomNekoImageUrl(image) {
  if (typeof image.image_url === "string" && image.image_url.startsWith("https://nekos.moe/")) {
    return image.image_url;
  }

  return `${NEKOS_MOE_IMAGE_BASE_URL}${encodeURIComponent(image.id)}`;
}

/**
 * Requests JSON from a URL.
 *
 * @param {string} url - Request URL.
 * @param {number} redirectsRemaining - Remaining redirect attempts.
 * @returns {Promise<unknown>} Parsed JSON response.
 */
async function requestJson(url, redirectsRemaining) {
  const response = await requestBuffer(url, NETWORK_JSON_MAX_BYTES, redirectsRemaining);

  try {
    return JSON.parse(response.body.toString("utf8"));
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${url}: ${getErrorMessage(error)}`);
  }
}

/**
 * Downloads a URL into a buffer with timeout, redirect, and size guards.
 *
 * @param {string} url - Request URL.
 * @param {number} maxBytes - Maximum accepted response size.
 * @param {number} redirectsRemaining - Remaining redirect attempts.
 * @returns {Promise<{body: Buffer, contentType: string}>} Response body and content type.
 */
function requestBuffer(url, maxBytes, redirectsRemaining) {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    return Promise.reject(new Error(`Unsupported request protocol: ${parsedUrl.protocol}`));
  }

  return new Promise(function createRequest(resolve, reject) {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": NEKOS_MOE_USER_AGENT
        },
        timeout: NETWORK_REQUEST_TIMEOUT_MS
      },
      function handleResponse(response) {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();

          if (redirectsRemaining <= 0) {
            reject(new Error(`Too many redirects while requesting ${url}.`));
            return;
          }

          const nextUrl = new URL(location, url).toString();
          requestBuffer(nextUrl, maxBytes, redirectsRemaining - 1).then(resolve, reject);
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(new Error(`Request failed with HTTP ${statusCode} for ${url}.`));
          return;
        }

        const contentLength = Number.parseInt(String(response.headers["content-length"] || "0"), 10);

        if (Number.isFinite(contentLength) && contentLength > maxBytes) {
          response.resume();
          reject(new Error(`Downloaded image must be ${formatFileSize(maxBytes)} or smaller.`));
          return;
        }

        const chunks = [];
        let receivedBytes = 0;

        response.on("data", function handleChunk(chunk) {
          receivedBytes += chunk.length;

          if (receivedBytes > maxBytes) {
            request.destroy(new Error(`Downloaded image must be ${formatFileSize(maxBytes)} or smaller.`));
            return;
          }

          chunks.push(chunk);
        });

        response.on("end", function handleEnd() {
          resolve({
            body: Buffer.concat(chunks),
            contentType: String(response.headers["content-type"] || "")
          });
        });
      }
    );

    request.on("timeout", function handleTimeout() {
      request.destroy(new Error(`Request timed out after ${NETWORK_REQUEST_TIMEOUT_MS} ms: ${url}`));
    });

    request.on("error", reject);
  });
}

/**
 * Resolves a supported image extension from HTTP content type or URL.
 *
 * @param {string} contentType - HTTP content type.
 * @param {string} imageUrl - Download URL.
 * @returns {string} Supported image extension.
 */
function getImageExtensionFromResponse(contentType, imageUrl) {
  const mimeExtension = getSupportedEditorBackgroundImageExtensionFromMimeType(contentType);

  if (mimeExtension) {
    return mimeExtension;
  }

  const urlExtension = getSupportedEditorBackgroundImageExtension(new URL(imageUrl).pathname);

  return urlExtension || "jpg";
}

/**
 * Gets a supported image file extension from a MIME type.
 *
 * @param {string} mimeType - Candidate MIME type.
 * @returns {string | undefined} Supported extension.
 */
function getSupportedEditorBackgroundImageExtensionFromMimeType(mimeType) {
  const normalizedMimeType = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const extension = Object.keys(EDITOR_BACKGROUND_MIME_TYPES).find(function matchMimeType(candidateExtension) {
    return EDITOR_BACKGROUND_MIME_TYPES[candidateExtension] === normalizedMimeType;
  });

  return extension === "jpeg" ? "jpg" : extension;
}

/**
 * Removes the stored editor background image and its metadata.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the stored image metadata is removed.
 */
async function removeEditorBackgroundImage(context) {
  const metadata = getStoredEditorBackgroundImageMetadata(context);

  if (!metadata) {
    return false;
  }

  await deleteStoredEditorBackgroundImageFile(context, metadata);
  await context.globalState.update(EDITOR_BACKGROUND_IMAGE_STATE_KEY, undefined);
  vscode.window.showInformationMessage("Kawaii VS Code Color editor background image removed. Click Apply Effects in settings when you are ready to reload.");
  return true;
}

/**
 * Saves the stored editor background image to a user-selected file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the image is copied to the chosen location.
 */
async function downloadEditorBackgroundImage(context) {
  const metadata = getStoredEditorBackgroundImageMetadata(context);

  if (!metadata) {
    vscode.window.showWarningMessage("No Kawaii VS Code Color editor background image is available to download.");
    return false;
  }

  return downloadStoredImage({
    metadata,
    sourcePath: getEditorBackgroundImagePath(context, metadata.fileName),
    title: "Save Kawaii VS Code Color editor background image",
    emptyMessage: "The stored Kawaii VS Code Color editor background image is missing.",
    successMessage: "Kawaii VS Code Color editor background image saved."
  });
}

/**
 * Stores the editor background image opacity.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} opacity - Opacity value from the settings webview.
 * @returns {Promise<void>} Completes when the opacity is stored.
 */
async function updateEditorBackgroundOpacity(context, opacity) {
  await context.globalState.update(
    EDITOR_BACKGROUND_OPACITY_STATE_KEY,
    normalizeEditorBackgroundOpacity(opacity)
  );
}

/**
 * Stores the editor background image fit area.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} fit - Fit area value from the settings webview.
 * @returns {Promise<void>} Completes when the fit area is stored.
 */
async function updateEditorBackgroundFit(context, fit) {
  await context.globalState.update(
    EDITOR_BACKGROUND_FIT_STATE_KEY,
    normalizeEditorBackgroundFit(fit)
  );
}

/**
 * Opens the system image picker and stores the selected empty editor logo.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the logo metadata and file are stored.
 */
async function selectEmptyEditorLogoImage(context) {
  const selectedUris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    title: "Select Kawaii VS Code Color no-tab logo",
    filters: {
      Images: EDITOR_BACKGROUND_ALLOWED_EXTENSIONS
    }
  });

  if (!selectedUris || selectedUris.length === 0) {
    return false;
  }

  const sourceUri = selectedUris[0];
  const sourcePath = sourceUri.fsPath;
  const extension = getSupportedEditorBackgroundImageExtension(sourcePath);

  if (!extension) {
    throw new Error(`Unsupported logo format. Use ${EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL}.`);
  }

  const sourceStats = await fs.promises.stat(sourcePath);

  if (sourceStats.size > EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`No-tab logo image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`);
  }

  const imageBuffer = await fs.promises.readFile(sourcePath);
  await storeEmptyEditorLogoImage(context, {
    imageBuffer,
    extension,
    originalName: path.basename(sourcePath),
    mimeType: getEditorBackgroundImageMimeType(extension)
  });

  vscode.window.showInformationMessage("Kawaii VS Code Color no-tab logo saved. Click Apply Effects in settings when you are ready to reload.");
  return true;
}

/**
 * Fetches a random non-NSFW neko image from nekos.moe and stores it as no-tab logo input.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the image metadata and file are stored.
 */
async function selectRandomNekoEmptyEditorLogoImage(context) {
  const nekoImage = await fetchRandomNekoImage();

  await storeEmptyEditorLogoImage(context, {
    imageBuffer: nekoImage.imageBuffer,
    extension: nekoImage.extension,
    originalName: nekoImage.originalName,
    mimeType: nekoImage.mimeType
  });

  vscode.window.showInformationMessage("Kawaii VS Code Color random neko no-tab logo saved. Click Apply Effects in settings when you are ready to reload.");
  return true;
}

/**
 * Stores no-tab logo image bytes in extension global storage.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {{imageBuffer: Buffer, extension: string, originalName: string, mimeType: string}} imageData - Image bytes and metadata.
 * @returns {Promise<void>} Completes when the logo is stored.
 */
async function storeEmptyEditorLogoImage(context, imageData) {
  const fileName = `${EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX}.${imageData.extension}`;
  const previousMetadata = getStoredEmptyEditorLogoImageMetadata(context);
  const targetPath = getEmptyEditorLogoImagePath(context, fileName);

  if (imageData.imageBuffer.length > EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`No-tab logo image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`);
  }

  await ensureGlobalStorageDirectory(context);
  await deleteStoredEmptyEditorLogoImageFile(context, previousMetadata, fileName);
  await fs.promises.writeFile(targetPath, imageData.imageBuffer);
  await context.globalState.update(EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY, {
    fileName,
    originalName: imageData.originalName,
    mimeType: imageData.mimeType,
    size: imageData.imageBuffer.length,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Removes the stored empty editor logo and its metadata.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the stored logo metadata is removed.
 */
async function removeEmptyEditorLogoImage(context) {
  const metadata = getStoredEmptyEditorLogoImageMetadata(context);

  if (!metadata) {
    return false;
  }

  await deleteStoredEmptyEditorLogoImageFile(context, metadata);
  await context.globalState.update(EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY, undefined);
  vscode.window.showInformationMessage("Kawaii VS Code Color no-tab logo removed. Click Apply Effects in settings when you are ready to reload.");
  return true;
}

/**
 * Saves the stored no-tab logo image to a user-selected file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the image is copied to the chosen location.
 */
async function downloadEmptyEditorLogoImage(context) {
  const metadata = getStoredEmptyEditorLogoImageMetadata(context);

  if (!metadata) {
    vscode.window.showWarningMessage("No Kawaii VS Code Color no-tab logo is available to download.");
    return false;
  }

  return downloadStoredImage({
    metadata,
    sourcePath: getEmptyEditorLogoImagePath(context, metadata.fileName),
    title: "Save Kawaii VS Code Color no-tab logo",
    emptyMessage: "The stored Kawaii VS Code Color no-tab logo is missing.",
    successMessage: "Kawaii VS Code Color no-tab logo saved."
  });
}

/**
 * Stores the empty editor logo opacity.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} opacity - Opacity value from the settings webview.
 * @returns {Promise<void>} Completes when the opacity is stored.
 */
async function updateEmptyEditorLogoOpacity(context, opacity) {
  await context.globalState.update(
    EMPTY_EDITOR_LOGO_OPACITY_STATE_KEY,
    normalizeEmptyEditorLogoOpacity(opacity)
  );
}

/**
 * Builds editor background image state for the settings webview.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Record<string, unknown>} Editor background settings state.
 */
function getEditorBackgroundState(context, webview) {
  const metadata = getStoredEditorBackgroundImageMetadata(context);
  const fileExists = Boolean(metadata && isEditorBackgroundImageAvailable(context, metadata.fileName));
  const size = metadata && typeof metadata.size === "number" ? metadata.size : 0;

  return {
    hasImage: fileExists,
    missingImage: Boolean(metadata && !fileExists),
    fileName: metadata ? metadata.fileName : "",
    originalName: metadata ? metadata.originalName : "",
    mimeType: metadata ? metadata.mimeType : "",
    size,
    sizeLabel: size > 0 ? formatFileSize(size) : "",
    previewUri: fileExists ? getEditorBackgroundImagePreviewUri(context, metadata.fileName) : "",
    opacity: getStoredEditorBackgroundOpacity(context),
    minOpacity: EDITOR_BACKGROUND_MIN_OPACITY,
    maxOpacity: EDITOR_BACKGROUND_MAX_OPACITY,
    opacityStep: EDITOR_BACKGROUND_OPACITY_STEP,
    fit: getStoredEditorBackgroundFit(context),
    fitOptions: getEditorBackgroundFitOptions(),
    supportedFormats: EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL,
    dataUrlWarning: IMAGE_DATA_URL_WARNING,
    maxImageSizeLabel: formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)
  };
}

/**
 * Builds no-tab logo state for the settings webview.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Record<string, unknown>} Empty editor logo settings state.
 */
function getEmptyEditorLogoState(context, webview) {
  const metadata = getStoredEmptyEditorLogoImageMetadata(context);
  const fileExists = Boolean(metadata && isEmptyEditorLogoImageAvailable(context, metadata.fileName));
  const size = metadata && typeof metadata.size === "number" ? metadata.size : 0;

  return {
    hasImage: fileExists,
    missingImage: Boolean(metadata && !fileExists),
    fileName: metadata ? metadata.fileName : "",
    originalName: metadata ? metadata.originalName : "",
    mimeType: metadata ? metadata.mimeType : "",
    size,
    sizeLabel: size > 0 ? formatFileSize(size) : "",
    previewUri: fileExists ? getEmptyEditorLogoImagePreviewUri(context, metadata.fileName) : "",
    opacity: getStoredEmptyEditorLogoOpacity(context),
    minOpacity: EMPTY_EDITOR_LOGO_MIN_OPACITY,
    maxOpacity: EMPTY_EDITOR_LOGO_MAX_OPACITY,
    opacityStep: EMPTY_EDITOR_LOGO_OPACITY_STEP,
    supportedFormats: EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL,
    dataUrlWarning: IMAGE_DATA_URL_WARNING,
    maxImageSizeLabel: formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)
  };
}

/**
 * Reads stored editor background image metadata.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {{fileName: string, originalName: string, mimeType: string, size: number} | undefined} Stored image metadata.
 */
function getStoredEditorBackgroundImageMetadata(context) {
  const metadata = context.globalState.get(EDITOR_BACKGROUND_IMAGE_STATE_KEY);

  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const fileName = getSafeEditorBackgroundImageFileName(metadata.fileName);

  if (!fileName) {
    return undefined;
  }

  return {
    fileName,
    originalName: typeof metadata.originalName === "string" ? metadata.originalName : fileName,
    mimeType: typeof metadata.mimeType === "string" ? metadata.mimeType : getEditorBackgroundImageMimeType(path.extname(fileName).slice(1)),
    size: typeof metadata.size === "number" ? metadata.size : 0
  };
}

/**
 * Reads stored empty editor logo metadata.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {{fileName: string, originalName: string, mimeType: string, size: number} | undefined} Stored logo metadata.
 */
function getStoredEmptyEditorLogoImageMetadata(context) {
  const metadata = context.globalState.get(EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY);

  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const fileName = getSafeEmptyEditorLogoImageFileName(metadata.fileName);

  if (!fileName) {
    return undefined;
  }

  return {
    fileName,
    originalName: typeof metadata.originalName === "string" ? metadata.originalName : fileName,
    mimeType: typeof metadata.mimeType === "string" ? metadata.mimeType : getEditorBackgroundImageMimeType(path.extname(fileName).slice(1)),
    size: typeof metadata.size === "number" ? metadata.size : 0
  };
}

/**
 * Reads and clamps the stored editor background opacity.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {number} Safe opacity value.
 */
function getStoredEditorBackgroundOpacity(context) {
  return normalizeEditorBackgroundOpacity(context.globalState.get(EDITOR_BACKGROUND_OPACITY_STATE_KEY));
}

/**
 * Reads and normalizes the stored editor background fit area.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {string} Safe fit area id.
 */
function getStoredEditorBackgroundFit(context) {
  return normalizeEditorBackgroundFit(context.globalState.get(EDITOR_BACKGROUND_FIT_STATE_KEY));
}

/**
 * Reads and clamps the stored empty editor logo opacity.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {number} Safe opacity value.
 */
function getStoredEmptyEditorLogoOpacity(context) {
  return normalizeEmptyEditorLogoOpacity(context.globalState.get(EMPTY_EDITOR_LOGO_OPACITY_STATE_KEY));
}

/**
 * Normalizes an opacity value to the supported editor background range.
 *
 * @param {unknown} opacity - Candidate opacity value.
 * @returns {number} Clamped opacity value.
 */
function normalizeEditorBackgroundOpacity(opacity) {
  const numericOpacity = Number.parseFloat(String(opacity));

  if (!Number.isFinite(numericOpacity)) {
    return EDITOR_BACKGROUND_DEFAULT_OPACITY;
  }

  const clampedOpacity = Math.min(
    EDITOR_BACKGROUND_MAX_OPACITY,
    Math.max(EDITOR_BACKGROUND_MIN_OPACITY, numericOpacity)
  );

  return Number(clampedOpacity.toFixed(2));
}

/**
 * Normalizes an editor background fit area id.
 *
 * @param {unknown} fit - Candidate fit area id.
 * @returns {string} Supported fit area id.
 */
function normalizeEditorBackgroundFit(fit) {
  const normalizedFit = String(fit || "")
    .trim()
    .toLowerCase()
    .replace(/^botton/, "bottom");

  return EDITOR_BACKGROUND_FIT_OPTIONS.some(function matchFitOption(option) {
    return option.id === normalizedFit;
  })
    ? normalizedFit
    : EDITOR_BACKGROUND_DEFAULT_FIT;
}

/**
 * Gets the editor background fit area options exposed to the settings UI.
 *
 * @returns {Array<{id: string, label: string, description: string}>} Supported fit area options.
 */
function getEditorBackgroundFitOptions() {
  return EDITOR_BACKGROUND_FIT_OPTIONS.map(function cloneFitOption(option) {
    return Object.assign({}, option);
  });
}

/**
 * Normalizes an opacity value to the supported empty editor logo range.
 *
 * @param {unknown} opacity - Candidate opacity value.
 * @returns {number} Clamped opacity value.
 */
function normalizeEmptyEditorLogoOpacity(opacity) {
  const numericOpacity = Number.parseFloat(String(opacity));

  if (!Number.isFinite(numericOpacity)) {
    return EMPTY_EDITOR_LOGO_DEFAULT_OPACITY;
  }

  const clampedOpacity = Math.min(
    EMPTY_EDITOR_LOGO_MAX_OPACITY,
    Math.max(EMPTY_EDITOR_LOGO_MIN_OPACITY, numericOpacity)
  );

  return Number(clampedOpacity.toFixed(2));
}

/**
 * Ensures the extension global storage directory exists.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when storage is available.
 */
async function ensureGlobalStorageDirectory(context) {
  await fs.promises.mkdir(getGlobalStoragePath(context), { recursive: true });
}

/**
 * Deletes a previously stored editor background image file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {{fileName: string} | undefined} metadata - Stored image metadata.
 * @param {string | undefined} preservedFileName - File name that should not be deleted.
 * @returns {Promise<void>} Completes when the file is absent.
 */
async function deleteStoredEditorBackgroundImageFile(context, metadata, preservedFileName) {
  if (!metadata || !metadata.fileName || metadata.fileName === preservedFileName) {
    return;
  }

  try {
    await fs.promises.unlink(getEditorBackgroundImagePath(context, metadata.fileName));
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      logSettingsError("deleteStoredEditorBackgroundImageFile", error, { fileName: metadata.fileName });
    }
  }
}

/**
 * Deletes a previously stored empty editor logo file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {{fileName: string} | undefined} metadata - Stored logo metadata.
 * @param {string | undefined} preservedFileName - File name that should not be deleted.
 * @returns {Promise<void>} Completes when the file is absent.
 */
async function deleteStoredEmptyEditorLogoImageFile(context, metadata, preservedFileName) {
  if (!metadata || !metadata.fileName || metadata.fileName === preservedFileName) {
    return;
  }

  try {
    await fs.promises.unlink(getEmptyEditorLogoImagePath(context, metadata.fileName));
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      logSettingsError("deleteStoredEmptyEditorLogoImageFile", error, { fileName: metadata.fileName });
    }
  }
}

/**
 * Checks whether the stored editor background image file is present.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {string} fileName - Stored image file name.
 * @returns {boolean} True when the stored image exists.
 */
function isEditorBackgroundImageAvailable(context, fileName) {
  try {
    return fs.existsSync(getEditorBackgroundImagePath(context, fileName));
  } catch (error) {
    logSettingsError("isEditorBackgroundImageAvailable", error, { fileName });
    return false;
  }
}

/**
 * Checks whether the stored empty editor logo file is present.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {string} fileName - Stored logo file name.
 * @returns {boolean} True when the stored logo exists.
 */
function isEmptyEditorLogoImageAvailable(context, fileName) {
  try {
    return fs.existsSync(getEmptyEditorLogoImagePath(context, fileName));
  } catch (error) {
    logSettingsError("isEmptyEditorLogoImageAvailable", error, { fileName });
    return false;
  }
}

/**
 * Resolves a stored editor background image path under extension global storage.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {string} fileName - Stored image file name.
 * @returns {string} Absolute stored image path.
 */
function getEditorBackgroundImagePath(context, fileName) {
  const safeFileName = getSafeEditorBackgroundImageFileName(fileName);

  if (!safeFileName) {
    throw new Error(`Unsafe editor background image file name: ${String(fileName)}`);
  }

  const storageDirectory = path.resolve(getGlobalStoragePath(context));
  const imagePath = path.resolve(storageDirectory, safeFileName);

  if (!imagePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error(`Unsafe editor background image path: ${imagePath}`);
  }

  return imagePath;
}

/**
 * Creates a webview-safe preview data URI for the stored editor background image.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {string} fileName - Stored image file name.
 * @returns {string} Webview-safe image URI.
 */
function getEditorBackgroundImagePreviewUri(context, fileName) {
  const imagePath = getEditorBackgroundImagePath(context, fileName);
  const mimeType = getEditorBackgroundImageMimeType(path.extname(fileName).slice(1));

  return getImagePreviewDataUri(imagePath, mimeType, "getEditorBackgroundImagePreviewUri");
}

/**
 * Resolves a stored empty editor logo path under extension global storage.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {string} fileName - Stored logo file name.
 * @returns {string} Absolute stored logo path.
 */
function getEmptyEditorLogoImagePath(context, fileName) {
  const safeFileName = getSafeEmptyEditorLogoImageFileName(fileName);

  if (!safeFileName) {
    throw new Error(`Unsafe empty editor logo file name: ${String(fileName)}`);
  }

  const storageDirectory = path.resolve(getGlobalStoragePath(context));
  const imagePath = path.resolve(storageDirectory, safeFileName);

  if (!imagePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error(`Unsafe empty editor logo path: ${imagePath}`);
  }

  return imagePath;
}

/**
 * Creates a webview-safe preview data URI for the stored empty editor logo.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {string} fileName - Stored logo file name.
 * @returns {string} Webview-safe image URI.
 */
function getEmptyEditorLogoImagePreviewUri(context, fileName) {
  const imagePath = getEmptyEditorLogoImagePath(context, fileName);
  const mimeType = getEditorBackgroundImageMimeType(path.extname(fileName).slice(1));

  return getImagePreviewDataUri(imagePath, mimeType, "getEmptyEditorLogoImagePreviewUri");
}

/**
 * Reads a stored image as a base64 data URI for settings webview previews.
 *
 * @param {string} imagePath - Absolute image path.
 * @param {string} mimeType - Image MIME type.
 * @param {string} methodName - Caller name for diagnostics.
 * @returns {string} Data URI, or an empty string when the preview cannot be read.
 */
function getImagePreviewDataUri(imagePath, mimeType, methodName) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
  } catch (error) {
    logSettingsError(methodName, error, { imagePath, mimeType });
    return "";
  }
}

/**
 * Copies a stored customization image to a save location chosen by the user.
 *
 * @param {{metadata: {fileName: string, originalName: string}, sourcePath: string, title: string, emptyMessage: string, successMessage: string}} options - Download options.
 * @returns {Promise<boolean>} True when the file was saved.
 */
async function downloadStoredImage(options) {
  if (!fs.existsSync(options.sourcePath)) {
    vscode.window.showWarningMessage(options.emptyMessage);
    return false;
  }

  const targetUri = await vscode.window.showSaveDialog({
    title: options.title,
    defaultUri: getImageDownloadDefaultUri(options.metadata),
    filters: {
      Images: EDITOR_BACKGROUND_ALLOWED_EXTENSIONS
    }
  });

  if (!targetUri) {
    return false;
  }

  if (!targetUri.fsPath) {
    throw new Error("Selected save target does not expose a local file path.");
  }

  if (path.resolve(targetUri.fsPath) === path.resolve(options.sourcePath)) {
    vscode.window.showInformationMessage(options.successMessage);
    return true;
  }

  await fs.promises.copyFile(options.sourcePath, targetUri.fsPath);
  vscode.window.showInformationMessage(options.successMessage);
  return true;
}

/**
 * Builds the default save URI for a stored customization image.
 *
 * @param {{fileName: string, originalName: string}} metadata - Stored image metadata.
 * @returns {vscode.Uri} Default save URI.
 */
function getImageDownloadDefaultUri(metadata) {
  const fileName = getImageDownloadFileName(metadata);
  return vscode.Uri.file(path.join(os.homedir(), fileName));
}

/**
 * Gets the safest visible file name for image download.
 *
 * @param {{fileName: string, originalName: string}} metadata - Stored image metadata.
 * @returns {string} Download file name.
 */
function getImageDownloadFileName(metadata) {
  const originalName = path.basename(String(metadata.originalName || ""));

  if (originalName && getSupportedEditorBackgroundImageExtension(originalName)) {
    return originalName;
  }

  return metadata.fileName;
}

/**
 * Gets the extension global storage path with a fallback for older VS Code APIs.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {string} Global storage path.
 */
function getGlobalStoragePath(context) {
  if (context.globalStorageUri && context.globalStorageUri.fsPath) {
    return context.globalStorageUri.fsPath;
  }

  if (context.globalStoragePath) {
    return context.globalStoragePath;
  }

  throw new Error("VS Code extension global storage path is unavailable.");
}

/**
 * Gets local resource roots allowed in the settings webview.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {vscode.Uri[]} Webview local resource roots.
 */
function getSettingsWebviewLocalResourceRoots(context) {
  const roots = [];

  if (context.extensionUri) {
    roots.push(context.extensionUri);
  } else if (context.extensionPath) {
    roots.push(vscode.Uri.file(context.extensionPath));
  }

  if (context.globalStorageUri) {
    roots.push(context.globalStorageUri);
  } else if (context.globalStoragePath) {
    roots.push(vscode.Uri.file(context.globalStoragePath));
  }

  return roots;
}

/**
 * Normalizes a stored editor background image file name.
 *
 * @param {unknown} fileName - Candidate file name.
 * @returns {string | undefined} Safe file name.
 */
function getSafeEditorBackgroundImageFileName(fileName) {
  const normalizedFileName = String(fileName || "");

  if (
    !normalizedFileName
    || path.basename(normalizedFileName) !== normalizedFileName
    || !normalizedFileName.startsWith(`${EDITOR_BACKGROUND_IMAGE_FILE_PREFIX}.`)
  ) {
    return undefined;
  }

  return normalizedFileName;
}

/**
 * Normalizes a stored empty editor logo file name.
 *
 * @param {unknown} fileName - Candidate file name.
 * @returns {string | undefined} Safe file name.
 */
function getSafeEmptyEditorLogoImageFileName(fileName) {
  const normalizedFileName = String(fileName || "");

  if (
    !normalizedFileName
    || path.basename(normalizedFileName) !== normalizedFileName
    || !normalizedFileName.startsWith(`${EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX}.`)
  ) {
    return undefined;
  }

  return normalizedFileName;
}

/**
 * Gets a supported image file extension from a file path.
 *
 * @param {string} filePath - Source file path.
 * @returns {string | undefined} Supported lowercase extension.
 */
function getSupportedEditorBackgroundImageExtension(filePath) {
  const extension = path.extname(filePath).slice(1).toLowerCase();

  return EDITOR_BACKGROUND_ALLOWED_EXTENSIONS.includes(extension) ? extension : undefined;
}

/**
 * Gets the MIME type for a supported editor background image extension.
 *
 * @param {string} extension - Image file extension.
 * @returns {string} Image MIME type.
 */
function getEditorBackgroundImageMimeType(extension) {
  return EDITOR_BACKGROUND_MIME_TYPES[String(extension || "").toLowerCase()] || "application/octet-stream";
}

/**
 * Formats a byte count for compact settings UI display.
 *
 * @param {number} bytes - Byte count.
 * @returns {string} Human-readable file size.
 */
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kibibytes = bytes / 1024;

  if (kibibytes < 1024) {
    return `${kibibytes.toFixed(1)} KB`;
  }

  return `${(kibibytes / 1024).toFixed(1)} MB`;
}

/**
 * Builds and posts the current settings state to the webview.
 *
 * @param {vscode.WebviewPanel} panel - Active webview panel.
 * @returns {Promise<void>} Completes when the state is posted.
 */
async function postSettingsState(panel, context) {
  panel.webview.postMessage({
    type: "state",
    state: createSettingsState(context, panel.webview)
  });
}

/**
 * Creates all data needed by the webview.
 *
 * @returns {Record<string, unknown>} Webview state.
 */
function createSettingsState(context, webview) {
  const activeThemeVariant = getActiveThemeVariant();
  const theme = readGeneratedTheme(activeThemeVariant);
  const workbenchCustomizations = getThemeCustomizationBlock(WORKBENCH_CUSTOMIZATIONS_SETTING, activeThemeVariant);
  const tokenCustomizations = getThemeCustomizationBlock(TOKEN_CUSTOMIZATIONS_SETTING, activeThemeVariant);
  const textMateRules = getTextMateRules(tokenCustomizations);
  const colorDescriptionReference = getColorDescriptionReference();

  const workbenchColors = Object.keys(theme.colors || {})
    .sort()
    .map(function mapWorkbenchColor(colorId) {
      const defaultValue = theme.colors[colorId];
      const customValue = workbenchCustomizations[colorId];
      const value = typeof customValue === "string" ? customValue : defaultValue;

      return {
        id: colorId,
        label: colorId,
        group: getWorkbenchColorGroup(colorId),
        defaultValue,
        description: getWorkbenchColorDescription(colorId, colorDescriptionReference),
        value,
        customized: typeof customValue === "string"
      };
    });

  const tokenColors = (theme.tokenColors || [])
    .map(function mapTokenColor(tokenRule, index) {
      if (!tokenRule || !tokenRule.settings || typeof tokenRule.settings.foreground !== "string" || !tokenRule.scope) {
        return undefined;
      }

      const customRule = findMatchingTokenRule(textMateRules, tokenRule);
      const customValue = customRule && customRule.settings && customRule.settings.foreground;
      const defaultValue = tokenRule.settings.foreground;
      const label = tokenRule.name || stringifyScope(tokenRule.scope);
      const scope = stringifyScope(tokenRule.scope);

      return {
        id: index,
        label,
        scope,
        defaultValue,
        description: getTokenColorDescription(label, scope, colorDescriptionReference),
        value: typeof customValue === "string" ? customValue : defaultValue,
        customized: typeof customValue === "string"
      };
    })
    .filter(Boolean);

  return {
    themeLabel: activeThemeVariant.label,
    activeThemeVariantId: activeThemeVariant.id,
    themeVariants: getThemeVariantOptions(),
    documentationLinks: DOCUMENTATION_LINKS,
    corruptionWarningLinks: CORRUPTION_WARNING_LINKS,
    checksumFixLink: CHECKSUM_FIX_LINK,
    editorBackground: getEditorBackgroundState(context, webview),
    emptyEditorLogo: getEmptyEditorLogoState(context, webview),
    workbenchColors,
    tokenColors,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Reads the generated theme JSON file.
 *
 * @param {Record<string, string>} themeVariant - Active theme variant.
 * @returns {Record<string, unknown>} Parsed generated theme.
 */
function readGeneratedTheme(themeVariant) {
  return JSON.parse(fs.readFileSync(themeVariant.generatedThemePath, "utf8"));
}

/**
 * Reads the local color scheme reference used to describe settings rows.
 *
 * @returns {{workbench: Record<string, string>, tokens: Record<string, string>}} Parsed description maps.
 */
function getColorDescriptionReference() {
  if (!colorDescriptionReferenceCache) {
    colorDescriptionReferenceCache = readColorDescriptionReference();
  }

  return colorDescriptionReferenceCache;
}

/**
 * Reads and parses color descriptions from the Codex reference document.
 *
 * @returns {{workbench: Record<string, string>, tokens: Record<string, string>}} Parsed description maps.
 */
function readColorDescriptionReference() {
  try {
    const markdown = fs.readFileSync(COLOR_SCHEME_REFERENCE_PATH, "utf8");

    return {
      workbench: parseColorReferenceTable(markdown, "Workbench And Editor UI Colors", 0, 2),
      tokens: parseColorReferenceTable(markdown, "Syntax Token Colors", 0, 3)
    };
  } catch (error) {
    logSettingsError("readColorDescriptionReference", error, { path: COLOR_SCHEME_REFERENCE_PATH });

    return {
      workbench: {},
      tokens: {}
    };
  }
}

/**
 * Parses one markdown table section into a description map.
 *
 * @param {string} markdown - Source markdown content.
 * @param {string} heading - Section heading without leading hashes.
 * @param {number} keyColumnIndex - Column containing the lookup key.
 * @param {number} descriptionColumnIndex - Column containing the description.
 * @returns {Record<string, string>} Parsed descriptions by key.
 */
function parseColorReferenceTable(markdown, heading, keyColumnIndex, descriptionColumnIndex) {
  const section = getMarkdownSection(markdown, heading);
  const descriptions = {};

  section.split(/\r?\n/).forEach(function parseMarkdownRow(line) {
    const columns = line.split("|").slice(1, -1).map(normalizeMarkdownTableCell);
    const key = columns[keyColumnIndex];
    const description = columns[descriptionColumnIndex];

    if (!key || !description || key === "---" || description === "---" || key === "Property" || key === "Rule") {
      return;
    }

    descriptions[key] = description;
  });

  return descriptions;
}

/**
 * Gets one top-level markdown section by heading.
 *
 * @param {string} markdown - Source markdown content.
 * @param {string} heading - Section heading without leading hashes.
 * @returns {string} Matching section content.
 */
function getMarkdownSection(markdown, heading) {
  const headingText = `## ${heading}`;
  const startIndex = markdown.indexOf(headingText);

  if (startIndex < 0) {
    return "";
  }

  const nextHeadingIndex = markdown.indexOf("\n## ", startIndex + headingText.length);

  return markdown.slice(startIndex, nextHeadingIndex < 0 ? markdown.length : nextHeadingIndex);
}

/**
 * Normalizes one markdown table cell.
 *
 * @param {string} cell - Raw table cell value.
 * @returns {string} Clean text content.
 */
function normalizeMarkdownTableCell(cell) {
  const trimmedCell = String(cell || "").trim();

  if (
    trimmedCell.length >= 2
    && trimmedCell.startsWith(MARKDOWN_CODE_FENCE_CHARACTER)
    && trimmedCell.endsWith(MARKDOWN_CODE_FENCE_CHARACTER)
  ) {
    return trimmedCell.slice(1, -1);
  }

  return trimmedCell;
}

/**
 * Gets a description for one workbench color id.
 *
 * @param {string} colorId - VS Code workbench color id.
 * @param {{workbench: Record<string, string>}} colorDescriptionReference - Parsed description reference.
 * @returns {string} Human-readable color description.
 */
function getWorkbenchColorDescription(colorId, colorDescriptionReference) {
  return colorDescriptionReference.workbench[colorId] || getGeneratedWorkbenchColorDescription(colorId);
}

/**
 * Gets a fallback description for one workbench color id.
 *
 * @param {string} colorId - VS Code workbench color id.
 * @returns {string} Human-readable fallback description.
 */
function getGeneratedWorkbenchColorDescription(colorId) {
  const readableColorId = colorId
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();

  return `Controls the ${readableColorId} color in VS Code.`;
}

/**
 * Gets a description for one syntax token color rule.
 *
 * @param {string} label - Token rule label.
 * @param {string} scope - TextMate scope selector.
 * @param {{tokens: Record<string, string>}} colorDescriptionReference - Parsed description reference.
 * @returns {string} Human-readable token description.
 */
function getTokenColorDescription(label, scope, colorDescriptionReference) {
  return colorDescriptionReference.tokens[label]
    || colorDescriptionReference.tokens[scope]
    || getGeneratedTokenColorDescription(scope);
}

/**
 * Gets a fallback description for one TextMate scope selector.
 *
 * @param {string} scope - TextMate scope selector.
 * @returns {string} Human-readable fallback description.
 */
function getGeneratedTokenColorDescription(scope) {
  const normalizedScope = String(scope || "").toLowerCase();
  const matchingRule = TOKEN_DESCRIPTION_RULES.find(function findMatchingTokenDescription(rule) {
    return rule.patterns.some(function matchPattern(pattern) {
      return normalizedScope.includes(pattern);
    });
  });

  if (matchingRule) {
    return matchingRule.description;
  }

  return `Syntax foreground for TextMate scope: ${scope}.`;
}

/**
 * Gets one generated token rule by index.
 *
 * @param {number} tokenIndex - Token rule index.
 * @param {Record<string, string>} themeVariant - Active theme variant.
 * @returns {Record<string, unknown> | undefined} Token rule.
 */
function getGeneratedTokenRule(tokenIndex, themeVariant) {
  const theme = readGeneratedTheme(themeVariant);
  const tokenColors = Array.isArray(theme.tokenColors) ? theme.tokenColors : [];

  return tokenColors[tokenIndex];
}

/**
 * Gets the current Kawaii VS Code Color theme variant from VS Code settings.
 *
 * @returns {Record<string, string>} Active theme variant.
 */
function getActiveThemeVariant() {
  const activeThemeLabel = vscode.workspace.getConfiguration().get(COLOR_THEME_SETTING);
  const matchingThemeVariant = THEME_VARIANTS.find(function matchThemeVariant(themeVariant) {
    return themeVariant.label === activeThemeLabel;
  });

  return matchingThemeVariant || getThemeVariantById(DEFAULT_THEME_VARIANT_ID);
}

/**
 * Gets a known theme variant by id.
 *
 * @param {unknown} themeVariantId - Theme variant id.
 * @returns {Record<string, string>} Matching theme variant.
 */
function getThemeVariantById(themeVariantId) {
  if (themeVariantId === undefined || themeVariantId === null || themeVariantId === "") {
    return getActiveThemeVariant();
  }

  const matchingThemeVariant = THEME_VARIANTS.find(function matchThemeVariant(themeVariant) {
    return themeVariant.id === themeVariantId;
  });

  if (!matchingThemeVariant) {
    throw new Error(`Unsupported Kawaii VS Code Color theme variant: ${String(themeVariantId)}`);
  }

  return matchingThemeVariant;
}

/**
 * Gets the VS Code theme-specific customization key for one variant.
 *
 * @param {Record<string, string>} themeVariant - Theme variant.
 * @returns {string} Theme-specific customization key.
 */
function getThemeCustomizationKey(themeVariant) {
  return `[${themeVariant.label}]`;
}

/**
 * Gets lightweight theme variant options for the settings webview.
 *
 * @returns {Record<string, string>[]} Theme options.
 */
function getThemeVariantOptions() {
  return THEME_VARIANTS.map(function mapThemeVariant(themeVariant) {
    return {
      id: themeVariant.id,
      label: themeVariant.label,
      modeLabel: themeVariant.modeLabel
    };
  });
}

/**
 * Reads a settings object safely.
 *
 * @param {string} settingName - VS Code setting name.
 * @returns {Record<string, unknown>} Settings object.
 */
function getSettingsObject(settingName) {
  return clonePlainObject(vscode.workspace.getConfiguration().get(settingName));
}

/**
 * Reads a target-specific settings object safely.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {boolean} isGlobalTarget - True for user settings, false for workspace settings.
 * @returns {Record<string, unknown>} Settings object.
 */
function getTargetSettingsObject(settingName, isGlobalTarget) {
  const configuration = vscode.workspace.getConfiguration();
  const inspection = typeof configuration.inspect === "function" ? configuration.inspect(settingName) : undefined;
  const targetValue = isGlobalTarget
    ? inspection && inspection.globalValue
    : inspection && inspection.workspaceValue;

  return clonePlainObject(targetValue);
}

/**
 * Reads the Kawaii VS Code Color variant block from a settings object.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {Record<string, string>} themeVariant - Theme variant.
 * @returns {Record<string, unknown>} Theme-specific customization block.
 */
function getThemeCustomizationBlock(settingName, themeVariant) {
  const customizations = getSettingsObject(settingName);
  return ensurePlainObject(customizations[getThemeCustomizationKey(themeVariant)]);
}

/**
 * Updates a global/user VS Code setting.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {Record<string, unknown>} value - Setting value.
 * @returns {Thenable<void>} Completes when VS Code persists the setting.
 */
function updateGlobalSetting(settingName, value) {
  return updateSetting(settingName, value, true);
}

/**
 * Updates a target-specific VS Code setting.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {Record<string, unknown>} value - Setting value.
 * @param {boolean} isGlobalTarget - True for user settings, false for workspace settings.
 * @returns {Thenable<void>} Completes when VS Code persists the setting.
 */
function updateSetting(settingName, value, isGlobalTarget) {
  const nextValue = Object.keys(value).length > 0 ? value : undefined;
  return vscode.workspace.getConfiguration().update(settingName, nextValue, isGlobalTarget);
}

/**
 * Mutates one Kawaii VS Code Color variant customization block in one settings target.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {boolean} isGlobalTarget - True for user settings, false for workspace settings.
 * @param {Record<string, string>} themeVariant - Theme variant.
 * @param {(themeCustomizations: Record<string, unknown>) => void} mutateThemeCustomizations - Mutation callback.
 * @returns {Thenable<void>} Completes when VS Code persists the setting.
 */
function updateThemeCustomizationSetting(settingName, isGlobalTarget, themeVariant, mutateThemeCustomizations) {
  const customizations = getTargetSettingsObject(settingName, isGlobalTarget);
  const themeCustomizations = ensurePlainObject(customizations[getThemeCustomizationKey(themeVariant)]);

  mutateThemeCustomizations(themeCustomizations);
  writeThemeCustomizationBlock(customizations, themeCustomizations, themeVariant);

  return updateSetting(settingName, customizations, isGlobalTarget);
}

/**
 * Removes the whole Kawaii VS Code Color variant customization block from one settings target.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {boolean} isGlobalTarget - True for user settings, false for workspace settings.
 * @param {Record<string, string>} themeVariant - Theme variant.
 * @returns {Thenable<void>} Completes when VS Code persists the setting.
 */
function removeThemeCustomizationBlock(settingName, isGlobalTarget, themeVariant) {
  const customizations = getTargetSettingsObject(settingName, isGlobalTarget);

  delete customizations[getThemeCustomizationKey(themeVariant)];

  return updateSetting(settingName, customizations, isGlobalTarget);
}

/**
 * Removes one token color rule from one settings target.
 *
 * @param {Record<string, unknown>} tokenRule - Generated token rule.
 * @param {boolean} isGlobalTarget - True for user settings, false for workspace settings.
 * @param {Record<string, string>} themeVariant - Theme variant.
 * @returns {Thenable<void>} Completes when VS Code persists the setting.
 */
function deleteTokenColorFromTarget(tokenRule, isGlobalTarget, themeVariant) {
  return updateThemeCustomizationSetting(
    TOKEN_CUSTOMIZATIONS_SETTING,
    isGlobalTarget,
    themeVariant,
    function deleteTokenColor(themeCustomizations) {
      const textMateRules = getTextMateRules(themeCustomizations);
      const existingIndex = findMatchingTokenRuleIndex(textMateRules, tokenRule);

      if (existingIndex >= 0) {
        textMateRules.splice(existingIndex, 1);
      }

      if (textMateRules.length > 0) {
        themeCustomizations.textMateRules = textMateRules;
      } else {
        delete themeCustomizations.textMateRules;
      }
    }
  );
}

/**
 * Checks whether workspace settings can be written in the current window.
 *
 * @returns {boolean} True when a workspace settings target exists.
 */
function canUpdateWorkspaceSettings() {
  return Boolean(
    vscode.workspace.workspaceFile
    || (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0)
  );
}

/**
 * Writes or removes one Kawaii VS Code Color variant block in a customization object.
 *
 * @param {Record<string, unknown>} customizations - Settings object.
 * @param {Record<string, unknown>} themeCustomizations - Theme-specific block.
 * @param {Record<string, string>} themeVariant - Theme variant.
 * @returns {void}
 */
function writeThemeCustomizationBlock(customizations, themeCustomizations, themeVariant) {
  const themeCustomizationKey = getThemeCustomizationKey(themeVariant);

  if (Object.keys(themeCustomizations).length > 0) {
    customizations[themeCustomizationKey] = themeCustomizations;
    return;
  }

  delete customizations[themeCustomizationKey];
}

/**
 * Returns a cloned plain object or a new object when the value is invalid.
 *
 * @param {unknown} value - Value to normalize.
 * @returns {Record<string, unknown>} Plain object.
 */
function clonePlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    logSettingsError("clonePlainObject", error, { valueType: typeof value });
    return {};
  }
}

/**
 * Returns a plain object or an empty object.
 *
 * @param {unknown} value - Value to normalize.
 * @returns {Record<string, unknown>} Plain object.
 */
function ensurePlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? clonePlainObject(value) : {};
}

/**
 * Gets TextMate customization rules from a theme customization block.
 *
 * @param {Record<string, unknown>} themeCustomizations - Theme-specific token customizations.
 * @returns {Record<string, unknown>[]} TextMate rules.
 */
function getTextMateRules(themeCustomizations) {
  return Array.isArray(themeCustomizations.textMateRules)
    ? themeCustomizations.textMateRules.filter(function filterRule(rule) {
        return rule && typeof rule === "object" && !Array.isArray(rule);
      })
    : [];
}

/**
 * Finds a matching custom TextMate rule.
 *
 * @param {Record<string, unknown>[]} textMateRules - Custom TextMate rules.
 * @param {Record<string, unknown>} tokenRule - Generated token rule.
 * @returns {Record<string, unknown> | undefined} Matching rule.
 */
function findMatchingTokenRule(textMateRules, tokenRule) {
  const index = findMatchingTokenRuleIndex(textMateRules, tokenRule);
  return index >= 0 ? textMateRules[index] : undefined;
}

/**
 * Finds the index of a matching custom TextMate rule.
 *
 * @param {Record<string, unknown>[]} textMateRules - Custom TextMate rules.
 * @param {Record<string, unknown>} tokenRule - Generated token rule.
 * @returns {number} Matching index, or -1.
 */
function findMatchingTokenRuleIndex(textMateRules, tokenRule) {
  return textMateRules.findIndex(function matchTokenRule(customRule) {
    return areScopesEqual(customRule.scope, tokenRule.scope);
  });
}

/**
 * Compares TextMate scope definitions.
 *
 * @param {unknown} leftScope - First scope.
 * @param {unknown} rightScope - Second scope.
 * @returns {boolean} True when both scopes are equal.
 */
function areScopesEqual(leftScope, rightScope) {
  return stringifyScope(leftScope) === stringifyScope(rightScope);
}

/**
 * Converts a TextMate scope value to a stable string.
 *
 * @param {unknown} scope - TextMate scope.
 * @returns {string} Stable scope string.
 */
function stringifyScope(scope) {
  if (Array.isArray(scope)) {
    return scope.join(", ");
  }

  return typeof scope === "string" ? scope : "";
}

/**
 * Validates and normalizes a hex color.
 *
 * @param {unknown} value - Color value.
 * @returns {string} Normalized color value.
 */
function normalizeHexColor(value) {
  if (typeof value !== "string") {
    throw new Error("Color value must be a hex string.");
  }

  const trimmedValue = value.trim();

  if (!COLOR_HEX_PATTERN.test(trimmedValue)) {
    throw new Error("Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.");
  }

  return trimmedValue;
}

/**
 * Groups workbench color ids for the settings UI.
 *
 * @param {string} colorId - Workbench color id.
 * @returns {string} Group label.
 */
function getWorkbenchColorGroup(colorId) {
  if (colorId.startsWith("editor")) {
    return "Editor";
  }

  if (colorId.startsWith("terminal")) {
    return "Terminal";
  }

  if (colorId.startsWith("activityBar") || colorId.startsWith("sideBar") || colorId.startsWith("titleBar")) {
    return "Workbench";
  }

  if (colorId.startsWith("list") || colorId.startsWith("menu") || colorId.startsWith("menubar")) {
    return "Lists And Menus";
  }

  if (colorId.startsWith("git") || colorId.startsWith("diff") || colorId.startsWith("minimap")) {
    return "Source Control";
  }

  return "Other";
}

/**
 * Returns the full webview HTML document.
 *
 * @param {vscode.Webview} webview - VS Code webview.
 * @param {Record<string, unknown>} initialState - Initial UI state.
 * @returns {string} HTML document.
 */
function getWebviewHtml(webview, initialState) {
  const nonce = createNonce();
  const serializedState = JSON.stringify(initialState).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource || "vscode-resource:"} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kawaii VS Code Color Settings</title>
  <style>
    :root {
      --panel-gap: 12px;
      --control-height: 30px;
      --border-color: var(--vscode-editorWidget-border);
      --muted-color: var(--vscode-descriptionForeground);
      --panel-bg: var(--vscode-editor-background);
      --row-bg: var(--vscode-editorWidget-background);
      --accent: var(--vscode-textLink-foreground);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--vscode-foreground);
      background: var(--panel-bg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .app {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
    }

    .sidebar {
      min-height: 100vh;
      padding: 14px 10px;
      background: var(--vscode-sideBar-background);
      border-right: 1px solid var(--border-color);
    }

    .brand {
      padding: 0 8px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .brand-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
    }

    .brand-subtitle {
      margin: 4px 0 0;
      color: var(--muted-color);
      font-size: 12px;
    }

    .nav {
      display: grid;
      gap: 4px;
      margin-top: 12px;
    }

    .nav-group {
      margin: 12px 8px 4px;
      color: var(--muted-color);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .nav-button {
      width: 100%;
      min-height: var(--control-height);
      padding: 6px 8px;
      color: var(--vscode-sideBar-foreground);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      text-align: left;
      cursor: pointer;
    }

    .nav-button:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .nav-button.active {
      color: var(--vscode-list-activeSelectionForeground);
      background: var(--vscode-list-activeSelectionBackground);
      border-color: var(--vscode-focusBorder);
    }

    .workspace {
      min-width: 0;
      min-height: 100vh;
      background: var(--panel-bg);
    }

    .page {
      min-height: 100vh;
    }

    .hidden {
      display: none !important;
    }

    .home {
      max-width: 860px;
      padding: 28px;
    }

    .home-label {
      margin: 0 0 6px;
      color: var(--muted-color);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .home-title {
      margin: 0 0 10px;
      font-size: 24px;
      line-height: 1.2;
    }

    .home-text {
      margin: 0 0 18px;
      color: var(--vscode-foreground);
      line-height: 1.5;
    }

    .home-section {
      margin-top: 24px;
    }

    .home-section-title {
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--muted-color);
    }

    .link-list {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .link-button {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      min-height: 38px;
      padding: 8px 10px;
      overflow: hidden;
      color: var(--vscode-textLink-foreground);
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      text-align: left;
      cursor: pointer;
    }

    .link-button:hover {
      color: var(--vscode-textLink-activeForeground);
      border-color: var(--vscode-focusBorder);
    }

    .link-label {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .link-url {
      display: block;
      width: 100%;
      min-width: 0;
      margin-top: 2px;
      overflow: hidden;
      color: var(--muted-color);
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .neon-effect {
      max-width: 860px;
      min-width: 0;
      padding: 28px;
    }

    .neon-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0;
    }

    .disclaimer {
      min-width: 0;
      max-width: 100%;
      padding: 14px;
      color: var(--vscode-editorWarning-foreground, var(--vscode-foreground));
      background: var(--vscode-inputValidation-warningBackground, var(--vscode-editorWidget-background));
      border: 1px solid var(--vscode-inputValidation-warningBorder, var(--border-color));
      border-radius: 6px;
      overflow-wrap: anywhere;
    }

    .disclaimer-title {
      margin: 0 0 8px;
      font-weight: 700;
    }

    .disclaimer-list {
      margin: 0;
      padding-left: 18px;
      line-height: 1.5;
    }

    .workaround {
      margin-top: 18px;
      min-width: 0;
      max-width: 100%;
      padding: 14px;
      overflow: hidden;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow-wrap: anywhere;
    }

    .workaround-steps {
      display: grid;
      gap: 8px;
      margin: 0 0 14px;
      line-height: 1.5;
    }

    .workaround-step {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 6px;
    }

    .workaround-index {
      font-weight: 700;
      text-align: right;
    }

    .workaround-detail {
      min-width: 0;
    }

    .workaround-inline-link {
      display: grid;
      gap: 8px;
      margin-top: 8px;
      min-width: 0;
    }

    .workaround-links {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .neon-status {
      padding: 0;
    }

    .color-settings {
      display: grid;
      grid-template-rows: auto auto auto auto auto auto auto auto 1fr auto;
    }

    .theme-mode {
      min-width: 0;
      padding: 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }

    .theme-mode-row {
      display: grid;
      grid-template-columns: minmax(180px, 260px) minmax(220px, 1fr);
      gap: 8px;
      align-items: center;
    }

    .theme-mode-label {
      color: var(--muted-color);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .theme-mode-description {
      margin: 8px 0 0;
      min-width: 0;
      max-width: 100%;
      color: var(--muted-color);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .theme-mode-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .effects-warning {
      margin-top: 12px;
      min-width: 0;
      max-width: 100%;
      padding: 10px 12px;
      color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
      background: var(--vscode-inputValidation-warningBackground, var(--vscode-editorWidget-background));
      border: 1px solid var(--vscode-inputValidation-warningBorder, var(--border-color));
      border-radius: 6px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .editor-background {
      min-width: 0;
      padding: 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }

    .editor-background-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
    }

    .editor-background-title {
      margin: 0;
      color: var(--muted-color);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .image-preview-column {
      display: grid;
      gap: 8px;
      min-width: 0;
      width: min(260px, 100%);
    }

    .image-preview-actions {
      display: grid;
      gap: 8px;
    }

    .image-preview-actions .button {
      min-width: 0;
      white-space: normal;
    }

    .image-source-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .editor-background-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
      gap: 12px;
      margin-top: 12px;
      align-items: center;
    }

    .image-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      display: grid;
      place-items: center;
      overflow: hidden;
      color: var(--muted-color);
      background-color: var(--vscode-editorWidget-background);
      background-position: center;
      background-repeat: no-repeat;
      background-size: contain;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 11px;
    }

    .image-preview.has-image {
      color: transparent;
    }

    .image-preview.is-loading {
      color: var(--vscode-foreground);
    }

    .image-preview-loading {
      position: absolute;
      inset: 0;
      display: none;
      place-items: center;
      padding: 10px;
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      text-align: center;
      overflow-wrap: anywhere;
    }

    .image-preview.is-loading .image-preview-loading {
      display: grid;
    }

    .editor-background-file {
      min-width: 0;
      padding: 8px 10px;
      overflow: hidden;
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .image-data-url-warning {
      margin: 8px 0 0;
      min-width: 0;
      max-width: 100%;
      color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .editor-background-options {
      display: grid;
      grid-template-columns: minmax(220px, 320px) minmax(220px, 1fr);
      gap: 12px;
      margin-top: 12px;
      align-items: center;
    }

    .fit-control {
      display: grid;
      grid-template-columns: auto minmax(150px, 1fr);
      gap: 8px;
      align-items: center;
      color: var(--muted-color);
      font-size: 12px;
    }

    .opacity-control {
      display: grid;
      grid-template-columns: auto minmax(120px, 1fr) 44px;
      gap: 8px;
      align-items: center;
      color: var(--muted-color);
      font-size: 12px;
    }

    .opacity-slider {
      width: 100%;
      min-width: 0;
    }

    .select {
      height: var(--control-height);
      min-width: 0;
      padding: 4px 8px;
      color: var(--vscode-dropdown-foreground);
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border, var(--border-color));
      outline-color: var(--vscode-focusBorder);
    }

    .section-divider {
      height: 0;
      margin: 0;
      border: 0;
      border-top: 1px solid var(--border-color);
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) auto auto;
      gap: 8px;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }

    .search {
      height: var(--control-height);
      padding: 4px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border-color));
      outline-color: var(--vscode-focusBorder);
    }

    .button {
      min-height: var(--control-height);
      padding: 4px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }

    .button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .button.secondary {
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      border-color: var(--border-color);
    }

    .tabs {
      display: flex;
      gap: 4px;
      padding: 8px 12px 0;
      background: var(--vscode-editor-background);
    }

    .tab {
      min-height: var(--control-height);
      padding: 5px 10px;
      color: var(--vscode-tab-inactiveForeground);
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      cursor: pointer;
    }

    .tab.active {
      color: var(--vscode-tab-activeForeground);
      border-bottom-color: var(--accent);
    }

    .content {
      padding: 12px;
      overflow: auto;
    }

    .section {
      margin-bottom: 18px;
    }

    .section-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted-color);
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .grid {
      display: grid;
      gap: 8px;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(220px, 1.2fr) 42px minmax(132px, 170px) auto;
      gap: 8px;
      align-items: start;
      padding: 8px;
      background: var(--row-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }

    .row-name {
      min-width: 0;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .meta {
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--muted-color);
      font-size: 11px;
    }

    .description {
      margin-top: 3px;
      color: var(--vscode-descriptionForeground, var(--muted-color));
      font-size: 11px;
      line-height: 1.4;
    }

    .picker {
      width: 42px;
      height: var(--control-height);
      padding: 0;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
    }

    .hex {
      width: 100%;
      height: var(--control-height);
      padding: 4px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border-color));
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family);
      outline-color: var(--vscode-focusBorder);
    }

    .hex.invalid {
      border-color: var(--vscode-inputValidation-errorBorder);
      background: var(--vscode-inputValidation-errorBackground);
    }

    .reset {
      min-height: var(--control-height);
      padding: 4px 8px;
      color: var(--vscode-foreground);
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
    }

    .reset:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .status {
      min-height: 18px;
      padding: 0 12px 8px;
      color: var(--muted-color);
      font-size: 12px;
    }

    .empty {
      padding: 24px;
      color: var(--muted-color);
      text-align: center;
    }

    @media (max-width: 720px) {
      .app {
        grid-template-columns: 1fr;
      }

      .sidebar {
        min-height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--border-color);
      }

      .nav {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .nav-group {
        grid-column: 1 / -1;
      }

      .home {
        padding: 18px;
      }

      .neon-effect {
        padding: 18px;
      }

      .toolbar {
        grid-template-columns: 1fr;
      }

      .theme-mode-row {
        grid-template-columns: 1fr;
      }

      .editor-background-header,
      .editor-background-details,
      .editor-background-options {
        grid-template-columns: 1fr;
      }

      .image-preview-column {
        width: 100%;
      }

      .row {
        grid-template-columns: 1fr 42px minmax(120px, 1fr);
      }

      .reset {
        grid-column: 1 / -1;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <h1 class="brand-title">Kawaii VS Code Color</h1>
        <p class="brand-subtitle">Theme setup</p>
      </div>
      <nav class="nav" aria-label="Kawaii VS Code Color settings">
        <button class="nav-button active" data-page="home" type="button">Home</button>
        <div class="nav-group">Settings</div>
        <button class="nav-button" data-page="color-settings" type="button">Color Settings</button>
        <button class="nav-button" data-page="neon-effect" type="button">Neon Effect</button>
      </nav>
    </aside>
    <div class="workspace">
      <section id="home-page" class="page">
        <div class="home">
          <p class="home-label">Kawaii VS Code Color</p>
          <h2 class="home-title">Dark pink and light pastel VS Code theme setup</h2>
          <p class="home-text">Kawaii VS Code Color focuses on dark pink and light green pastel-pink themes. It is inspired by SynthWave '84 and Sakura Theme, and was originally forked from SynthWave '84. This setup page keeps local user customization in VS Code settings and preserves the repository theme files as source assets.</p>
          <p class="home-text">Use Color Settings to edit theme-specific colors, image-backed effects, Settings Sync bundles, and JSON import/export. Random Neko image inputs use Nekos.moe and were inspired by CatgirlDownloader.</p>
          <section class="home-section" aria-labelledby="references-title">
            <h3 id="references-title" class="home-section-title">References</h3>
            <div id="documentation-links" class="link-list"></div>
          </section>
        </div>
      </section>
      <section id="neon-effect-page" class="page hidden">
        <div class="neon-effect">
          <p class="home-label">Neon Effect</p>
          <h2 class="home-title">Enable or disable Neon Dreams</h2>
          <p class="home-text">The Neon Effect adds glow and editor chrome styling that VS Code color themes cannot express through normal theme JSON.</p>
          <div class="neon-actions">
            <button id="enable-neon" class="button" type="button">Enable Neon Effect</button>
            <button id="disable-neon" class="button secondary" type="button">Disable Neon Effect</button>
          </div>
          <div id="neon-status" class="status neon-status"></div>
          <div class="workaround">
            <p class="disclaimer-title">Corruption warning workaround</p>
            <div class="workaround-steps">
              <div class="workaround-step">
                <span class="workaround-index">1.</span>
                <span>If VS Code shows an installation corrupt or unsupported warning after enabling the effect, treat it as expected while this patch is active.</span>
              </div>
              <div class="workaround-step">
                <span class="workaround-index">2.</span>
                <span>If you only want to hide the warning, use the warning notification option to stop showing it again.</span>
              </div>
              <div class="workaround-step">
                <span class="workaround-index">3.</span>
                <div class="workaround-detail">
                  <span>Optional community workaround: install the checksum-fix extension below and follow its command instructions. This also changes VS Code internals, so use it only if you accept that risk.</span>
                  <div id="checksum-fix-link" class="workaround-inline-link"></div>
                </div>
              </div>
              <div class="workaround-step">
                <span class="workaround-index">4.</span>
                <span>To restore the supported state, disable Neon Effect and reinstall or repair VS Code so the modified workbench files are replaced.</span>
              </div>
            </div>
            <div id="corruption-warning-links" class="workaround-links"></div>
          </div>
          <div class="disclaimer">
            <p class="disclaimer-title">Potential side effects</p>
            <ul class="disclaimer-list">
              <li>Enabling Neon Effect modifies installed VS Code workbench files by adding a generated script reference.</li>
              <li>VS Code can show an unsupported or corrupted installation warning after the patch.</li>
              <li>Administrator permissions may be required on Windows depending on the install location.</li>
              <li>VS Code updates can overwrite the patch, so the effect may need to be enabled again after updates.</li>
              <li>Disable the effect before troubleshooting editor startup or workbench rendering issues.</li>
            </ul>
          </div>
        </div>
      </section>
      <section id="color-settings-page" class="page color-settings hidden">
        <section class="theme-mode" aria-labelledby="theme-mode-title">
          <div class="theme-mode-row">
            <label id="theme-mode-title" class="theme-mode-label" for="theme-variant">Theme mode</label>
            <select id="theme-variant" class="select"></select>
          </div>
          <p class="theme-mode-description">Dark and light customizations are stored separately in their own VS Code theme blocks.</p>
          <div class="theme-mode-actions">
            <button id="save-vssync" class="button secondary" type="button">Save to VSSync</button>
            <button id="import-vssync" class="button secondary" type="button">Import VSSync</button>
            <button id="export-settings" class="button secondary" type="button">Export As</button>
            <button id="import-settings" class="button secondary" type="button">Import</button>
            <button id="apply-effects" class="button" type="button">Apply Effects</button>
          </div>
          <div id="effects-warning" class="effects-warning hidden" role="status"></div>
        </section>
        <hr class="section-divider">
        <section class="editor-background" aria-labelledby="editor-background-title">
          <div class="editor-background-header">
            <div>
              <h2 id="editor-background-title" class="editor-background-title">Editor Background Image</h2>
              <p class="theme-mode-description">Upload a local image for the editor background. Image changes apply through Neon Effect and take effect after VS Code reloads.</p>
              <p id="editor-background-data-url-warning" class="image-data-url-warning"></p>
            </div>
          </div>
          <div class="editor-background-details">
            <div class="image-preview-column">
              <div id="editor-background-preview" class="image-preview"></div>
              <div class="image-preview-actions">
                <div class="image-source-actions">
                  <button id="editor-background-upload" class="button" type="button">Upload Image</button>
                  <button id="editor-background-random-neko" class="button" type="button">Random Neko</button>
                </div>
                <button id="editor-background-remove" class="button secondary" type="button">Remove Image</button>
                <button id="editor-background-download" class="button secondary" type="button">Download Image</button>
              </div>
            </div>
            <div id="editor-background-file" class="editor-background-file"></div>
            <label class="opacity-control" for="editor-background-opacity">
              <span>Opacity</span>
              <input id="editor-background-opacity" class="opacity-slider" type="range">
              <span id="editor-background-opacity-value"></span>
            </label>
          </div>
          <div class="editor-background-options">
            <label class="fit-control" for="editor-background-fit">
              <span>Fit area</span>
              <select id="editor-background-fit" class="select"></select>
            </label>
            <p id="editor-background-fit-description" class="theme-mode-description"></p>
          </div>
        </section>
        <hr class="section-divider">
        <section class="editor-background" aria-labelledby="empty-editor-logo-title">
          <div class="editor-background-header">
            <div>
              <h2 id="empty-editor-logo-title" class="editor-background-title">No-tab Logo</h2>
              <p class="theme-mode-description">Upload a local image to replace the VS Code watermark logo shown when there are no open editor tabs. Image changes apply through Neon Effect and take effect after VS Code reloads.</p>
              <p id="empty-editor-logo-data-url-warning" class="image-data-url-warning"></p>
            </div>
          </div>
          <div class="editor-background-details">
            <div class="image-preview-column">
              <div id="empty-editor-logo-preview" class="image-preview"></div>
              <div class="image-preview-actions">
                <div class="image-source-actions">
                  <button id="empty-editor-logo-upload" class="button" type="button">Upload Logo</button>
                  <button id="empty-editor-logo-random-neko" class="button" type="button">Random Neko</button>
                </div>
                <button id="empty-editor-logo-remove" class="button secondary" type="button">Remove Logo</button>
                <button id="empty-editor-logo-download" class="button secondary" type="button">Download Logo</button>
              </div>
            </div>
            <div id="empty-editor-logo-file" class="editor-background-file"></div>
            <label class="opacity-control" for="empty-editor-logo-opacity">
              <span>Opacity</span>
              <input id="empty-editor-logo-opacity" class="opacity-slider" type="range">
              <span id="empty-editor-logo-opacity-value"></span>
            </label>
          </div>
        </section>
        <hr class="section-divider">
        <div class="toolbar">
          <input id="search" class="search" type="search" placeholder="Filter colors" aria-label="Filter colors">
          <button id="refresh" class="button secondary" type="button">Refresh</button>
          <button id="reset-all" class="button" type="button">Reset All</button>
        </div>
        <div class="tabs" role="tablist">
          <button class="tab active" data-section="workbench" type="button">Workbench</button>
          <button class="tab" data-section="token" type="button">Syntax</button>
        </div>
        <main id="content" class="content"></main>
        <div id="status" class="status"></div>
      </section>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initialState = ${serializedState};
    const colorPattern = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    let state = initialState;
    let activePage = "home";
    let activeSection = "workbench";
    let filterText = "";
    let effectsPending = false;
    const pendingUpdates = new Map();
    const editorBackgroundOpacityPendingKey = "editor-background-opacity";
    const emptyEditorLogoOpacityPendingKey = "empty-editor-logo-opacity";

    const pages = {
      home: document.getElementById("home-page"),
      "neon-effect": document.getElementById("neon-effect-page"),
      "color-settings": document.getElementById("color-settings-page")
    };
    const navButtons = document.querySelectorAll(".nav-button");
    const documentationLinks = document.getElementById("documentation-links");
    const corruptionWarningLinks = document.getElementById("corruption-warning-links");
    const checksumFixLink = document.getElementById("checksum-fix-link");
    const content = document.getElementById("content");
    const search = document.getElementById("search");
    const status = document.getElementById("status");
    const neonStatus = document.getElementById("neon-status");
    const themeVariantSelect = document.getElementById("theme-variant");
    const saveVssync = document.getElementById("save-vssync");
    const importVssync = document.getElementById("import-vssync");
    const exportSettings = document.getElementById("export-settings");
    const importSettings = document.getElementById("import-settings");
    const applyEffects = document.getElementById("apply-effects");
    const effectsWarning = document.getElementById("effects-warning");
    const editorBackgroundPreview = document.getElementById("editor-background-preview");
    const editorBackgroundFile = document.getElementById("editor-background-file");
    const editorBackgroundUpload = document.getElementById("editor-background-upload");
    const editorBackgroundRandomNeko = document.getElementById("editor-background-random-neko");
    const editorBackgroundRemove = document.getElementById("editor-background-remove");
    const editorBackgroundDownload = document.getElementById("editor-background-download");
    const editorBackgroundOpacity = document.getElementById("editor-background-opacity");
    const editorBackgroundOpacityValue = document.getElementById("editor-background-opacity-value");
    const editorBackgroundFit = document.getElementById("editor-background-fit");
    const editorBackgroundFitDescription = document.getElementById("editor-background-fit-description");
    const editorBackgroundDataUrlWarning = document.getElementById("editor-background-data-url-warning");
    const emptyEditorLogoPreview = document.getElementById("empty-editor-logo-preview");
    const emptyEditorLogoFile = document.getElementById("empty-editor-logo-file");
    const emptyEditorLogoUpload = document.getElementById("empty-editor-logo-upload");
    const emptyEditorLogoRandomNeko = document.getElementById("empty-editor-logo-random-neko");
    const emptyEditorLogoRemove = document.getElementById("empty-editor-logo-remove");
    const emptyEditorLogoDownload = document.getElementById("empty-editor-logo-download");
    const emptyEditorLogoOpacity = document.getElementById("empty-editor-logo-opacity");
    const emptyEditorLogoOpacityValue = document.getElementById("empty-editor-logo-opacity-value");
    const emptyEditorLogoDataUrlWarning = document.getElementById("empty-editor-logo-data-url-warning");

    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activePage = button.dataset.page;
        render();
      });
    });

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        activeSection = tab.dataset.section;
        document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
        render();
      });
    });

    search.addEventListener("input", () => {
      filterText = search.value.trim().toLowerCase();
      render();
    });

    document.getElementById("refresh").addEventListener("click", () => {
      setStatus("Refreshing...");
      vscode.postMessage({ type: "refresh" });
    });

    document.getElementById("reset-all").addEventListener("click", () => {
      setStatus("Resetting...");
      vscode.postMessage({ type: "reset-all", themeVariantId: getActiveThemeVariantId() });
    });

    themeVariantSelect.addEventListener("change", () => {
      clearPendingUpdates();
      setStatus("Switching theme...");
      vscode.postMessage({ type: "change-theme-variant", themeVariantId: themeVariantSelect.value });
    });

    saveVssync.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Saving settings to VS Code Sync state...");
      vscode.postMessage({ type: "save-settings-to-vssync" });
    });

    importVssync.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Importing settings from VS Code Sync state...");
      vscode.postMessage({ type: "import-settings-from-vssync" });
    });

    exportSettings.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Exporting settings...");
      vscode.postMessage({ type: "export-settings" });
    });

    importSettings.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Opening settings import...");
      vscode.postMessage({ type: "import-settings" });
    });

    applyEffects.addEventListener("click", () => {
      hideEffectsWarning();
      setStatus("Applying effects...");
      setNeonStatus("Requesting effects apply...");
      applyNeonCustomizations();
    });

    editorBackgroundUpload.addEventListener("click", () => {
      setStatus("Opening image picker...");
      vscode.postMessage({ type: "select-editor-background-image" });
    });

    editorBackgroundRandomNeko.addEventListener("click", () => {
      startImageLoading(editorBackgroundPreview, editorBackgroundRandomNeko, "Fetching random neko image...");
      vscode.postMessage({ type: "select-random-neko-editor-background-image" });
    });

    editorBackgroundRemove.addEventListener("click", () => {
      setStatus("Removing editor background image...");
      vscode.postMessage({ type: "remove-editor-background-image" });
    });

    editorBackgroundDownload.addEventListener("click", () => {
      setStatus("Opening save as dialog...");
      vscode.postMessage({ type: "download-editor-background-image" });
    });

    editorBackgroundOpacity.addEventListener("input", () => {
      renderEditorBackgroundOpacityValue(editorBackgroundOpacity.value);
      scheduleEditorBackgroundOpacityUpdate(editorBackgroundOpacity.value);
    });

    editorBackgroundFit.addEventListener("change", () => {
      setStatus("Saving editor background fit area...");
      vscode.postMessage({ type: "update-editor-background-fit", fit: editorBackgroundFit.value });
    });

    emptyEditorLogoUpload.addEventListener("click", () => {
      setStatus("Opening logo picker...");
      vscode.postMessage({ type: "select-empty-editor-logo-image" });
    });

    emptyEditorLogoRandomNeko.addEventListener("click", () => {
      startImageLoading(emptyEditorLogoPreview, emptyEditorLogoRandomNeko, "Fetching random neko logo...");
      vscode.postMessage({ type: "select-random-neko-empty-editor-logo-image" });
    });

    emptyEditorLogoRemove.addEventListener("click", () => {
      setStatus("Removing no-tab logo...");
      vscode.postMessage({ type: "remove-empty-editor-logo-image" });
    });

    emptyEditorLogoDownload.addEventListener("click", () => {
      setStatus("Opening save as dialog...");
      vscode.postMessage({ type: "download-empty-editor-logo-image" });
    });

    emptyEditorLogoOpacity.addEventListener("input", () => {
      renderEmptyEditorLogoOpacityValue(emptyEditorLogoOpacity.value);
      scheduleEmptyEditorLogoOpacityUpdate(emptyEditorLogoOpacity.value);
    });

    document.getElementById("enable-neon").addEventListener("click", () => {
      setNeonStatus("Requesting enable...");
      vscode.postMessage({ type: "enable-neon" });
    });

    document.getElementById("disable-neon").addEventListener("click", () => {
      setNeonStatus("Requesting disable...");
      vscode.postMessage({ type: "disable-neon" });
    });

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.type === "state") {
        state = message.state;
        clearImageLoading(editorBackgroundPreview, editorBackgroundRandomNeko);
        clearImageLoading(emptyEditorLogoPreview, emptyEditorLogoRandomNeko);
        render();
        if (activePage === "color-settings" && !effectsPending) {
          setStatus("Saved " + new Date().toLocaleTimeString());
        }
      }
      if (message.type === "effects-pending") {
        showEffectsWarning(message.message || getDefaultEffectsPendingMessage());
      }
      if (message.type === "neon-status") {
        hideEffectsWarning();
        setNeonStatus(message.message || "Neon Effect request completed.");
      }
      if (message.type === "error") {
        setStatus(message.message || "Settings failed.");
        setNeonStatus(message.message || "Settings failed.");
        clearImageLoading(editorBackgroundPreview, editorBackgroundRandomNeko);
        clearImageLoading(emptyEditorLogoPreview, emptyEditorLogoRandomNeko);
      }
    });

    function render() {
      syncPages();
      renderHome();
      renderCorruptionWarningLinks();
      renderChecksumFixLink();
      renderThemeVariantSelector();
      renderEditorBackgroundSettings();
      renderEmptyEditorLogoSettings();

      if (activePage === "color-settings") {
        renderColorSettings();
      }
    }

    function syncPages() {
      Object.keys(pages).forEach((pageId) => {
        pages[pageId].classList.toggle("hidden", pageId !== activePage);
      });

      navButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.page === activePage);
      });
    }

    function renderHome() {
      documentationLinks.innerHTML = "";
      (state.documentationLinks || []).forEach((link) => {
        documentationLinks.appendChild(createDocumentationLinkButton(link));
      });
    }

    function renderCorruptionWarningLinks() {
      corruptionWarningLinks.innerHTML = "";
      (state.corruptionWarningLinks || []).forEach((link) => {
        corruptionWarningLinks.appendChild(createDocumentationLinkButton(link));
      });
    }

    function renderChecksumFixLink() {
      checksumFixLink.innerHTML = "";

      if (state.checksumFixLink) {
        checksumFixLink.appendChild(createDocumentationLinkButton(state.checksumFixLink));
      }
    }

    function renderThemeVariantSelector() {
      const activeThemeVariantId = getActiveThemeVariantId();
      themeVariantSelect.innerHTML = "";

      (state.themeVariants || []).forEach((themeVariant) => {
        const option = document.createElement("option");
        option.value = themeVariant.id;
        option.textContent = themeVariant.modeLabel + " - " + themeVariant.label;
        themeVariantSelect.appendChild(option);
      });

      themeVariantSelect.value = activeThemeVariantId;
    }

    function renderEditorBackgroundSettings() {
      const editorBackground = state.editorBackground || {};
      const opacity = Number(editorBackground.opacity || 0);

      editorBackgroundOpacity.min = String(editorBackground.minOpacity || 0);
      editorBackgroundOpacity.max = String(editorBackground.maxOpacity || 0.35);
      editorBackgroundOpacity.step = String(editorBackground.opacityStep || 0.01);
      editorBackgroundOpacity.value = String(opacity);
      editorBackgroundRemove.disabled = !editorBackground.hasImage && !editorBackground.missingImage;
      editorBackgroundDownload.disabled = !editorBackground.hasImage;
      renderImagePreview(editorBackgroundPreview, editorBackground.previewUri, "No image");
      editorBackgroundFile.textContent = getEditorBackgroundFileText(editorBackground);
      editorBackgroundFile.title = editorBackgroundFile.textContent;
      renderEditorBackgroundOpacityValue(opacity);
      renderEditorBackgroundFitOptions(editorBackground);
      editorBackgroundDataUrlWarning.textContent = editorBackground.dataUrlWarning || "";
    }

    function getEditorBackgroundFileText(editorBackground) {
      if (editorBackground.missingImage) {
        return "Stored image is missing. Upload a new image or remove the customization.";
      }

      if (editorBackground.hasImage) {
        return editorBackground.originalName + " | " + editorBackground.sizeLabel;
      }

      return "No image selected. Supported formats: " + editorBackground.supportedFormats + "; max " + editorBackground.maxImageSizeLabel + ".";
    }

    function renderEditorBackgroundOpacityValue(opacity) {
      const numericOpacity = Number.parseFloat(String(opacity));
      const safeOpacity = Number.isFinite(numericOpacity) ? numericOpacity : 0;
      editorBackgroundOpacityValue.textContent = Math.round(safeOpacity * 100) + "%";
    }

    function renderEditorBackgroundFitOptions(editorBackground) {
      const fitOptions = Array.isArray(editorBackground.fitOptions) ? editorBackground.fitOptions : [];
      const selectedFit = editorBackground.fit || "full";
      const selectedOption = fitOptions.find((option) => option.id === selectedFit);

      editorBackgroundFit.innerHTML = "";
      fitOptions.forEach((option) => {
        const item = document.createElement("option");
        item.value = option.id;
        item.textContent = option.label + " (" + option.description + ")";
        editorBackgroundFit.appendChild(item);
      });

      editorBackgroundFit.value = selectedOption ? selectedOption.id : "full";
      renderEditorBackgroundFitDescription(selectedOption);
    }

    function renderEditorBackgroundFitDescription(option) {
      if (!option) {
        editorBackgroundFitDescription.textContent = "Full area: image fits inside 100% x 100% of the editor.";
        return;
      }

      editorBackgroundFitDescription.textContent = option.label + " area: image fits inside " + option.description + " of the editor.";
    }

    function renderEmptyEditorLogoSettings() {
      const emptyEditorLogo = state.emptyEditorLogo || {};
      const opacity = Number(emptyEditorLogo.opacity || 0);

      emptyEditorLogoOpacity.min = String(emptyEditorLogo.minOpacity || 0);
      emptyEditorLogoOpacity.max = String(emptyEditorLogo.maxOpacity || 1);
      emptyEditorLogoOpacity.step = String(emptyEditorLogo.opacityStep || 0.01);
      emptyEditorLogoOpacity.value = String(opacity);
      emptyEditorLogoRemove.disabled = !emptyEditorLogo.hasImage && !emptyEditorLogo.missingImage;
      emptyEditorLogoDownload.disabled = !emptyEditorLogo.hasImage;
      renderImagePreview(emptyEditorLogoPreview, emptyEditorLogo.previewUri, "No logo");
      emptyEditorLogoFile.textContent = getEmptyEditorLogoFileText(emptyEditorLogo);
      emptyEditorLogoFile.title = emptyEditorLogoFile.textContent;
      renderEmptyEditorLogoOpacityValue(opacity);
      emptyEditorLogoDataUrlWarning.textContent = emptyEditorLogo.dataUrlWarning || "";
    }

    function getEmptyEditorLogoFileText(emptyEditorLogo) {
      if (emptyEditorLogo.missingImage) {
        return "Stored logo is missing. Upload a new logo or remove the customization.";
      }

      if (emptyEditorLogo.hasImage) {
        return emptyEditorLogo.originalName + " | " + emptyEditorLogo.sizeLabel;
      }

      return "No logo selected. Supported formats: " + emptyEditorLogo.supportedFormats + "; max " + emptyEditorLogo.maxImageSizeLabel + ".";
    }

    function renderEmptyEditorLogoOpacityValue(opacity) {
      const numericOpacity = Number.parseFloat(String(opacity));
      const safeOpacity = Number.isFinite(numericOpacity) ? numericOpacity : 0;
      emptyEditorLogoOpacityValue.textContent = Math.round(safeOpacity * 100) + "%";
    }

    function renderImagePreview(container, previewUri, emptyText) {
      container.innerHTML = "";
      container.style.backgroundImage = "";
      container.classList.toggle("has-image", Boolean(previewUri));
      container.setAttribute("role", "img");

      if (!previewUri) {
        container.textContent = emptyText;
        container.setAttribute("aria-label", emptyText);
        container.title = emptyText;
        return;
      }

      container.textContent = "";
      container.style.backgroundImage = "url(" + JSON.stringify(previewUri) + ")";
      container.setAttribute("aria-label", "Selected image preview");
      container.title = "Selected image preview";
    }

    function startImageLoading(container, button, message) {
      setStatus(message);
      button.disabled = true;
      container.classList.add("is-loading");
      renderImageLoadingOverlay(container, message);
    }

    function clearImageLoading(container, button) {
      button.disabled = false;
      container.classList.remove("is-loading");
      const overlay = container.querySelector(".image-preview-loading");
      if (overlay) {
        overlay.remove();
      }
    }

    function renderImageLoadingOverlay(container, message) {
      let overlay = container.querySelector(".image-preview-loading");

      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "image-preview-loading";
        container.appendChild(overlay);
      }

      overlay.textContent = message;
    }

    function showEffectsWarning(message) {
      effectsPending = true;
      effectsWarning.textContent = message;
      effectsWarning.classList.remove("hidden");
      setStatus(message);
    }

    function hideEffectsWarning() {
      effectsPending = false;
      effectsWarning.textContent = "";
      effectsWarning.classList.add("hidden");
    }

    function getDefaultEffectsPendingMessage() {
      return "Image customization saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.";
    }

    function createDocumentationLinkButton(link) {
      const button = document.createElement("button");
      button.className = "link-button";
      button.type = "button";
      button.title = link.url;

      const label = document.createElement("span");
      label.className = "link-label";
      label.textContent = link.label;

      const url = document.createElement("span");
      url.className = "link-url";
      url.textContent = link.url;

      button.appendChild(label);
      button.appendChild(url);
      button.addEventListener("click", () => {
        vscode.postMessage({ type: "open-link", url: link.url });
      });

      return button;
    }

    function renderColorSettings() {
      const items = getVisibleItems();
      content.innerHTML = "";

      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No matching colors";
        content.appendChild(empty);
        return;
      }

      const groups = groupItems(items);
      Object.keys(groups).sort().forEach((groupName) => {
        const section = document.createElement("section");
        section.className = "section";

        const title = document.createElement("h2");
        title.className = "section-title";
        title.textContent = groupName;
        section.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";
        groups[groupName].forEach((item) => grid.appendChild(createColorRow(item)));
        section.appendChild(grid);
        content.appendChild(section);
      });
    }

    function getVisibleItems() {
      const items = activeSection === "workbench" ? (state.workbenchColors || []) : (state.tokenColors || []);

      return items.filter((item) => {
        if (!filterText) {
          return true;
        }

        return [item.label, item.scope, item.defaultValue, item.value, item.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(filterText));
      });
    }

    function groupItems(items) {
      return items.reduce((groups, item) => {
        const groupName = activeSection === "workbench" ? item.group : "Syntax Tokens";
        groups[groupName] = groups[groupName] || [];
        groups[groupName].push(item);
        return groups;
      }, {});
    }

    function createColorRow(item) {
      const row = document.createElement("div");
      row.className = "row";

      const name = document.createElement("div");
      name.className = "row-name";

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = item.label;
      label.title = item.label;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = activeSection === "workbench" ? "Default " + item.defaultValue : item.scope + " | Default " + item.defaultValue;
      meta.title = meta.textContent;

      const description = document.createElement("div");
      description.className = "description";
      description.textContent = item.description || "No description available.";
      description.title = description.textContent;

      name.appendChild(label);
      name.appendChild(meta);
      name.appendChild(description);

      const picker = document.createElement("input");
      picker.className = "picker";
      picker.type = "color";
      picker.value = toColorInputValue(item.value);
      picker.title = item.label;

      const input = document.createElement("input");
      input.className = "hex";
      input.value = item.value;
      input.spellcheck = false;
      input.setAttribute("aria-label", item.label + " hex color");

      const reset = document.createElement("button");
      reset.className = "reset";
      reset.type = "button";
      reset.textContent = "Reset";
      reset.disabled = !item.customized;

      picker.addEventListener("input", () => {
        input.value = mergeColorInputWithAlpha(picker.value, input.value);
        handleColorInput(item, input);
      });

      input.addEventListener("input", () => {
        handleColorInput(item, input);
        if (colorPattern.test(input.value.trim())) {
          picker.value = toColorInputValue(input.value);
        }
      });

      reset.addEventListener("click", () => {
        setStatus("Resetting...");
        vscode.postMessage({ type: "reset-color", section: activeSection, id: item.id, themeVariantId: getActiveThemeVariantId() });
      });

      row.appendChild(name);
      row.appendChild(picker);
      row.appendChild(input);
      row.appendChild(reset);

      return row;
    }

    function handleColorInput(item, input) {
      const value = input.value.trim();
      const isValid = colorPattern.test(value);
      input.classList.toggle("invalid", !isValid);

      if (!isValid) {
        setStatus("Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.");
        return;
      }

      scheduleColorUpdate(activeSection, item.id, value);
    }

    function scheduleColorUpdate(section, id, value) {
      const themeVariantId = getActiveThemeVariantId();
      const key = themeVariantId + ":" + section + ":" + id;
      clearTimeout(pendingUpdates.get(key));
      pendingUpdates.set(key, setTimeout(() => {
        setStatus("Saving...");
        vscode.postMessage({ type: "update-color", section, id, value, themeVariantId });
      }, 220));
    }

    function scheduleEditorBackgroundOpacityUpdate(opacity) {
      clearTimeout(pendingUpdates.get(editorBackgroundOpacityPendingKey));
      pendingUpdates.set(editorBackgroundOpacityPendingKey, setTimeout(() => {
        setStatus("Saving editor background opacity...");
        vscode.postMessage({ type: "update-editor-background-opacity", opacity });
      }, 220));
    }

    function scheduleEmptyEditorLogoOpacityUpdate(opacity) {
      clearTimeout(pendingUpdates.get(emptyEditorLogoOpacityPendingKey));
      pendingUpdates.set(emptyEditorLogoOpacityPendingKey, setTimeout(() => {
        setStatus("Saving no-tab logo opacity...");
        vscode.postMessage({ type: "update-empty-editor-logo-opacity", opacity });
      }, 220));
    }

    function clearImageCustomizationUpdateTimers() {
      clearTimeout(pendingUpdates.get(editorBackgroundOpacityPendingKey));
      pendingUpdates.delete(editorBackgroundOpacityPendingKey);
      clearTimeout(pendingUpdates.get(emptyEditorLogoOpacityPendingKey));
      pendingUpdates.delete(emptyEditorLogoOpacityPendingKey);
    }

    function applyNeonCustomizations() {
      clearImageCustomizationUpdateTimers();
      vscode.postMessage({
        type: "apply-neon-customizations",
        editorBackgroundOpacity: editorBackgroundOpacity.value,
        editorBackgroundFit: editorBackgroundFit.value,
        emptyEditorLogoOpacity: emptyEditorLogoOpacity.value
      });
    }

    function clearPendingUpdates() {
      pendingUpdates.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingUpdates.clear();
    }

    function getActiveThemeVariantId() {
      return state.activeThemeVariantId || "dark";
    }

    function toColorInputValue(value) {
      const normalizedValue = String(value || "#000000").trim();

      if (/^#[0-9a-fA-F]{3,4}$/.test(normalizedValue)) {
        return "#" + normalizedValue.slice(1, 4).split("").map((part) => part + part).join("");
      }

      return normalizedValue.slice(0, 7);
    }

    function mergeColorInputWithAlpha(rgbValue, currentValue) {
      const value = String(currentValue || "");

      if (/^#[0-9a-fA-F]{8}$/.test(value)) {
        return rgbValue + value.slice(7, 9);
      }

      if (/^#[0-9a-fA-F]{4}$/.test(value)) {
        return rgbValue + value.slice(4, 5).repeat(2);
      }

      return rgbValue;
    }

    function setStatus(message) {
      status.textContent = message;
    }

    function setNeonStatus(message) {
      neonStatus.textContent = message;
    }

    render();
    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
}

/**
 * Creates a nonce for webview scripts.
 *
 * @returns {string} Nonce value.
 */
function createNonce() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";

  for (let index = 0; index < 32; index += 1) {
    nonce += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return nonce;
}

/**
 * Gets a readable message from an unknown error.
 *
 * @param {unknown} error - Error value.
 * @returns {string} Error message.
 */
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Logs settings failures with context.
 *
 * @param {string} methodName - Method where the error happened.
 * @param {unknown} error - Error value.
 * @param {Record<string, unknown>} context - Debug context.
 * @returns {void}
 */
function logSettingsError(methodName, error, context) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    methodName,
    context,
    message: normalizedError.message,
    stack: normalizedError.stack
  }, null, 2));
}

module.exports = {
  configureSettingsSync,
  openSettings
};
