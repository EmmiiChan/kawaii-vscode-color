import assert = require("node:assert/strict");
import fs = require("node:fs");
import path = require("node:path");
import test = require("node:test");

const rendererPlaceholders = require(path.join(
  process.cwd(),
  "out",
  "src",
  "shared",
  "contracts",
  "rendererPlaceholders"
)) as typeof import("../../src/shared/contracts/rendererPlaceholders");
const themeTemplate = require(path.join(
  process.cwd(),
  "out",
  "src",
  "renderer",
  "ThemeTemplate"
)) as typeof import("../../src/renderer/ThemeTemplate");

test("renderer token helpers preserve VS Code token color matching contracts", () => {
  assert.equal(themeTemplate.normalizeRendererTokenColor("FE4450"), "fe4450");
  assert.equal(themeTemplate.normalizeRendererTokenColor("0000FFFF"), "0000ff");
  assert.match("color:#0000ff;", themeTemplate.createRendererTokenColorRegex("0000ff"));
  assert.match("color: #0000FFFF;", themeTemplate.createRendererTokenColorRegex("0000ff"));
  assert.equal(
    themeTemplate.countRendererTokenColorMatches(
      ".a{color:#0000ff;} .b{color: #098658ff;} .c{color: #123456;}",
      themeTemplate.LIGHT_RENDERER_TOKEN_REPLACEMENTS
    ),
    2
  );
});

test("renderer token replacement keeps dark and light glow maps explicit", () => {
  const styles = ".dark{color:#fe4450;} .light{color: #0000FFFF;} .unknown{color: #123456;}";
  const replaced = themeTemplate.replaceRendererTokenColors(styles, [
    themeTemplate.LIGHT_RENDERER_TOKEN_REPLACEMENTS,
    themeTemplate.DARK_RENDERER_TOKEN_REPLACEMENTS
  ]);

  assert.match(replaced, /#fc1f2c\[NEON_BRIGHTNESS\]/);
  assert.match(replaced, /#59a4f9\[NEON_BRIGHTNESS\]/);
  assert.match(replaced, /color: #123456;/);
  assert.doesNotMatch(replaced, /color:#fe4450;/);
});

test("renderer token helpers create additive scoped token rules", () => {
  const styles = ".mtk1, .mtk2 { color: #fe4450; } .unknown { color: #123456; }";
  const darkInnerTheme = themeTemplate.RENDERER_INNER_THEME_CONFIGS[0];

  if (!darkInnerTheme) {
    throw new Error("Expected dark renderer inner theme config.");
  }

  const scopedRules = themeTemplate.createScopedRendererTokenRules(styles, [
    themeTemplate.DARK_RENDERER_TOKEN_REPLACEMENTS
  ], darkInnerTheme);

  assert.match(scopedRules, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii \.mtk1 \{color: #fffafd;/);
  assert.match(scopedRules, /\.kawaii-vscode-colors-ui\.dark-pink-kawaii \.mtk2 \{color: #fffafd;/);
  assert.doesNotMatch(scopedRules, /\.kawaii-vscode-colors-ui \.mtk/);
  assert.doesNotMatch(scopedRules, /\.unknown/);
});

test("renderer template module keeps browser boundary identifiers and no Node imports", () => {
  assert.deepEqual(themeTemplate.RENDERER_STYLE_IDS, {
    stylesheet: "kawaii-vscode-colors-ui-stylesheet",
    token: "kawaii-vscode-colors-ui-token-styles"
  });
  assert.equal(themeTemplate.RENDERER_UI_ROOT_CLASS, "kawaii-vscode-colors-ui");
  assert.deepEqual(themeTemplate.RENDERER_INNER_THEME_WRAPPER_CLASSES, [
    "dark-pink-kawaii",
    "light-pink-pastel-kawaii"
  ]);
  assert.equal(themeTemplate.RENDERER_STYLESHEET_HREF, "kawaii-vscode-colors-ui.min.css?v=[KAWAII_UI_STYLE_VERSION]");
  assert.ok(
    themeTemplate.RENDERER_INNER_THEME_CONFIGS.some((innerTheme) =>
      innerTheme.wrapperClass === "dark-pink-kawaii"
      && innerTheme.selectors.some((selector) => selector.includes("kawaii-vscode-color-generated-color-theme-json"))
    )
  );

  const compiledSource = fs.readFileSync(path.join(process.cwd(), "out", "src", "renderer", "ThemeTemplate.js"), "utf8");

  assert.doesNotMatch(compiledSource, /require\(["'](?:fs|path|vscode)["']\)/);
});

test("renderer placeholder helpers replace only known placeholders", () => {
  const template = "brightness=[NEON_BRIGHTNESS];glow=[DISABLE_GLOW];style=[KAWAII_UI_STYLE_VERSION];unknown=[UNKNOWN_PLACEHOLDER]";

  assert.deepEqual(rendererPlaceholders.findRendererPlaceholders(template), [
    "DISABLE_GLOW",
    "KAWAII_UI_STYLE_VERSION",
    "NEON_BRIGHTNESS"
  ]);
  assert.equal(
    rendererPlaceholders.replaceRendererPlaceholders(template, {
      DISABLE_GLOW: "false",
      KAWAII_UI_STYLE_VERSION: "v1",
      NEON_BRIGHTNESS: "7F"
    }),
    "brightness=7F;glow=false;style=v1;unknown=[UNKNOWN_PLACEHOLDER]"
  );
});
