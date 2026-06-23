// @ts-nocheck
const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const { createSettingsMessageController } = require("./extensionHost/controllers/SettingsMessageController");
const { createSettingsStateService } = require("./extensionHost/services/SettingsStateService");
const { createSettingsBundleService } = require("./extensionHost/services/SettingsBundleService");
const { createSettingsEffectsService } = require("./extensionHost/services/SettingsEffectsService");
const { createRandomNekoImageFetcher } = require("./randomNekoImage");
const { createSettingsBundleActions } = require("./settingsBundle");
const { createSettingsColorService } = require("./settingsColorService");
const effectsPersistence = require("./settingsEffectsPersistence");
const { resolveExtensionAssetPath } = require("./extensionRoot");
const { createSettingsStore } = require("./settingsStore");
const { createSettingsWebviewHtml } = require("./settingsWebview");
const { KAWAII_THEME_VARIANTS } = require("./shared/models/theme");
const {
  ensurePlainObject,
  findMatchingTokenRuleIndex,
  getTextMateRules,
  getThemeCustomizationKey,
  stringifyScope
} = require("./settingsPersistence");
const packageManifest = JSON.parse(fs.readFileSync(resolveExtensionAssetPath(__dirname, "package.json"), "utf8"));

const PANEL_VIEW_TYPE = "kawaiiVsCodeColor.settings";
const THEME_VARIANTS = KAWAII_THEME_VARIANTS.map(function mapThemeVariant(themeVariant) {
  return {
    ...themeVariant,
    generatedThemePath: resolveExtensionAssetPath(__dirname, ...themeVariant.generatedThemePath.split("/"))
  };
});
const DEFAULT_THEME_VARIANT_ID = "dark";
const COLOR_THEME_SETTING = "workbench.colorTheme";
const WORKBENCH_CUSTOMIZATIONS_SETTING = "workbench.colorCustomizations";
const TOKEN_CUSTOMIZATIONS_SETTING = "editor.tokenColorCustomizations";
const BRIGHTNESS_SETTING = "kawaii_synthwave.brightness";
const DISABLE_GLOW_SETTING = "kawaii_synthwave.disableGlow";
const SETTINGS_EXPORT_FILE_NAME = "kawaii-vscode-color-settings.json";
const NEON_E2E_ALLOW_PATCH_ENV = "KAWAII_E2E_ALLOW_NEON_PATCH";
const SETTINGS_E2E_TEST_HOOKS_ENV = "KAWAII_E2E_TEST_HOOKS";
const COLOR_SCHEME_REFERENCE_PATH = resolveExtensionAssetPath(__dirname, ".codex", "color_scheme_reference.md");
const e2eTestFixtures = {};
const settingsStore = createSettingsStore(vscode.workspace);
const settingsColorService = createSettingsColorService({
  colorThemeSetting: COLOR_THEME_SETTING,
  getGeneratedTokenRule,
  getThemeVariantById,
  readGeneratedTheme,
  settingsStore,
  tokenCustomizationsSetting: TOKEN_CUSTOMIZATIONS_SETTING,
  workbenchCustomizationsSetting: WORKBENCH_CUSTOMIZATIONS_SETTING
});
const settingsBundleActions = createSettingsBundleActions({
  activeThemeService: {
    getActiveThemeVariant,
    changeThemeVariant
  },
  brightnessSetting: BRIGHTNESS_SETTING,
  disableGlowSetting: DISABLE_GLOW_SETTING,
  effectsService: {
    applyEffectsExport,
    getEffectsExport
  },
  fileSystem: fs.promises,
  homeDirectory: os.homedir,
  settingsExportFileName: SETTINGS_EXPORT_FILE_NAME,
  settingsStore,
  themeVariants: THEME_VARIANTS,
  tokenCustomizationsSetting: TOKEN_CUSTOMIZATIONS_SETTING,
  uri: vscode.Uri,
  window: createWindowAdapter(),
  workbenchCustomizationsSetting: WORKBENCH_CUSTOMIZATIONS_SETTING
});
const settingsStateService = createSettingsStateService({
  createState: createSettingsState
});
const settingsBundleService = createSettingsBundleService({
  applySettingsBundle(context, bundle) {
    return settingsBundleActions.applySettingsBundle(context, bundle);
  },
  configureSettingsSync(context) {
    return settingsBundleActions.configureSettingsSync(context);
  },
  exportSettingsBundle,
  importSettingsBundle,
  importSettingsFromVsSync,
  saveSettingsToVsSync
});
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
const EDITOR_BACKGROUND_MIME_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml"
};
const EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const EDITOR_BACKGROUND_MIN_OPACITY = 0;
const EDITOR_BACKGROUND_MAX_OPACITY = 0.35;
const EDITOR_BACKGROUND_OPACITY_STEP = 0.01;
const EDITOR_BACKGROUND_FIT_STATE_KEY = "kawaii_synthwave.editorBackgroundFit";
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
const PROJECT_LINKS = getProjectLinksFromManifest(packageManifest);
const fetchRandomNekoImageFromNetwork = createRandomNekoImageFetcher({
  endpoint: NEKOS_MOE_RANDOM_IMAGE_ENDPOINT,
  imageBaseUrl: NEKOS_MOE_IMAGE_BASE_URL,
  userAgent: NEKOS_MOE_USER_AGENT,
  timeoutMs: NETWORK_REQUEST_TIMEOUT_MS,
  redirectLimit: NETWORK_REDIRECT_LIMIT,
  jsonMaxBytes: NETWORK_JSON_MAX_BYTES,
  imageMaxBytes: EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES,
  mimeTypes: EDITOR_BACKGROUND_MIME_TYPES,
  getSupportedImageExtension: getSupportedEditorBackgroundImageExtension,
  getMimeType: getEditorBackgroundImageMimeType,
  formatFileSize
});

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

  activePanel.webview.html = createSettingsWebviewHtml(activePanel.webview, settingsStateService.createSettingsState(context, activePanel.webview));
}

