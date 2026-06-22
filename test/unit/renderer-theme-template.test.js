const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rendererPlaceholders = require("../../out/src/shared/contracts/rendererPlaceholders");
const themeTemplate = require("../../out/src/renderer/ThemeTemplate");

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

test("renderer template module keeps browser boundary identifiers and no Node imports", () => {
  assert.deepEqual(themeTemplate.RENDERER_STYLE_IDS, {
    chrome: "kawaii_synthwave-chrome-styles",
    theme: "kawaii_synthwave-theme-styles"
  });
  assert.ok(
    themeTemplate.KAWAII_THEME_WRAPPER_SELECTORS.some((selector) =>
      selector.includes("kawaii-vscode-color-generated-color-theme-json")
    )
  );

  const compiledSource = fs.readFileSync(path.join(process.cwd(), "out", "src", "renderer", "ThemeTemplate.js"), "utf8");

  assert.doesNotMatch(compiledSource, /require\(["'](?:fs|path|vscode)["']\)/);
});

test("renderer placeholder helpers replace only known placeholders", () => {
  const template = "brightness=[NEON_BRIGHTNESS];glow=[DISABLE_GLOW];unknown=[UNKNOWN_PLACEHOLDER]";

  assert.deepEqual(rendererPlaceholders.findRendererPlaceholders(template), [
    "DISABLE_GLOW",
    "NEON_BRIGHTNESS"
  ]);
  assert.equal(
    rendererPlaceholders.replaceRendererPlaceholders(template, {
      DISABLE_GLOW: "false",
      NEON_BRIGHTNESS: "7F"
    }),
    "brightness=7F;glow=false;unknown=[UNKNOWN_PLACEHOLDER]"
  );
});
