const assert = require("node:assert/strict");
const test = require("node:test");

const {
  areScopesEqual,
  clonePlainObject,
  ensurePlainObject,
  findMatchingTokenRuleIndex,
  getTextMateRules,
  getThemeCustomizationBlocksExportFromObject,
  getThemeCustomizationKey,
  normalizeHexColor,
  removeThemeCustomizationBlockFromObject,
  resetTokenColorBlock,
  resetWorkbenchColorBlock,
  stringifyScope,
  updateTokenColorBlock,
  updateWorkbenchColorBlock,
  writeThemeCustomizationBlock
} = require("../../src/settingsPersistence");

const darkVariant = { id: "dark", label: "Kawaii VS Code Color" };
const lightVariant = { id: "light", label: "Kawaii VS Code Color Light" };

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
  assert.equal(getThemeCustomizationKey(darkVariant), "[Kawaii VS Code Color]");
  assert.equal(getThemeCustomizationKey(lightVariant), "[Kawaii VS Code Color Light]");
});

test("clonePlainObject and ensurePlainObject return safe plain objects", () => {
  const circular = {};
  circular.self = circular;

  assert.deepEqual(clonePlainObject(["not", "plain"]), {});
  assert.deepEqual(clonePlainObject(null), {});
  assert.deepEqual(clonePlainObject("value"), {});
  assert.deepEqual(clonePlainObject(circular), {});
  assert.deepEqual(ensurePlainObject(undefined), {});
  assert.deepEqual(ensurePlainObject({ nested: { value: 1 } }), { nested: { value: 1 } });

  const source = { nested: { value: 1 } };
  const clone = clonePlainObject(source);
  clone.nested.value = 2;
  assert.equal(source.nested.value, 1);
});

test("writeThemeCustomizationBlock writes non-empty blocks and deletes empty blocks", () => {
  const customizations = {
    "[Unrelated Theme]": { "editor.background": "#000000" }
  };

  writeThemeCustomizationBlock(customizations, { "editor.background": "#112233" }, darkVariant);

  assert.deepEqual(customizations, {
    "[Unrelated Theme]": { "editor.background": "#000000" },
    "[Kawaii VS Code Color]": { "editor.background": "#112233" }
  });

  writeThemeCustomizationBlock(customizations, {}, darkVariant);

  assert.deepEqual(customizations, {
    "[Unrelated Theme]": { "editor.background": "#000000" }
  });
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

  const updated = updateWorkbenchColorBlock(customizations, "editor.background", "#31202b", darkVariant);
  assert.equal(updated["[Kawaii VS Code Color]"]["editor.background"], "#31202b");
  assert.deepEqual(updated["[Unrelated Theme]"], { "editor.background": "#222222" });
  assert.equal(customizations["[Kawaii VS Code Color]"]["editor.background"], "#000000");

  const reset = resetWorkbenchColorBlock(updated, "editor.background", darkVariant);
  assert.deepEqual(reset["[Kawaii VS Code Color]"], { "sideBar.background": "#111111" });
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
  );

  assert.deepEqual(replaced["[Kawaii VS Code Color]"].textMateRules, [
    { scope: "comment", settings: { foreground: "#848bbd" } },
    { scope: "source.js, keyword", settings: { foreground: "#ffffff" } }
  ]);

  const appended = updateTokenColorBlock(replaced, { scope: "string" }, "#ff8b39", darkVariant);

  assert.deepEqual(appended["[Kawaii VS Code Color]"].textMateRules[2], {
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

  const withOneRule = resetTokenColorBlock(customizations, { scope: "comment" }, darkVariant);
  assert.deepEqual(withOneRule["[Kawaii VS Code Color]"].textMateRules, [
    { scope: "string", settings: { foreground: "#ff8b39" } }
  ]);

  const emptyBlock = resetTokenColorBlock(withOneRule, { scope: "string" }, darkVariant);
  assert.deepEqual(emptyBlock, {});
});

test("theme customization export and removal handle supported variants only", () => {
  const customizations = {
    "[Kawaii VS Code Color]": { "editor.background": "#31202b" },
    "[Kawaii VS Code Color Light]": { "editor.background": "#ffffff" },
    "[Unrelated Theme]": { "editor.background": "#000000" }
  };

  assert.deepEqual(getThemeCustomizationBlocksExportFromObject(customizations, [darkVariant, lightVariant]), {
    dark: { "editor.background": "#31202b" },
    light: { "editor.background": "#ffffff" }
  });

  const removed = removeThemeCustomizationBlockFromObject(customizations, darkVariant);

  assert.deepEqual(removed, {
    "[Kawaii VS Code Color Light]": { "editor.background": "#ffffff" },
    "[Unrelated Theme]": { "editor.background": "#000000" }
  });
  assert.ok(Object.prototype.hasOwnProperty.call(customizations, "[Kawaii VS Code Color]"));
});

