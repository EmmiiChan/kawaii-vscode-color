const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildGeneratedTheme,
  buildGeneratedThemeFromColorPack,
  buildThemeVariant,
  compareColorVersions,
  createGitHubContentsApiUrl,
  createInternalThemeCatalog,
  createThemeColorPackUpdatePlan,
  getColorVersionLabel,
  normalizeThemeColorPack,
  parseGitHubThemesUrl,
  readJsoncFile,
  readRemoteThemeColorPacks,
  readThemeColorPacks,
  removeJsonComments,
  removeTrailingCommas,
  updateThemeColorPacksFromGitHub
} = require("../../scripts/build-color-theme");

const MOCK_GITHUB_THEMES_URL = "https://github.com/example/kawaii-vscode-color/tree/main/themes";
const MOCK_GITHUB_API_URL = "https://api.github.com/repos/example/kawaii-vscode-color/contents/themes?ref=main";

function createColorPackSource({ id, mode = "dark", name, version }) {
  return JSON.stringify({
    id,
    name,
    mode,
    version,
    colors: {
      "editor.background": "#101010"
    }
  }, null, 2);
}

function createGitHubListing(fileNames) {
  return JSON.stringify([
    {
      name: "README.md",
      type: "file",
      download_url: "https://raw.example/README.md"
    },
    ...fileNames.map((fileName) => ({
      name: fileName,
      type: "file",
      download_url: `https://raw.example/${fileName}`
    })),
    {
      name: "nested",
      type: "dir"
    }
  ]);
}

function createMockFetchText(responses) {
  return async (url) => {
    if (!responses.has(url)) {
      throw new Error(`Unexpected fetch: ${url}`);
    }

    return responses.get(url);
  };
}

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

test("theme color packs require metadata and numeric version", () => {
  const colorPack = normalizeThemeColorPack("themes/example-dark.json", {
    id: "example-dark",
    name: "Example Dark",
    mode: "dark",
    version: {
      major: 0,
      minor: 0,
      patch: 7
    },
    colors: {
      "editor.background": "#101010"
    },
    tokenColors: [
      {
        name: "Keyword",
        scope: "keyword",
        settings: {
          foreground: "#ff00ff"
        }
      }
    ]
  });

  assert.deepEqual(colorPack.version, { major: 0, minor: 0, patch: 7 });
  assert.equal(getColorVersionLabel(colorPack.version), "0.0.7");
  assert.equal(colorPack.fileName, "example-dark.json");
  assert.equal(colorPack.mode, "dark");

  assert.throws(
    () => normalizeThemeColorPack("themes/invalid.json", {
      id: "Invalid Name",
      name: "Invalid",
      mode: "dark",
      version: { major: 0, minor: 0, patch: 1 }
    }),
    /id must use lowercase kebab-case/
  );
  assert.throws(
    () => normalizeThemeColorPack("themes/invalid.json", {
      id: "invalid",
      name: "Invalid",
      mode: "dark",
      version: { major: 0, minor: 0, patch: 1000 }
    }),
    /version\.patch must be an integer from 0 to 999/
  );
});

test("readThemeColorPacks reads public theme packs in a stable order", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-theme-packs-"));
  t.after(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  });

  fs.writeFileSync(path.join(tempRoot, "z-light.json"), JSON.stringify({
    id: "z-light",
    name: "Z Light",
    mode: "light",
    version: { major: 0, minor: 0, patch: 2 },
    colors: {}
  }), "utf8");
  fs.writeFileSync(path.join(tempRoot, "a-dark.json"), JSON.stringify({
    id: "a-dark",
    name: "A Dark",
    mode: "dark",
    version: { major: 0, minor: 0, patch: 1 },
    colors: {}
  }), "utf8");

  assert.deepEqual(readThemeColorPacks(tempRoot).map((colorPack) => colorPack.id), [
    "a-dark",
    "z-light"
  ]);
});

test("GitHub themes URL resolves to the contents API endpoint", () => {
  assert.deepEqual(parseGitHubThemesUrl(MOCK_GITHUB_THEMES_URL), {
    folderPath: "themes",
    owner: "example",
    ref: "main",
    repository: "kawaii-vscode-color"
  });
  assert.equal(createGitHubContentsApiUrl(MOCK_GITHUB_THEMES_URL), MOCK_GITHUB_API_URL);
});

