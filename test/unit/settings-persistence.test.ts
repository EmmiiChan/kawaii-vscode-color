import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  areScopesEqual,
  clonePlainObject,
  ensurePlainObject,
  findMatchingTokenRuleIndex,
  getTextMateRules,
  getThemeCustomizationBlockFromObject,
  getThemeCustomizationBlocksExportFromObject,
  getThemeCustomizationKey,
  getThemeCustomizationKeys,
  normalizeHexColor,
  removeThemeCustomizationBlockFromObject,
  resetTokenColorBlock,
  resetWorkbenchColorBlock,
  stringifyScope,
  updateTokenColorBlock,
  updateWorkbenchColorBlock,
  writeThemeCustomizationBlock
} = requireOut<typeof import("../../src/settingsPersistence")>("settingsPersistence");

const darkVariant = { id: "dark", label: "Dark Pink Kawaii", legacyLabels: ["Kawaii VS Code Color"] };
const lightVariant = { id: "light", label: "Light Pink-Pastel Kawaii", legacyLabels: ["Kawaii VS Code Color Light"] };
type ThemeCustomizationBlocks = Record<string, Record<string, unknown>>;
type TokenCustomizationBlocks = Record<string, { textMateRules: unknown[] }>;

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("normalizeHexColor accepts VS Code hex formats and preserves trimmed values", () => {
  assert.equal(normalizeHexColor(" #abc "), "#abc");
  assert.equal(normalizeHexColor("#abcd"), "#abcd");
  assert.equal(normalizeHexColor("#aabbcc"), "#aabbcc");
  assert.equal(normalizeHexColor("#AABBCCDD"), "#AABBCCDD");
});

test("normalizeHexColor rejects invalid color values with existing messages", () => {
  assert.throws(() => normalizeHexColor(null), /Color value must be a hex string\./);
  assert.throws(() => normalizeHexColor("#12"), /Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA\./);
  assert.throws(() => normalizeHexColor("#xyzxyz"), /Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA\./);
});

test("getThemeCustomizationKey returns theme-specific VS Code customization keys", () => {
  assert.equal(getThemeCustomizationKey(darkVariant), "[Dark Pink Kawaii]");
  assert.equal(getThemeCustomizationKey(lightVariant), "[Light Pink-Pastel Kawaii]");
  assert.deepEqual(getThemeCustomizationKeys(darkVariant), [
    "[Dark Pink Kawaii]",
    "[Kawaii VS Code Color]"
  ]);
});

test("clonePlainObject and ensurePlainObject return safe plain objects", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;

  assert.deepEqual(clonePlainObject(["not", "plain"]), {});
  assert.deepEqual(clonePlainObject(null), {});
  assert.deepEqual(clonePlainObject("value"), {});
  assert.deepEqual(clonePlainObject(circular), {});
  assert.deepEqual(ensurePlainObject(undefined), {});
  assert.deepEqual(ensurePlainObject({ nested: { value: 1 } }), { nested: { value: 1 } });

  const source = { nested: { value: 1 } };
  const clone = clonePlainObject(source) as { nested: { value: number } };
  clone.nested.value = 2;
  assert.equal(source.nested.value, 1);
});

test("writeThemeCustomizationBlock writes non-empty blocks and deletes empty blocks", () => {
  const customizations = {
    "[Kawaii VS Code Color]": { "sideBar.background": "#111111" },
    "[Unrelated Theme]": { "editor.background": "#000000" }
  };

  writeThemeCustomizationBlock(customizations, { "editor.background": "#112233" }, darkVariant);

  assert.deepEqual(customizations, {
    "[Unrelated Theme]": { "editor.background": "#000000" },
    "[Dark Pink Kawaii]": { "editor.background": "#112233" }
  });

  writeThemeCustomizationBlock(customizations, {}, darkVariant);

  assert.deepEqual(customizations, {
    "[Unrelated Theme]": { "editor.background": "#000000" }
  });
});

test("theme customization block reads canonical keys before legacy aliases", () => {
  assert.deepEqual(
    getThemeCustomizationBlockFromObject({
      "[Dark Pink Kawaii]": { "editor.background": "#31202b" },
      "[Kawaii VS Code Color]": { "editor.background": "#000000" }
    }, darkVariant),
    { "editor.background": "#31202b" }
  );

  assert.deepEqual(
    getThemeCustomizationBlockFromObject({
      "[Kawaii VS Code Color]": { "editor.background": "#000000" }
    }, darkVariant),
    { "editor.background": "#000000" }
  );
});

test("getTextMateRules filters invalid textMateRules entries", () => {
  const validRule = { scope: "keyword", settings: { foreground: "#fede5d" } };

  assert.deepEqual(getTextMateRules({
    textMateRules: [
      validRule,
      null,
      ["array"],
      "bad",
      { scope: "string", settings: { foreground: "#ff8b39" } }
    ]
  }), [
    validRule,
    { scope: "string", settings: { foreground: "#ff8b39" } }
  ]);

  assert.deepEqual(getTextMateRules({ textMateRules: "bad" }), []);
});

