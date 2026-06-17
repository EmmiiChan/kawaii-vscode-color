const assert = require("node:assert/strict");
const test = require("node:test");

const { buildGeneratedTheme } = require("../../scripts/build-color-theme");

test("buildGeneratedTheme replaces color overrides by key", () => {
  const generatedTheme = buildGeneratedTheme(
    {
      name: "Base",
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#ffffff"
      },
      tokenColors: []
    },
    {
      name: "Generated",
      colors: {
        "editor.background": "#31202b"
      }
    }
  );

  assert.equal(generatedTheme.name, "Generated");
  assert.deepEqual(generatedTheme.colors, {
    "editor.background": "#31202b",
    "editor.foreground": "#ffffff"
  });
});

test("buildGeneratedTheme replaces token rules by matching name or scope and appends new rules", () => {
  const generatedTheme = buildGeneratedTheme(
    {
      tokenColors: [
        {
          name: "Keyword",
          scope: "keyword",
          settings: {
            foreground: "#ff0000"
          }
        },
        {
          name: "String",
          scope: "string",
          settings: {
            foreground: "#00ff00"
          }
        }
      ]
    },
    {
      tokenColors: [
        {
          name: "Keyword",
          scope: "keyword.control",
          settings: {
            foreground: "#ff7edb"
          }
        },
        {
          name: "Comment",
          scope: "comment",
          settings: {
            foreground: "#72f1b8"
          }
        }
      ]
    }
  );

  assert.deepEqual(generatedTheme.tokenColors, [
    {
      name: "Keyword",
      scope: "keyword.control",
      settings: {
        foreground: "#ff7edb"
      }
    },
    {
      name: "String",
      scope: "string",
      settings: {
        foreground: "#00ff00"
      }
    },
    {
      name: "Comment",
      scope: "comment",
      settings: {
        foreground: "#72f1b8"
      }
    }
  ]);
});

test("buildGeneratedTheme does not mutate input theme objects", () => {
  const baseTheme = {
    name: "Base",
    colors: {
      "editor.background": "#000000"
    },
    tokenColors: [
      {
        name: "Keyword",
        scope: "keyword",
        settings: {
          foreground: "#ff0000"
        }
      }
    ]
  };
  const overridesTheme = {
    name: "Generated",
    colors: {
      "editor.background": "#31202b"
    },
    tokenColors: [
      {
        name: "Keyword",
        scope: "keyword",
        settings: {
          foreground: "#ff7edb"
        }
      }
    ]
  };
  const originalBaseTheme = structuredClone(baseTheme);
  const originalOverridesTheme = structuredClone(overridesTheme);

  buildGeneratedTheme(baseTheme, overridesTheme);

  assert.deepEqual(baseTheme, originalBaseTheme);
  assert.deepEqual(overridesTheme, originalOverridesTheme);
});
