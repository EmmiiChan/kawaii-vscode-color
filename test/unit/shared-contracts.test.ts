import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const color = requireOut<typeof import("../../src/shared/models/color")>("shared", "models", "color");
const effects = requireOut<typeof import("../../src/shared/models/effects")>("shared", "models", "effects");
const theme = requireOut<typeof import("../../src/shared/models/theme")>("shared", "models", "theme");
const webviewMessages = requireOut<typeof import("../../src/shared/contracts/webviewMessages")>("shared", "contracts", "webviewMessages");
const settingsBundleSchema = requireOut<typeof import("../../src/shared/contracts/settingsBundleSchema")>("shared", "contracts", "settingsBundleSchema");
const rendererPlaceholders = requireOut<typeof import("../../src/shared/contracts/rendererPlaceholders")>("shared", "contracts", "rendererPlaceholders");
const result = requireOut<typeof import("../../src/shared/validation/result")>("shared", "validation", "result");

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

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