test("readRemoteThemeColorPacks reads JSON color packs from a GitHub folder listing", async () => {
  const responses = new Map([
    [MOCK_GITHUB_API_URL, createGitHubListing(["remote-dark.json"])],
    ["https://raw.example/remote-dark.json", [
      "{",
      "  // JSONC from GitHub is accepted",
      "  \"id\": \"remote-dark\",",
      "  \"name\": \"Remote Dark\",",
      "  \"mode\": \"dark\",",
      "  \"version\": { \"major\": 0, \"minor\": 0, \"patch\": 2 },",
      "  \"colors\": {",
      "    \"editor.background\": \"#101010\",",
      "  },",
      "}"
    ].join("\n")]
  ]);

  const colorPacks = await readRemoteThemeColorPacks(
    MOCK_GITHUB_THEMES_URL,
    createMockFetchText(responses)
  );

  assert.equal(colorPacks.length, 1);
  assert.equal(colorPacks[0].id, "remote-dark");
  assert.equal(colorPacks[0].sourceUrl, "https://raw.example/remote-dark.json");
  assert.deepEqual(colorPacks[0].version, { major: 0, minor: 0, patch: 2 });
});

test("readRemoteThemeColorPacks rejects GitHub JSON files that are not public color packs", async () => {
  const responses = new Map([
    [MOCK_GITHUB_API_URL, createGitHubListing(["kawaii_synthwave-color-theme.json"])],
    ["https://raw.example/kawaii_synthwave-color-theme.json", JSON.stringify({
      name: "Base Theme",
      type: "dark",
      colors: {}
    })]
  ]);

  await assert.rejects(
    () => readRemoteThemeColorPacks(MOCK_GITHUB_THEMES_URL, createMockFetchText(responses)),
    /must define a non-empty id/
  );
});

test("compareColorVersions sorts semantic color versions by major, minor, then patch", () => {
  assert.equal(compareColorVersions(
    { major: 1, minor: 0, patch: 0 },
    { major: 0, minor: 999, patch: 999 }
  ) > 0, true);
  assert.equal(compareColorVersions(
    { major: 0, minor: 2, patch: 0 },
    { major: 0, minor: 3, patch: 0 }
  ) < 0, true);
  assert.equal(compareColorVersions(
    { major: 0, minor: 0, patch: 7 },
    { major: 0, minor: 0, patch: 7 }
  ), 0);
});

test("createThemeColorPackUpdatePlan updates missing and newer remote packs only", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-theme-update-plan-"));
  const localPacks = [
    normalizeThemeColorPack(path.join(tempRoot, "same-dark.json"), {
      id: "same-dark",
      name: "Same Dark",
      mode: "dark",
      version: { major: 0, minor: 0, patch: 2 },
      colors: {}
    }),
    normalizeThemeColorPack(path.join(tempRoot, "old-dark.json"), {
      id: "old-dark",
      name: "Old Dark",
      mode: "dark",
      version: { major: 0, minor: 0, patch: 1 },
      colors: {}
    }),
    normalizeThemeColorPack(path.join(tempRoot, "ahead-dark.json"), {
      id: "ahead-dark",
      name: "Ahead Dark",
      mode: "dark",
      version: { major: 0, minor: 0, patch: 4 },
      colors: {}
    })
  ];
  const remotePacks = [
    {
      ...normalizeThemeColorPack(path.join(tempRoot, "missing-light.json"), {
        id: "missing-light",
        name: "Missing Light",
        mode: "light",
        version: { major: 0, minor: 0, patch: 1 },
        colors: {}
      }),
      source: "{}",
      sourceUrl: "https://raw.example/missing-light.json"
    },
    {
      ...normalizeThemeColorPack(path.join(tempRoot, "old-dark.json"), {
        id: "old-dark",
        name: "Old Dark",
        mode: "dark",
        version: { major: 0, minor: 0, patch: 2 },
        colors: {}
      }),
      source: "{}",
      sourceUrl: "https://raw.example/old-dark.json"
    },
    {
      ...normalizeThemeColorPack(path.join(tempRoot, "same-dark.json"), {
        id: "same-dark",
        name: "Same Dark",
        mode: "dark",
        version: { major: 0, minor: 0, patch: 2 },
        colors: {}
      }),
      source: "{}",
      sourceUrl: "https://raw.example/same-dark.json"
    },
    {
      ...normalizeThemeColorPack(path.join(tempRoot, "ahead-dark.json"), {
        id: "ahead-dark",
        name: "Ahead Dark",
        mode: "dark",
        version: { major: 0, minor: 0, patch: 3 },
        colors: {}
      }),
      source: "{}",
      sourceUrl: "https://raw.example/ahead-dark.json"
    }
  ];

  const plan = createThemeColorPackUpdatePlan(localPacks, remotePacks, tempRoot);

  assert.deepEqual(plan.updates.map((update) => ({
    id: update.colorPack.id,
    reason: update.reason
  })), [
    { id: "missing-light", reason: "missing" },
    { id: "old-dark", reason: "newer" }
  ]);
  assert.deepEqual(plan.skipped.map((skip) => ({
    id: skip.id,
    reason: skip.reason
  })), [
    { id: "same-dark", reason: "same-version" },
    { id: "ahead-dark", reason: "older-remote" }
  ]);
});

