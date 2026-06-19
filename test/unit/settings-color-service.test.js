const assert = require("node:assert/strict");
const test = require("node:test");

const { createSettingsColorService } = require("../../src/settingsColorService");

const WORKBENCH_SETTING = "workbench.colorCustomizations";
const TOKEN_SETTING = "editor.tokenColorCustomizations";
const COLOR_THEME_SETTING = "workbench.colorTheme";
const darkVariant = { id: "dark", label: "Kawaii VS Code Color" };
const lightVariant = { id: "light", label: "Kawaii VS Code Color Light" };
const themeVariants = { dark: darkVariant, light: lightVariant };

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function createMemoryStore(options = {}) {
  const globalSettings = clone(options.globalSettings || {});
  const workspaceSettings = clone(options.workspaceSettings || {});
  const updates = [];

  function writeSetting(settingName, value, isGlobalTarget) {
    const persistedValue = value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0
      ? undefined
      : value;
    const targetSettings = isGlobalTarget ? globalSettings : workspaceSettings;
    updates.push({ settingName, value: clone(persistedValue), target: isGlobalTarget });

    if (persistedValue === undefined) {
      delete targetSettings[settingName];
    } else {
      targetSettings[settingName] = clone(persistedValue);
    }

    return Promise.resolve();
  }

  return {
    updates,
    globalSettings,
    workspaceSettings,
    store: {
      canUpdateWorkspaceSettings() {
        return Boolean(options.canUpdateWorkspaceSettings);
      },
      getSettingsObject(settingName) {
        return clone(globalSettings[settingName] || {});
      },
      getTargetSettingsObject(settingName, isGlobalTarget) {
        const targetSettings = isGlobalTarget ? globalSettings : workspaceSettings;
        return clone(targetSettings[settingName] || {});
      },
      updateGlobalSetting(settingName, value) {
        return writeSetting(settingName, value, true);
      },
      updateSetting(settingName, value, isGlobalTarget) {
        return writeSetting(settingName, value, isGlobalTarget);
      }
    }
  };
}

function createService(store, overrides = {}) {
  return createSettingsColorService({
    colorThemeSetting: COLOR_THEME_SETTING,
    getGeneratedTokenRule(tokenIndex) {
      const tokenRules = overrides.tokenRules || [
        { scope: "comment", settings: { foreground: "#848bbd" } },
        { scope: ["source.js", "keyword"], settings: { foreground: "#fede5d" } }
      ];

      return tokenRules[tokenIndex];
    },
    getThemeVariantById(themeVariantId) {
      const variant = themeVariants[themeVariantId];

      if (!variant) {
        throw new Error(`Unsupported Kawaii VS Code Color theme variant: ${String(themeVariantId)}`);
      }

      return variant;
    },
    readGeneratedTheme() {
      return overrides.generatedTheme || {
        colors: {
          "editor.background": "#31202b",
          "sideBar.background": "#2c1925"
        }
      };
    },
    settingsStore: store,
    tokenCustomizationsSetting: TOKEN_SETTING,
    workbenchCustomizationsSetting: WORKBENCH_SETTING
  });
}

test("updateColorCustomization writes a validated workbench color to the global theme block", async () => {
  const { store, globalSettings, updates } = createMemoryStore({
    globalSettings: {
      [WORKBENCH_SETTING]: {
        "[Unrelated Theme]": { "editor.background": "#000000" }
      }
    }
  });
  const service = createService(store);

  await service.updateColorCustomization("workbench", "editor.background", " #abc ", "dark");

  assert.deepEqual(globalSettings[WORKBENCH_SETTING], {
    "[Unrelated Theme]": { "editor.background": "#000000" },
    "[Kawaii VS Code Color]": { "editor.background": "#abc" }
  });
  assert.deepEqual(updates, [
    {
      settingName: WORKBENCH_SETTING,
      value: globalSettings[WORKBENCH_SETTING],
      target: true
    }
  ]);
});

test("updateColorCustomization accepts supported hex formats and rejects invalid values without writing", async () => {
  const { store, globalSettings, updates } = createMemoryStore();
  const service = createService(store);

  for (const value of ["#abc", "#abcd", "#aabbcc", "#aabbccdd"]) {
    await service.updateColorCustomization("workbench", "editor.background", value, "dark");
    assert.equal(globalSettings[WORKBENCH_SETTING]["[Kawaii VS Code Color]"]["editor.background"], value);
  }

  const updateCountBeforeInvalidValue = updates.length;

  await assert.rejects(
    service.updateColorCustomization("workbench", "editor.background", "not-a-color", "dark"),
    /Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA\./
  );

  assert.equal(updates.length, updateCountBeforeInvalidValue);
});

test("updateColorCustomization keeps dark and light customizations isolated", async () => {
  const { store, globalSettings } = createMemoryStore();
  const service = createService(store);

  await service.updateColorCustomization("workbench", "editor.background", "#101820", "dark");
  await service.updateColorCustomization("workbench", "editor.background", "#f7f1ff", "light");

  assert.deepEqual(globalSettings[WORKBENCH_SETTING], {
    "[Kawaii VS Code Color]": { "editor.background": "#101820" },
    "[Kawaii VS Code Color Light]": { "editor.background": "#f7f1ff" }
  });
});

