const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildGeneratedTheme,
  buildThemeVariant,
  readJsoncFile,
  removeJsonComments,
  removeTrailingCommas
} = require("../../scripts/build-color-theme");

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

test("JSONC parser helpers remove comments and trailing commas while preserving strings", () => {
  const jsoncSource = [
    "{",
    "  // remove this line comment",
    "  \"url\": \"https://example.test/path//keep\",",
    "  \"pattern\": \"/* keep this string */\",",
    "  \"items\": [",
    "    \"one\",",
    "    \"two\",",
    "  ],",
    "  /* remove this block comment */",
    "}"
  ].join("\n");

  const strictJsonSource = removeTrailingCommas(removeJsonComments(jsoncSource));
  const parsed = JSON.parse(strictJsonSource);

  assert.deepEqual(parsed, {
    url: "https://example.test/path//keep",
    pattern: "/* keep this string */",
    items: ["one", "two"]
  });
});

test("readJsoncFile reports contextual parse failures", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-theme-"));
  t.after(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  });
  const invalidThemePath = path.join(tempRoot, "invalid-theme.json");

  fs.writeFileSync(invalidThemePath, "{ invalid json }", "utf8");

  assert.throws(
    () => readJsoncFile(invalidThemePath),
    /Failed to parse .*invalid-theme\.json/
  );
});

test("buildGeneratedTheme merges semantic token colors by key", () => {
  const generatedTheme = buildGeneratedTheme(
    {
      tokenColors: [],
      semanticTokenColors: {
        class: "#111111",
        interface: "#222222"
      }
    },
    {
      semanticTokenColors: {
        class: "#ff7edb",
        function: "#72f1b8"
      }
    }
  );

  assert.deepEqual(generatedTheme.semanticTokenColors, {
    class: "#ff7edb",
    interface: "#222222",
    function: "#72f1b8"
  });
});

test("buildThemeVariant reads JSONC fixtures and writes strict formatted JSON", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-theme-"));
  t.after(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  });
  const baseThemePath = path.join(tempRoot, "base-theme.json");
  const overridesThemePath = path.join(tempRoot, "overrides-theme.json");
  const generatedThemePath = path.join(tempRoot, "generated-theme.json");

  fs.writeFileSync(baseThemePath, [
    "{",
    "  // Base comment",
    "  \"name\": \"Base\",",
    "  \"metadata\": \"https://example.test//keep\",",
    "  \"colors\": {",
    "    \"editor.background\": \"#000000\",",
    "  },",
    "  \"semanticTokenColors\": {",
    "    \"class\": \"#111111\",",
    "    \"interface\": \"#222222\",",
    "  },",
    "  \"tokenColors\": [",
    "    { \"name\": \"Keyword\", \"scope\": \"keyword\", \"settings\": { \"foreground\": \"#ff0000\" } },",
    "  ],",
    "}"
  ].join("\n"), "utf8");
  fs.writeFileSync(overridesThemePath, [
    "{",
    "  \"name\": \"Generated\",",
    "  \"colors\": {",
    "    \"editor.background\": \"#31202b\",",
    "    \"editor.foreground\": \"#fffafd\",",
    "  },",
    "  \"semanticTokenColors\": {",
    "    \"class\": \"#ff7edb\",",
    "    \"function\": \"#72f1b8\",",
    "  },",
    "  \"tokenColors\": [",
    "    { \"name\": \"Keyword\", \"scope\": \"keyword.control\", \"settings\": { \"foreground\": \"#fede5d\" } },",
    "    { \"name\": \"String\", \"scope\": \"string\", \"settings\": { \"foreground\": \"#ff8b39\" } },",
    "  ],",
    "}"
  ].join("\n"), "utf8");

  const summaryLines = buildThemeVariant({
    label: "Fixture",
    baseThemePath,
    overridesThemePath,
    generatedThemePath
  });
  const generatedSource = fs.readFileSync(generatedThemePath, "utf8");
  const generatedTheme = JSON.parse(generatedSource);

  assert.ok(generatedSource.endsWith("\n"));
  assert.equal(generatedTheme.name, "Generated");
  assert.equal(generatedTheme.metadata, "https://example.test//keep");
  assert.deepEqual(generatedTheme.colors, {
    "editor.background": "#31202b",
    "editor.foreground": "#fffafd"
  });
  assert.deepEqual(generatedTheme.semanticTokenColors, {
    class: "#ff7edb",
    interface: "#222222",
    function: "#72f1b8"
  });
  assert.deepEqual(generatedTheme.tokenColors, [
    {
      name: "Keyword",
      scope: "keyword.control",
      settings: {
        foreground: "#fede5d"
      }
    },
    {
      name: "String",
      scope: "string",
      settings: {
        foreground: "#ff8b39"
      }
    }
  ]);
  assert.ok(summaryLines.some((line) => line.includes("Generated")));
  assert.ok(summaryLines.some((line) => line.includes("Override colors: 2")));
  assert.ok(summaryLines.some((line) => line.includes("Override token rules: 2")));
});