test("updateThemeColorPacksFromGitHub writes only missing or newer remote packs", async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-theme-update-"));
  t.after(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  });
  const oldDarkSource = createColorPackSource({
    id: "old-dark",
    name: "Old Dark Local",
    version: { major: 0, minor: 0, patch: 1 }
  });
  const sameDarkSource = createColorPackSource({
    id: "same-dark",
    name: "Same Dark Local",
    version: { major: 0, minor: 0, patch: 2 }
  });
  const remoteOldDarkSource = createColorPackSource({
    id: "old-dark",
    name: "Old Dark Remote",
    version: { major: 0, minor: 0, patch: 2 }
  });
  const remoteSameDarkSource = createColorPackSource({
    id: "same-dark",
    name: "Same Dark Remote",
    version: { major: 0, minor: 0, patch: 2 }
  });
  const remoteMissingLightSource = createColorPackSource({
    id: "missing-light",
    mode: "light",
    name: "Missing Light Remote",
    version: { major: 0, minor: 0, patch: 1 }
  });
  const responses = new Map([
    [MOCK_GITHUB_API_URL, createGitHubListing([
      "missing-light.json",
      "old-dark.json",
      "same-dark.json"
    ])],
    ["https://raw.example/missing-light.json", remoteMissingLightSource],
    ["https://raw.example/old-dark.json", remoteOldDarkSource],
    ["https://raw.example/same-dark.json", remoteSameDarkSource]
  ]);

  fs.writeFileSync(path.join(tempRoot, "old-dark.json"), oldDarkSource, "utf8");
  fs.writeFileSync(path.join(tempRoot, "same-dark.json"), sameDarkSource, "utf8");

  const result = await updateThemeColorPacksFromGitHub({
    fetchText: createMockFetchText(responses),
    githubThemesUrl: MOCK_GITHUB_THEMES_URL,
    themesDirectory: tempRoot
  });
  const updatedPacks = readThemeColorPacks(tempRoot);

  assert.deepEqual(result.updates.map((update) => update.colorPack.id), [
    "missing-light",
    "old-dark"
  ]);
  assert.deepEqual(result.skipped.map((skip) => skip.id), ["same-dark"]);
  assert.equal(updatedPacks.find((colorPack) => colorPack.id === "old-dark").name, "Old Dark Remote");
  assert.equal(updatedPacks.find((colorPack) => colorPack.id === "same-dark").name, "Same Dark Local");
  assert.equal(updatedPacks.find((colorPack) => colorPack.id === "missing-light").name, "Missing Light Remote");
  assert.ok(result.summaryLines.some((line) => line === "Applied updates: 2"));
});

test("updateThemeColorPacksFromGitHub dry-run plans writes without changing disk", async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-theme-update-dry-run-"));
  t.after(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  });
  const responses = new Map([
    [MOCK_GITHUB_API_URL, createGitHubListing(["missing-dark.json"])],
    ["https://raw.example/missing-dark.json", createColorPackSource({
      id: "missing-dark",
      name: "Missing Dark",
      version: { major: 0, minor: 0, patch: 1 }
    })]
  ]);

  const result = await updateThemeColorPacksFromGitHub({
    dryRun: true,
    fetchText: createMockFetchText(responses),
    githubThemesUrl: MOCK_GITHUB_THEMES_URL,
    themesDirectory: tempRoot
  });

  assert.deepEqual(result.updates.map((update) => update.colorPack.id), ["missing-dark"]);
  assert.equal(fs.existsSync(path.join(tempRoot, "missing-dark.json")), false);
  assert.ok(result.summaryLines.some((line) => line === "Planned updates: 1"));
});

test("internal theme catalog embeds generated themes from color packs", () => {
  const colorPack = normalizeThemeColorPack("themes/example-dark.json", {
    id: "example-dark",
    name: "Example Dark",
    mode: "dark",
    version: {
      major: 0,
      minor: 1,
      patch: 0
    },
    colors: {
      "editor.background": "#101010"
    },
    tokenColors: [
      {
        name: "Keyword",
        scope: "keyword",
        settings: {
          foreground: "#ff00ff"
        }
      }
    ]
  });
  const generatedTheme = buildGeneratedThemeFromColorPack(colorPack);
  const catalog = createInternalThemeCatalog([colorPack]);

  assert.equal(generatedTheme.name, "Example Dark");
  assert.equal(generatedTheme.type, "dark");
  assert.equal(generatedTheme.colors["editor.background"], "#101010");
  assert.equal(catalog.schemaVersion, 1);
  assert.deepEqual(catalog.themes.map((theme) => ({
    id: theme.id,
    versionLabel: theme.versionLabel,
    generatedName: theme.theme.name
  })), [
    {
      id: "example-dark",
      versionLabel: "0.1.0",
      generatedName: "Example Dark"
    }
  ]);
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
