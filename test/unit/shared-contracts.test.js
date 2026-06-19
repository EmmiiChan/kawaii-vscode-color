const test = require("node:test");
const assert = require("node:assert/strict");

const color = require("../../out/src/shared/models/color");
const effects = require("../../out/src/shared/models/effects");
const theme = require("../../out/src/shared/models/theme");
const webviewMessages = require("../../out/src/shared/contracts/webviewMessages");
const settingsBundleSchema = require("../../out/src/shared/contracts/settingsBundleSchema");
const rendererPlaceholders = require("../../out/src/shared/contracts/rendererPlaceholders");
const result = require("../../out/src/shared/validation/result");

test("shared color guards accept VS Code hex colors and reject invalid values", () => {
  assert.equal(color.isHexColor("#fff"), true);
  assert.equal(color.isHexColor("#fffafd"), true);
  assert.equal(color.isHexColor("#fffafd80"), true);
  assert.equal(color.isHexColor("fffafd"), false);
  assert.equal(color.isHexColor("#not-a-color"), false);
});

test("shared opacity normalization clamps incoming numeric values", () => {
  assert.equal(effects.normalizeOpacityValue(-1), 0);
  assert.equal(effects.normalizeOpacityValue(0.42), 0.42);
  assert.equal(effects.normalizeOpacityValue(2), 1);
  assert.equal(effects.normalizeOpacityValue("bad"), 1);
});

test("shared theme guards identify supported Kawaii theme variants", () => {
  assert.equal(theme.isThemeName("Kawaii VS Code Color"), true);
  assert.equal(theme.isThemeName("Kawaii VS Code Color Light"), true);
  assert.equal(theme.isThemeName("Other Theme"), false);
});

test("webview message guard accepts known messages and rejects unknown payloads", () => {
  assert.equal(webviewMessages.isWebviewToHostMessage({ type: "ready" }), true);
  assert.equal(
    webviewMessages.isWebviewToHostMessage({
      type: "update-color",
      key: "editor.background",
      value: "#fffafd"
    }),
    true
  );
  assert.equal(webviewMessages.isWebviewToHostMessage({ type: "unknown" }), false);
  assert.equal(webviewMessages.isWebviewToHostMessage(null), false);
});

test("settings bundle schema constants preserve current and legacy schema names", () => {
  assert.equal(settingsBundleSchema.SETTINGS_EXPORT_SCHEMA, "kawaii-vscode-color-settings");
  assert.equal(settingsBundleSchema.LEGACY_SETTINGS_EXPORT_SCHEMA, "kawaii-synthwave-settings");
  assert.equal(settingsBundleSchema.SETTINGS_EXPORT_SCHEMA_VERSION, 1);
});

test("renderer placeholder contract includes required Neon placeholders", () => {
  assert.equal(rendererPlaceholders.isRendererPlaceholder("NEON_BRIGHTNESS"), true);
  assert.equal(rendererPlaceholders.isRendererPlaceholder("EMPTY_EDITOR_LOGO_STYLES"), true);
  assert.equal(rendererPlaceholders.isRendererPlaceholder("UNKNOWN_PLACEHOLDER"), false);
});

test("shared result helpers create explicit success and failure values", () => {
  const ok = result.ok("value");
  const error = new Error("failed");
  const failure = result.err(error);

  assert.deepEqual(ok, { ok: true, value: "value" });
  assert.deepEqual(failure, { ok: false, error });
});