test("scope helpers compare strings and arrays using stable stringification", () => {
  assert.equal(stringifyScope(["source.js", "keyword"]), "source.js, keyword");
  assert.equal(stringifyScope("source.js"), "source.js");
  assert.equal(stringifyScope({}), "");
  assert.equal(areScopesEqual(["source.js", "keyword"], "source.js, keyword"), true);
  assert.equal(areScopesEqual(["source.js", "keyword"], ["keyword", "source.js"]), false);

  const textMateRules = [
    { scope: "comment", settings: { foreground: "#848bbd" } },
    { scope: ["source.js", "keyword"], settings: { foreground: "#fede5d" } }
  ];

  assert.equal(findMatchingTokenRuleIndex(textMateRules, { scope: "source.js, keyword" }), 1);
  assert.equal(findMatchingTokenRuleIndex(textMateRules, { scope: "string" }), -1);
});

test("workbench block update and reset preserve unrelated theme blocks", () => {
  const customizations = {
    "[Kawaii VS Code Color]": {
      "editor.background": "#000000",
      "sideBar.background": "#111111"
    },
    "[Unrelated Theme]": {
      "editor.background": "#222222"
    }
  };

  const updated = updateWorkbenchColorBlock(customizations, "editor.background", "#31202b", darkVariant) as ThemeCustomizationBlocks;
  assert.equal(updated["[Dark Pink Kawaii]"]!["editor.background"], "#31202b");
  assert.equal(updated["[Kawaii VS Code Color]"], undefined);
  assert.deepEqual(updated["[Unrelated Theme]"], { "editor.background": "#222222" });
  assert.equal(customizations["[Kawaii VS Code Color]"]["editor.background"], "#000000");

  const reset = resetWorkbenchColorBlock(updated, "editor.background", darkVariant);
  assert.deepEqual(reset["[Dark Pink Kawaii]"], { "sideBar.background": "#111111" });
  assert.deepEqual(reset["[Unrelated Theme]"], { "editor.background": "#222222" });
});

test("token block update replaces matching scope and appends missing scope", () => {
  const customizations = {
    "[Kawaii VS Code Color]": {
      textMateRules: [
        { scope: "comment", settings: { foreground: "#848bbd" } },
        { scope: ["source.js", "keyword"], settings: { foreground: "#fede5d" } }
      ]
    }
  };

  const replaced = updateTokenColorBlock(
    customizations,
    { scope: "source.js, keyword" },
    "#ffffff",
    darkVariant
  ) as TokenCustomizationBlocks;

  assert.deepEqual(replaced["[Dark Pink Kawaii]"]!.textMateRules, [
    { scope: "comment", settings: { foreground: "#848bbd" } },
    { scope: "source.js, keyword", settings: { foreground: "#ffffff" } }
  ]);
  assert.equal(replaced["[Kawaii VS Code Color]"], undefined);

  const appended = updateTokenColorBlock(replaced, { scope: "string" }, "#ff8b39", darkVariant) as TokenCustomizationBlocks;

  assert.deepEqual(appended["[Dark Pink Kawaii]"]!.textMateRules[2], {
    scope: "string",
    settings: { foreground: "#ff8b39" }
  });
});

test("token reset removes matching rules and deletes empty textMateRules", () => {
  const customizations = {
    "[Kawaii VS Code Color]": {
      textMateRules: [
        { scope: "comment", settings: { foreground: "#848bbd" } },
        { scope: "string", settings: { foreground: "#ff8b39" } }
      ]
    }
  };

  const withOneRule = resetTokenColorBlock(customizations, { scope: "comment" }, darkVariant) as TokenCustomizationBlocks;
  assert.deepEqual(withOneRule["[Dark Pink Kawaii]"]!.textMateRules, [
    { scope: "string", settings: { foreground: "#ff8b39" } }
  ]);

  const emptyBlock = resetTokenColorBlock(withOneRule, { scope: "string" }, darkVariant);
  assert.deepEqual(emptyBlock, {});
});

test("theme customization export and removal handle supported variants only", () => {
  const customizations = {
    "[Kawaii VS Code Color]": { "editor.background": "#31202b" },
    "[Light Pink-Pastel Kawaii]": { "editor.background": "#ffffff" },
    "[Unrelated Theme]": { "editor.background": "#000000" }
  };

  assert.deepEqual(getThemeCustomizationBlocksExportFromObject(customizations, [darkVariant, lightVariant]), {
    dark: { "editor.background": "#31202b" },
    light: { "editor.background": "#ffffff" }
  });

  const removed = removeThemeCustomizationBlockFromObject(customizations, darkVariant);

  assert.deepEqual(removed, {
    "[Light Pink-Pastel Kawaii]": { "editor.background": "#ffffff" },
    "[Unrelated Theme]": { "editor.background": "#000000" }
  });
  assert.ok(Object.prototype.hasOwnProperty.call(customizations, "[Kawaii VS Code Color]"));
});