/**
 * Registers Kawaii VS Code Color global state keys that VS Code Settings Sync may synchronize.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {void}
 */
function configureSettingsSync(context) {
  return settingsBundleService.configureSettingsSync(context);
}

/**
 * Handles a message received from the webview.
 *
 * @param {vscode.WebviewPanel | undefined} panel - Active webview panel.
 * @param {unknown} message - Message payload.
 * @returns {Promise<void>} Completes when the action has been applied.
 */
async function handleSettingsMessage(panel, message, context) {
  if (!panel) {
    return;
  }

  const controller = createSettingsMessageController({
    handlers: createSettingsMessageHandlers(panel, context),
    isNeonE2ETestHookEnabled,
    isSettingsE2ETestHookEnabled,
    logError: logSettingsError,
    async reportError(error) {
      panel.webview.postMessage({
        type: "error",
        message: getErrorMessage(error)
      });
      await vscode.window.showErrorMessage(`Kawaii VS Code Color settings failed: ${getErrorMessage(error)}`);
    }
  });

  await controller.handleMessage(message);
}

/**
 * Creates legacy settings handlers consumed by the typed message controller.
 *
 * @param {vscode.WebviewPanel} panel - Active webview panel.
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Record<string, Function>} Settings message handlers.
 */
function createSettingsMessageHandlers(panel, context) {
  const settingsEffectsService = createSettingsEffectsService({
    applyAllEffects() {
      return applyAllEffects(panel);
    },
    downloadEditorBackgroundImage,
    downloadEmptyEditorLogoImage,
    removeEditorBackgroundImage,
    removeEmptyEditorLogoImage,
    selectEditorBackgroundImage,
    selectEmptyEditorLogoImage,
    selectRandomNekoEditorBackgroundImage,
    selectRandomNekoEmptyEditorLogoImage,
    updateEditorBackgroundFit,
    updateEditorBackgroundOpacity,
    updateEmptyEditorLogoOpacity
  });

  return {
    applyAllEffects() {
      return settingsEffectsService.applyAllEffects();
    },
    async applyNeonCustomizations(message) {
      await settingsEffectsService.updateEditorBackgroundOpacity(context, message.editorBackgroundOpacity);
      await settingsEffectsService.updateEditorBackgroundFit(context, message.editorBackgroundFit);
      await settingsEffectsService.updateEmptyEditorLogoOpacity(context, message.emptyEditorLogoOpacity);
    },
    applySettingsBundle(bundle) {
      return settingsBundleService.applySettingsBundle(context, bundle);
    },
    changeThemeVariant,
    downloadEditorBackgroundImage() {
      return settingsEffectsService.downloadEditorBackgroundImage(context);
    },
    downloadEmptyEditorLogoImage() {
      return settingsEffectsService.downloadEmptyEditorLogoImage(context);
    },
    disableNeon() {
      return runNeonEffectAction("disableNeon");
    },
    enableNeon() {
      return runNeonEffectAction("enableNeon");
    },
    exportSettingsBundle() {
      return settingsBundleService.exportSettingsBundle(context);
    },
    importSettingsBundle() {
      return settingsBundleService.importSettingsBundle(context);
    },
    importSettingsFromVsSync() {
      return settingsBundleService.importSettingsFromVsSync(context);
    },
    openDocumentationLink,
    postEffectsPendingWarning(message) {
      postEffectsPendingWarning(panel, message);
    },
    postNeonEffectStatus(message) {
      postNeonEffectStatus(panel, message);
    },
    postSettingsState() {
      return postSettingsState(panel, context);
    },
    removeEditorBackgroundImage() {
      return settingsEffectsService.removeEditorBackgroundImage(context);
    },
    removeEmptyEditorLogoImage() {
      return settingsEffectsService.removeEmptyEditorLogoImage(context);
    },
    resetAllColorCustomizations,
    resetColorCustomization,
    saveSettingsToVsSync() {
      return settingsBundleService.saveSettingsToVsSync(context);
    },
    selectEditorBackgroundImage() {
      return settingsEffectsService.selectEditorBackgroundImage(context);
    },
    selectEmptyEditorLogoImage() {
      return settingsEffectsService.selectEmptyEditorLogoImage(context);
    },
    selectRandomNekoEditorBackgroundImage() {
      return settingsEffectsService.selectRandomNekoEditorBackgroundImage(context);
    },
    selectRandomNekoEmptyEditorLogoImage() {
      return settingsEffectsService.selectRandomNekoEmptyEditorLogoImage(context);
    },
    setE2ETestFixtures,
    updateColorCustomization,
    updateEditorBackgroundFit(fit) {
      return settingsEffectsService.updateEditorBackgroundFit(context, fit);
    },
    updateEditorBackgroundOpacity(opacity) {
      return settingsEffectsService.updateEditorBackgroundOpacity(context, opacity);
    },
    updateEmptyEditorLogoOpacity(opacity) {
      return settingsEffectsService.updateEmptyEditorLogoOpacity(context, opacity);
    }
  };
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
 * Builds Help page links from the extension manifest.
 *
 * @param {Record<string, unknown>} manifest - Extension package manifest.
 * @returns {{label: string, url: string, description: string}[]} Project resource links.
 */
function getProjectLinksFromManifest(manifest) {
  const repositoryUrl = manifest && manifest.repository && typeof manifest.repository.url === "string"
    ? manifest.repository.url
    : "";
  const issueTrackerUrl = manifest && manifest.bugs && typeof manifest.bugs.url === "string"
    ? manifest.bugs.url
    : "";
  const homepageUrl = manifest && typeof manifest.homepage === "string" ? manifest.homepage : "";
  const publisher = manifest && typeof manifest.publisher === "string" ? manifest.publisher : "";
  const publisherUrl = publisher ? `https://marketplace.visualstudio.com/publishers/${publisher}` : "";

  return [
    {
      label: "Repository",
      url: repositoryUrl,
      description: "Project source repository"
    },
    {
      label: "Issues",
      url: issueTrackerUrl,
      description: "Issue tracker"
    },
    {
      label: "Homepage",
      url: homepageUrl,
      description: "README and project homepage"
    },
    {
      label: "Publisher",
      url: publisherUrl,
      description: publisher ? `Marketplace publisher: ${publisher}` : "Marketplace publisher"
    }
  ].filter(function keepLink(link) {
    return Boolean(link.url);
  });
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
 * Checks whether the gated Neon E2E test hook may be exposed.
 *
 * @returns {boolean} True only for explicit destructive-control E2E runs.
 */
function isNeonE2ETestHookEnabled() {
  return process.env[NEON_E2E_ALLOW_PATCH_ENV] === "1";
}

/**
 * Checks whether safe settings E2E test hooks may be exposed.
 *
 * @returns {boolean} True only for explicit E2E runs.
 */
function isSettingsE2ETestHookEnabled() {
  return process.env[SETTINGS_E2E_TEST_HOOKS_ENV] === "1" || isNeonE2ETestHookEnabled();
}

/**
 * Stores deterministic fixture paths for E2E-only dialog and network replacements.
 *
 * @param {unknown} fixtures - Fixture path map received from the webview.
 * @returns {void}
 */
function setE2ETestFixtures(fixtures) {
  const allowedKeys = [
    "settingsExportPath",
    "settingsImportPath",
    "editorBackgroundImagePath",
    "emptyEditorLogoImagePath",
    "editorBackgroundDownloadPath",
    "emptyEditorLogoDownloadPath",
    "randomNekoImagePath"
  ];
  const normalizedFixtures = ensurePlainObject(fixtures);

  allowedKeys.forEach(function assignFixturePath(key) {
    if (typeof normalizedFixtures[key] === "string" && normalizedFixtures[key]) {
      e2eTestFixtures[key] = path.resolve(normalizedFixtures[key]);
    } else {
      delete e2eTestFixtures[key];
    }
  });
}

/**
 * Builds the VS Code window facade used by settings actions.
 *
 * @returns {Record<string, Function>} Window facade.
 */
function createWindowAdapter() {
  return {
    showErrorMessage(...args) {
      return vscode.window.showErrorMessage(...args);
    },
    showInformationMessage(...args) {
      return vscode.window.showInformationMessage(...args);
    },
    showOpenDialog(options) {
      return showOpenDialog(options);
    },
    showSaveDialog(options) {
      return showSaveDialog(options);
    },
    showWarningMessage(...args) {
      return vscode.window.showWarningMessage(...args);
    }
  };
}

/**
 * Opens a native file dialog or returns an E2E fixture path when hooks are enabled.
 *
 * @param {Record<string, unknown>} options - VS Code open dialog options.
 * @returns {Thenable<vscode.Uri[] | undefined>} Selected URIs.
 */
function showOpenDialog(options) {
  const fixtureKey = getE2EOpenDialogFixtureKey(options);

  if (fixtureKey) {
    return Promise.resolve([vscode.Uri.file(e2eTestFixtures[fixtureKey])]);
  }

  return vscode.window.showOpenDialog(options);
}

/**
 * Opens a native save dialog or returns an E2E fixture path when hooks are enabled.
 *
 * @param {Record<string, unknown>} options - VS Code save dialog options.
 * @returns {Thenable<vscode.Uri | undefined>} Selected URI.
 */
function showSaveDialog(options) {
  const fixtureKey = getE2ESaveDialogFixtureKey(options);

  if (fixtureKey) {
    return Promise.resolve(vscode.Uri.file(e2eTestFixtures[fixtureKey]));
  }

  return vscode.window.showSaveDialog(options);
}

/**
 * Resolves an E2E open-dialog fixture key by dialog title.
 *
 * @param {Record<string, unknown>} options - VS Code dialog options.
 * @returns {string | undefined} Fixture key.
 */
function getE2EOpenDialogFixtureKey(options) {
  if (!isSettingsE2ETestHookEnabled()) {
    return undefined;
  }

  const title = String(options && options.title || "");

  if (title.includes("Import Kawaii VS Code Color settings") && e2eTestFixtures.settingsImportPath) {
    return "settingsImportPath";
  }

  if (title.includes("editor background image") && e2eTestFixtures.editorBackgroundImagePath) {
    return "editorBackgroundImagePath";
  }

  if (title.includes("no-tab logo") && e2eTestFixtures.emptyEditorLogoImagePath) {
    return "emptyEditorLogoImagePath";
  }

  return undefined;
}

/**
 * Resolves an E2E save-dialog fixture key by dialog title.
 *
 * @param {Record<string, unknown>} options - VS Code dialog options.
 * @returns {string | undefined} Fixture key.
 */
function getE2ESaveDialogFixtureKey(options) {
  if (!isSettingsE2ETestHookEnabled()) {
    return undefined;
  }

  const title = String(options && options.title || "");

  if (title.includes("Export Kawaii VS Code Color settings") && e2eTestFixtures.settingsExportPath) {
    return "settingsExportPath";
  }

  if (title.includes("editor background image") && e2eTestFixtures.editorBackgroundDownloadPath) {
    return "editorBackgroundDownloadPath";
  }

  if (title.includes("no-tab logo") && e2eTestFixtures.emptyEditorLogoDownloadPath) {
    return "emptyEditorLogoDownloadPath";
  }

  return undefined;
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
    .concat(PROJECT_LINKS)
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
  return settingsColorService.updateColorCustomization(section, id, value, themeVariantId);
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
  return settingsColorService.resetColorCustomization(section, id, themeVariantId);
}

/**
 * Switches the active VS Code color theme to one Kawaii VS Code Color variant.
 *
 * @param {unknown} themeVariantId - Theme variant id.
 * @returns {Thenable<void>} Completes when VS Code persists the active theme.
 */
function changeThemeVariant(themeVariantId) {
  return settingsColorService.changeThemeVariant(themeVariantId);
}

/**
 * Removes all user color customizations for one Kawaii VS Code Color theme variant.
 *
 * @param {unknown} themeVariantId - Theme variant id.
 * @returns {Promise<void>} Completes when settings are persisted.
 */
async function resetAllColorCustomizations(themeVariantId) {
  return settingsColorService.resetAllColorCustomizations(themeVariantId);
}

/**
 * Saves the current Kawaii VS Code Color settings bundle into VS Code synced global state.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when the bundle is stored for Settings Sync.
 */
async function saveSettingsToVsSync(context) {
  return settingsBundleActions.saveSettingsToVsSync(context);
}

/**
 * Imports the latest Kawaii VS Code Color settings bundle from VS Code synced global state.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when a synced bundle was imported.
 */
async function importSettingsFromVsSync(context) {
  return settingsBundleActions.importSettingsFromVsSync(context);
}

/**
 * Exports the current Kawaii VS Code Color settings bundle to a JSON file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the bundle was exported.
 */
async function exportSettingsBundle(context) {
  return settingsBundleActions.exportSettingsBundle(context);
}

/**
 * Imports a Kawaii VS Code Color settings bundle from a JSON file.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when a bundle was imported.
 */
async function importSettingsBundle(context) {
  return settingsBundleActions.importSettingsBundle(context);
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
  return effectsPersistence.createStoredImageExport(metadata, {
    exists: fs.existsSync,
    readFile: fs.promises.readFile,
    resolvePath(fileName) {
      return resolvePath(context, fileName);
    }
  });
}

/**
 * Applies image-backed effect settings from an imported bundle.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} effects - Exported effects.
 * @returns {Promise<void>} Completes when effects are restored.
 */
async function applyEffectsExport(context, effects) {
  return effectsPersistence.applyEffectsExport(effects, {
    updateEditorBackgroundOpacity(opacity) {
      return updateEditorBackgroundOpacity(context, opacity);
    },
    updateEditorBackgroundFit(fit) {
      return updateEditorBackgroundFit(context, fit);
    },
    restoreEditorBackgroundImage(image) {
      return restoreEditorBackgroundImageExport(context, image);
    },
    updateEmptyEditorLogoOpacity(opacity) {
      return updateEmptyEditorLogoOpacity(context, opacity);
    },
    restoreEmptyEditorLogoImage(image) {
      return restoreEmptyEditorLogoImageExport(context, image);
    }
  });
}

/**
 * Restores the editor background image from an exported image object.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} image - Exported image object.
 * @returns {Promise<void>} Completes when the image is restored.
 */
async function restoreEditorBackgroundImageExport(context, image) {
  return effectsPersistence.restoreStoredImageExport(image, {
    removeImage() {
      return removeStoredEditorBackgroundImage(context);
    },
    storeImage(imageData) {
      return storeEditorBackgroundImage(context, imageData);
    }
  });
}

/**
 * Restores the no-tab logo image from an exported image object.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @param {unknown} image - Exported image object.
 * @returns {Promise<void>} Completes when the image is restored.
 */
async function restoreEmptyEditorLogoImageExport(context, image) {
  return effectsPersistence.restoreStoredImageExport(image, {
    removeImage() {
      return removeStoredEmptyEditorLogoImage(context);
    },
    storeImage(imageData) {
      return storeEmptyEditorLogoImage(context, imageData);
    }
  });
}

/**
 * Removes the stored editor background image without user-facing notifications.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when the stored image is absent.
 */
async function removeStoredEditorBackgroundImage(context) {
  const metadata = getStoredEditorBackgroundImageMetadata(context);
  await effectsPersistence.removeStoredImageState({
    context,
    stateKey: EDITOR_BACKGROUND_IMAGE_STATE_KEY,
    metadata,
    deleteFile(fileMetadata) {
      return deleteStoredEditorBackgroundImageFile(context, fileMetadata);
    }
  });
}

/**
 * Removes the stored no-tab logo image without user-facing notifications.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<void>} Completes when the stored image is absent.
 */
async function removeStoredEmptyEditorLogoImage(context) {
  const metadata = getStoredEmptyEditorLogoImageMetadata(context);
  await effectsPersistence.removeStoredImageState({
    context,
    stateKey: EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY,
    metadata,
    deleteFile(fileMetadata) {
      return deleteStoredEmptyEditorLogoImageFile(context, fileMetadata);
    }
  });
}

/**
 * Opens the system image picker and stores the selected editor background image.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {Promise<boolean>} True when the image metadata and file are stored.
 */
async function selectEditorBackgroundImage(context) {
  const selectedUris = await showOpenDialog({
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

  await effectsPersistence.storeImageState({
    context,
    stateKey: EDITOR_BACKGROUND_IMAGE_STATE_KEY,
    imageData,
    fileName,
    previousMetadata,
    targetPath,
    ensureStorageDirectory() {
      return ensureGlobalStorageDirectory(context);
    },
    deletePreviousFile(metadata, preservedFileName) {
      return deleteStoredEditorBackgroundImageFile(context, metadata, preservedFileName);
    },
    fileSystem: fs.promises,
    maxSizeBytes: EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES,
    maxSizeErrorMessage: `Editor background image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`
  });
}

/**
 * Fetches a random image metadata object from nekos.moe and downloads the image bytes.
 *
 * @returns {Promise<{imageBuffer: Buffer, extension: string, originalName: string, mimeType: string}>} Downloaded image data.
 */
async function fetchRandomNekoImage() {
  if (isSettingsE2ETestHookEnabled() && e2eTestFixtures.randomNekoImagePath) {
    return readE2ERandomNekoImageFixture(e2eTestFixtures.randomNekoImagePath);
  }

  return fetchRandomNekoImageFromNetwork();
}

/**
 * Reads a deterministic local image as the E2E replacement for Random Neko.
 *
 * @param {string} imagePath - Local fixture image path.
 * @returns {Promise<{imageBuffer: Buffer, extension: string, originalName: string, mimeType: string}>} Image data.
 */
async function readE2ERandomNekoImageFixture(imagePath) {
  const extension = getSupportedEditorBackgroundImageExtension(imagePath);

  if (!extension) {
    throw new Error(`Unsupported Random Neko E2E fixture format. Use ${EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL}.`);
  }

  const imageBuffer = await fs.promises.readFile(imagePath);
  const mimeType = getEditorBackgroundImageMimeType(extension);
  const originalName = `e2e-random-neko-${path.basename(imagePath)}`;

  return {
    imageBuffer,
    extension,
    originalName,
    mimeType
  };
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
  const selectedUris = await showOpenDialog({
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

  await effectsPersistence.storeImageState({
    context,
    stateKey: EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY,
    imageData,
    fileName,
    previousMetadata,
    targetPath,
    ensureStorageDirectory() {
      return ensureGlobalStorageDirectory(context);
    },
    deletePreviousFile(metadata, preservedFileName) {
      return deleteStoredEmptyEditorLogoImageFile(context, metadata, preservedFileName);
    },
    fileSystem: fs.promises,
    maxSizeBytes: EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES,
    maxSizeErrorMessage: `No-tab logo image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`
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

  return effectsPersistence.createStoredImageState({
    metadata,
    fileExists,
    previewUri: fileExists ? getEditorBackgroundImagePreviewUri(context, metadata.fileName) : "",
    opacity: getStoredEditorBackgroundOpacity(context),
    minOpacity: EDITOR_BACKGROUND_MIN_OPACITY,
    maxOpacity: EDITOR_BACKGROUND_MAX_OPACITY,
    opacityStep: EDITOR_BACKGROUND_OPACITY_STEP,
    fit: getStoredEditorBackgroundFit(context),
    fitOptions: getEditorBackgroundFitOptions(),
    supportedFormats: EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL,
    dataUrlWarning: IMAGE_DATA_URL_WARNING,
    maxImageSizeBytes: EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES
  });
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

  return effectsPersistence.createStoredImageState({
    metadata,
    fileExists,
    previewUri: fileExists ? getEmptyEditorLogoImagePreviewUri(context, metadata.fileName) : "",
    opacity: getStoredEmptyEditorLogoOpacity(context),
    minOpacity: EMPTY_EDITOR_LOGO_MIN_OPACITY,
    maxOpacity: EMPTY_EDITOR_LOGO_MAX_OPACITY,
    opacityStep: EMPTY_EDITOR_LOGO_OPACITY_STEP,
    supportedFormats: EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL,
    dataUrlWarning: IMAGE_DATA_URL_WARNING,
    maxImageSizeBytes: EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES
  });
}

/**
 * Reads stored editor background image metadata.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {{fileName: string, originalName: string, mimeType: string, size: number} | undefined} Stored image metadata.
 */
function getStoredEditorBackgroundImageMetadata(context) {
  return effectsPersistence.normalizeStoredEditorBackgroundMetadata(
    context.globalState.get(EDITOR_BACKGROUND_IMAGE_STATE_KEY)
  );
}

/**
 * Reads stored empty editor logo metadata.
 *
 * @param {vscode.ExtensionContext} context - Extension context.
 * @returns {{fileName: string, originalName: string, mimeType: string, size: number} | undefined} Stored logo metadata.
 */
function getStoredEmptyEditorLogoImageMetadata(context) {
  return effectsPersistence.normalizeStoredEmptyEditorLogoMetadata(
    context.globalState.get(EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY)
  );
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
  return effectsPersistence.normalizeEditorBackgroundOpacity(opacity);
}

/**
 * Normalizes an editor background fit area id.
 *
 * @param {unknown} fit - Candidate fit area id.
 * @returns {string} Supported fit area id.
 */
function normalizeEditorBackgroundFit(fit) {
  return effectsPersistence.normalizeEditorBackgroundFit(fit);
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
  return effectsPersistence.normalizeEmptyEditorLogoOpacity(opacity);
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
  return effectsPersistence.resolveStoredEditorBackgroundImagePath(getGlobalStoragePath(context), fileName);
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
  return effectsPersistence.resolveStoredEmptyEditorLogoImagePath(getGlobalStoragePath(context), fileName);
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

  const targetUri = await showSaveDialog({
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
 * Gets a supported image file extension from a file path.
 *
 * @param {string} filePath - Source file path.
 * @returns {string | undefined} Supported lowercase extension.
 */
function getSupportedEditorBackgroundImageExtension(filePath) {
  return effectsPersistence.getSupportedEditorBackgroundImageExtension(filePath);
}

/**
 * Gets the MIME type for a supported editor background image extension.
 *
 * @param {string} extension - Image file extension.
 * @returns {string} Image MIME type.
 */
function getEditorBackgroundImageMimeType(extension) {
  return effectsPersistence.getEditorBackgroundImageMimeType(extension);
}

/**
 * Formats a byte count for compact settings UI display.
 *
 * @param {number} bytes - Byte count.
 * @returns {string} Human-readable file size.
 */
function formatFileSize(bytes) {
  return effectsPersistence.formatFileSize(bytes);
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
    state: settingsStateService.createSettingsState(context, panel.webview)
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
    projectLinks: PROJECT_LINKS,
    corruptionWarningLinks: CORRUPTION_WARNING_LINKS,
    checksumFixLink: CHECKSUM_FIX_LINK,
    e2eTestApiEnabled: isSettingsE2ETestHookEnabled(),
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
    return (
      themeVariant.label === activeThemeLabel
      || themeVariant.legacyLabels.includes(activeThemeLabel)
    );
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
  return settingsStore.getSettingsObject(settingName);
}

/**
 * Reads a target-specific settings object safely.
 *
 * @param {string} settingName - VS Code setting name.
 * @param {boolean} isGlobalTarget - True for user settings, false for workspace settings.
 * @returns {Record<string, unknown>} Settings object.
 */
function getTargetSettingsObject(settingName, isGlobalTarget) {
  return settingsStore.getTargetSettingsObject(settingName, isGlobalTarget);
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
  return settingsStore.updateGlobalSetting(settingName, value);
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
  return settingsStore.updateSetting(settingName, value, isGlobalTarget);
}

/**
 * Checks whether workspace settings can be written in the current window.
 *
 * @returns {boolean} True when a workspace settings target exists.
 */
function canUpdateWorkspaceSettings() {
  return settingsStore.canUpdateWorkspaceSettings();
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

export = {
  configureSettingsSync,
  openSettings
};
