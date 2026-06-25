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

test("shared effect feature settings default every module to enabled", () => {
  assert.deepEqual((effects as any).normalizeEffectFeatureSettings(undefined), {
    foundation: true,
    editorBackground: true,
    noPageLogo: true,
    glow: true
  });
  assert.deepEqual((effects as any).normalizeEffectFeatureSettings({ glow: false }), {
    foundation: true,
    editorBackground: true,
    noPageLogo: true,
    glow: false
  });
  assert.deepEqual((effects as any).getEnabledEffectFeatureIds({
    foundation: true,
    editorBackground: false,
    noPageLogo: true,
    glow: false
  }), ["foundation", "noPageLogo"]);
});

test("effect feature combination matrix covers every switch permutation with stable ids", () => {
  const matrix = effects.getEffectFeatureCombinationMatrix();

  assert.equal(matrix.length, 16);
  assert.deepEqual(matrix[0], {
    id: "foundation-off__editor-background-off__no-page-logo-off__glow-off",
    features: {
      foundation: false,
      editorBackground: false,
      noPageLogo: false,
      glow: false
    }
  });
  assert.deepEqual(matrix[matrix.length - 1], {
    id: "foundation-on__editor-background-on__no-page-logo-on__glow-on",
    features: {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: true
    }
  });
  assert.equal(new Set(matrix.map((combination) => combination.id)).size, 16);
});

test("shared theme guards identify supported Kawaii theme variants", () => {
  assert.equal(theme.isThemeName("Dark Pink Kawaii"), true);
  assert.equal(theme.isThemeName("Light Pink-Pastel Kawaii"), true);
  assert.equal(theme.isThemeName("Kawaii VS Code Color"), true);
  assert.equal(theme.isThemeName("Kawaii VS Code Color Light"), true);
  assert.equal(theme.isThemeName("Other Theme"), false);
});

test("shared theme variants expose canonical labels, legacy aliases, and wrapper classes", () => {
  assert.equal(theme.KAWAII_UI_ROOT_CLASS, "kawaii-vscode-colors-ui");
  assert.equal(theme.sanitizeThemeWrapperClass("Dark Pink Kawaii"), "dark-pink-kawaii");
  assert.equal(theme.sanitizeThemeWrapperClass("Light Pink-Pastel Kawaii"), "light-pink-pastel-kawaii");

  assert.deepEqual(
    theme.KAWAII_THEME_VARIANTS.map((variant) => ({
      id: variant.id,
      label: variant.label,
      wrapperClass: variant.wrapperClass,
      legacyLabels: variant.legacyLabels
    })),
    [
      {
        id: "dark",
        label: "Dark Pink Kawaii",
        wrapperClass: "dark-pink-kawaii",
        legacyLabels: ["Kawaii VS Code Color"]
      },
      {
        id: "light",
        label: "Light Pink-Pastel Kawaii",
        wrapperClass: "light-pink-pastel-kawaii",
        legacyLabels: ["Kawaii VS Code Color Light"]
      }
    ]
  );

  assert.equal(theme.getThemeVariantByLabel("Dark Pink Kawaii")?.id, "dark");
  assert.equal(theme.getThemeVariantByLabel("Kawaii VS Code Color")?.id, "dark");
  assert.equal(theme.getThemeVariantByLabel("Light Pink-Pastel Kawaii")?.id, "light");
  assert.equal(theme.getThemeVariantByLabel("Kawaii VS Code Color Light")?.id, "light");
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
  assert.equal(
    webviewMessages.isWebviewToHostMessage({
      type: "apply-effects",
      features: {
        foundation: true,
        editorBackground: false,
        noPageLogo: true,
        glow: false
      },
      editorBackgroundOpacity: 0.2,
      editorBackgroundFit: "left",
      emptyEditorLogoOpacity: 0.7
    }),
    true
  );
  assert.equal(
    webviewMessages.isHostToWebviewMessage({
      type: "effects-status",
      tone: "busy",
      title: "Effects",
      message: "Applying selected effects",
      dedupeKey: "effects:apply"
    }),
    true
  );
  assert.equal(webviewMessages.isWebviewToHostMessage({ type: "unknown" }), false);
  assert.equal(webviewMessages.isWebviewToHostMessage(null), false);
  assert.equal(webviewMessages.isHostToWebviewMessage({ type: "effects-status", tone: "loud" }), false);
});

test("settings bundle schema constants preserve current and legacy schema names", () => {
  assert.equal(settingsBundleSchema.SETTINGS_EXPORT_SCHEMA, "kawaii-vscode-color-settings");
  assert.equal(settingsBundleSchema.LEGACY_SETTINGS_EXPORT_SCHEMA, "kawaii-synthwave-settings");
  assert.equal(settingsBundleSchema.SETTINGS_EXPORT_SCHEMA_VERSION, 1);
});

test("renderer placeholder contract includes required Neon placeholders", () => {
  assert.equal(rendererPlaceholders.isRendererPlaceholder("NEON_BRIGHTNESS"), true);
  assert.equal(rendererPlaceholders.isRendererPlaceholder("KAWAII_UI_STYLE_VERSION"), true);
  assert.equal(rendererPlaceholders.isRendererPlaceholder("EMPTY_EDITOR_LOGO_STYLES"), true);
  assert.equal(rendererPlaceholders.isRendererPlaceholder("CHROME_STYLES"), false);
  assert.equal(rendererPlaceholders.isRendererPlaceholder("UNKNOWN_PLACEHOLDER"), false);
});

test("shared result helpers create explicit success and failure values", () => {
  const ok = result.ok("value");
  const error = new Error("failed");
  const failure = result.err(error);

  assert.deepEqual(ok, { ok: true, value: "value" });
  assert.deepEqual(failure, { ok: false, error });
});
