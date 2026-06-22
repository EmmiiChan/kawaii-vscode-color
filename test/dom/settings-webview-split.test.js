const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createSettingsViewModel,
  serializeSettingsViewModel
} = require("../../out/src/webview/settings/SettingsViewModel");
const {
  SETTINGS_WEBVIEW_STYLE_TOKEN_NAMES
} = require("../../out/src/webview/settings/SettingsWebviewStyles");
const {
  SETTINGS_VIEW_PAGE_IDS
} = require("../../out/src/webview/settings/SettingsView");
const {
  SETTINGS_CLIENT_POST_MESSAGE_TYPES
} = require("../../out/src/webview/settings/SettingsClientController");
const {
  createSettingsWebviewContentSecurityPolicy,
  createSettingsWebviewHtml
} = require("../../out/src/webview/settings/SettingsWebviewHtml");

test("settings webview split modules preserve state serialization and CSP contracts", () => {
  const state = createSettingsViewModel({
    themeLabel: "Kawaii <Theme>",
    activeThemeVariantId: "dark"
  });

  assert.deepEqual(state, {
    themeLabel: "Kawaii <Theme>",
    activeThemeVariantId: "dark"
  });
  assert.equal(
    serializeSettingsViewModel(state),
    '{"themeLabel":"Kawaii \\u003cTheme>","activeThemeVariantId":"dark"}'
  );
  assert.equal(
    createSettingsWebviewContentSecurityPolicy("vscode-resource:", "fixed-nonce"),
    "default-src 'none'; img-src vscode-resource: data:; style-src 'unsafe-inline'; script-src 'nonce-fixed-nonce';"
  );
});

test("settings webview split modules expose stable page, style, and client message contracts", () => {
  assert.deepEqual(SETTINGS_VIEW_PAGE_IDS, [
    "home",
    "settings",
    "colors",
    "neon",
    "images",
    "sync",
    "help"
  ]);
  assert.ok(SETTINGS_WEBVIEW_STYLE_TOKEN_NAMES.includes("--vscode-editor-background"));
  assert.ok(SETTINGS_WEBVIEW_STYLE_TOKEN_NAMES.includes("--vscode-panel-border"));
  assert.ok(SETTINGS_CLIENT_POST_MESSAGE_TYPES.includes("apply-neon-customizations"));
  assert.ok(SETTINGS_CLIENT_POST_MESSAGE_TYPES.includes("update-color"));
  assert.ok(SETTINGS_CLIENT_POST_MESSAGE_TYPES.includes("ready"));
});

test("settings webview HTML adapter can delegate legacy document rendering with typed helpers", () => {
  const html = createSettingsWebviewHtml({
    createLegacyHtml(webview, initialState, nonce) {
      return [
        createSettingsWebviewContentSecurityPolicy(webview.cspSource, nonce),
        serializeSettingsViewModel(initialState)
      ].join("\n");
    },
    initialState: {
      title: "Kawaii <State>"
    },
    nonce: "fixed-nonce",
    webview: {
      cspSource: "vscode-resource:"
    }
  });

  assert.match(html, /nonce-fixed-nonce/);
  assert.match(html, /Kawaii \\u003cState/);
});