test("updateColorCustomization rejects unknown workbench colors without writing settings", async () => {
  const { store, updates } = createMemoryStore();
  const service = createService(store);

  await assert.rejects(
    service.updateColorCustomization("workbench", "unknown.color", "#ffffff", "dark"),
    /Unknown Kawaii VS Code Color workbench color: unknown\.color/
  );

  assert.deepEqual(updates, []);
});

test("updateColorCustomization writes token colors by replacing matching scopes or appending missing scopes", async () => {
  const { store, globalSettings } = createMemoryStore({
    globalSettings: {
      [TOKEN_SETTING]: {
        "[Kawaii VS Code Color]": {
          textMateRules: [
            { scope: "source.js, keyword", settings: { foreground: "#fede5d" } }
          ]
        }
      }
    }
  });
  const service = createService(store);

  await service.updateColorCustomization("token", 1, "#ffffff", "dark");
  await service.updateColorCustomization("token", 0, "#101010", "dark");

  assert.deepEqual(globalSettings[TOKEN_SETTING]["[Kawaii VS Code Color]"].textMateRules, [
    { scope: ["source.js", "keyword"], settings: { foreground: "#ffffff" } },
    { scope: "comment", settings: { foreground: "#101010" } }
  ]);
});

test("updateColorCustomization rejects unknown token indexes and unsupported sections without writing settings", async () => {
  const { store, updates } = createMemoryStore();
  const service = createService(store);

  await assert.rejects(
    service.updateColorCustomization("token", 10, "#ffffff", "dark"),
    /Unknown Kawaii VS Code Color token color index: 10/
  );
  await assert.rejects(
    service.updateColorCustomization("unknown", "editor.background", "#ffffff", "dark"),
    /Unsupported color settings section: unknown/
  );

  assert.deepEqual(updates, []);
});

test("resetColorCustomization removes workbench colors from global and workspace targets", async () => {
  const { store, globalSettings, workspaceSettings, updates } = createMemoryStore({
    canUpdateWorkspaceSettings: true,
    globalSettings: {
      [WORKBENCH_SETTING]: {
        "[Kawaii VS Code Color]": {
          "editor.background": "#000000",
          "sideBar.background": "#111111"
        }
      }
    },
    workspaceSettings: {
      [WORKBENCH_SETTING]: {
        "[Kawaii VS Code Color]": {
          "editor.background": "#222222"
        }
      }
    }
  });
  const service = createService(store);

  await service.resetColorCustomization("workbench", "editor.background", "dark");

  assert.deepEqual(globalSettings[WORKBENCH_SETTING], {
    "[Kawaii VS Code Color]": { "sideBar.background": "#111111" }
  });
  assert.equal(workspaceSettings[WORKBENCH_SETTING], undefined);
  assert.equal(updates.length, 2);
  assert.deepEqual(updates.map((update) => update.target), [true, false]);
});

test("resetColorCustomization removes token rules and keeps unknown token indexes as no-ops", async () => {
  const { store, globalSettings, updates } = createMemoryStore({
    globalSettings: {
      [TOKEN_SETTING]: {
        "[Kawaii VS Code Color]": {
          textMateRules: [
            { scope: "comment", settings: { foreground: "#848bbd" } }
          ]
        }
      }
    }
  });
  const service = createService(store);

  await service.resetColorCustomization("token", 10, "dark");
  assert.equal(updates.length, 0);

  await service.resetColorCustomization("token", 0, "dark");

  assert.equal(globalSettings[TOKEN_SETTING], undefined);
  assert.equal(updates.length, 1);
});

test("resetAllColorCustomizations removes workbench and token blocks from global and workspace targets", async () => {
  const { store, globalSettings, workspaceSettings, updates } = createMemoryStore({
    canUpdateWorkspaceSettings: true,
    globalSettings: {
      [WORKBENCH_SETTING]: {
        "[Kawaii VS Code Color]": { "editor.background": "#000000" },
        "[Unrelated Theme]": { "editor.background": "#111111" }
      },
      [TOKEN_SETTING]: {
        "[Kawaii VS Code Color]": { textMateRules: [{ scope: "comment" }] }
      }
    },
    workspaceSettings: {
      [WORKBENCH_SETTING]: {
        "[Kawaii VS Code Color]": { "editor.background": "#222222" }
      },
      [TOKEN_SETTING]: {
        "[Kawaii VS Code Color]": { textMateRules: [{ scope: "comment" }] }
      }
    }
  });
  const service = createService(store);

  await service.resetAllColorCustomizations("dark");

  assert.deepEqual(globalSettings[WORKBENCH_SETTING], {
    "[Unrelated Theme]": { "editor.background": "#111111" }
  });
  assert.equal(globalSettings[TOKEN_SETTING], undefined);
  assert.equal(workspaceSettings[WORKBENCH_SETTING], undefined);
  assert.equal(workspaceSettings[TOKEN_SETTING], undefined);
  assert.deepEqual(updates.map((update) => update.settingName), [
    WORKBENCH_SETTING,
    TOKEN_SETTING,
    WORKBENCH_SETTING,
    TOKEN_SETTING
  ]);
});

test("changeThemeVariant writes the selected color theme label globally", async () => {
  const { store, globalSettings, updates } = createMemoryStore();
  const service = createService(store);

  await service.changeThemeVariant("light");

  assert.equal(globalSettings[COLOR_THEME_SETTING], "Kawaii VS Code Color Light");
  assert.deepEqual(updates, [
    {
      settingName: COLOR_THEME_SETTING,
      value: "Kawaii VS Code Color Light",
      target: true
    }
  ]);
});
