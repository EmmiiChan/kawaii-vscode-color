import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  COLOR_THEME_SETTING,
  createNeonEffectController
} = requireOut<typeof import("../../src/extensionHost/controllers/NeonEffectController")>(
  "extensionHost",
  "controllers",
  "NeonEffectController"
);

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("NeonEffectController exposes settings actions that delegate to the service", async () => {
  const calls: unknown[][] = [];
  const controller = createNeonEffectController({
    getActiveColorThemeLabel: () => "Dark Pink Kawaii",
    getNeonConfiguration: () => ({ brightness: 0.3, disableGlow: true }),
    neonEffectService: {
      buildCustomChromeStyles: (chromeStyles) => chromeStyles,
      enable: async (configuration) => {
        calls.push(["enable", configuration]);
      },
      disable: async () => {
        calls.push(["disable"]);
      },
      isEnabled: () => {
        calls.push(["isEnabled"]);
        return true;
      }
    }
  });
  const actions = controller.getSettingsActions();

  await actions.enableNeon();
  await actions.disableNeon();

  assert.equal(actions.isNeonEnabled(), true);
  assert.deepEqual(calls, [
    ["enable", { brightness: 0.3, disableGlow: true }],
    ["disable"],
    ["isEnabled"]
  ]);
});

test("NeonEffectController regenerates Neon only when switching between Kawaii themes while active", async () => {
  const labels = [
    "Dark Pink Kawaii",
    "Light Pink-Pastel Kawaii",
    "Dark Pink Kawaii",
    "Default Dark+"
  ];
  const calls: unknown[][] = [];
  const controller = createNeonEffectController({
    getActiveColorThemeLabel: () => labels.shift() || "",
    getNeonConfiguration: () => ({ brightness: 0.4, disableGlow: false }),
    neonEffectService: {
      buildCustomChromeStyles: (chromeStyles) => chromeStyles,
      enable: async (configuration) => {
        calls.push(["enable", configuration]);
      },
      disable: async () => {
        calls.push(["disable"]);
      },
      isEnabled: () => {
        calls.push(["isEnabled"]);
        return true;
      }
    }
  });

  controller.handleConfigurationChange(createConfigurationEvent(COLOR_THEME_SETTING));
  controller.handleConfigurationChange(createConfigurationEvent(COLOR_THEME_SETTING));
  controller.handleConfigurationChange(createConfigurationEvent("editor.fontSize"));
  await Promise.resolve();

  assert.deepEqual(calls, [
    ["isEnabled"],
    ["enable", { brightness: 0.4, disableGlow: false }],
    ["isEnabled"],
    ["enable", { brightness: 0.4, disableGlow: false }]
  ]);
});

test("NeonEffectController still treats legacy Kawaii labels as the same theme family", async () => {
  const labels = [
    "Kawaii VS Code Color",
    "Kawaii VS Code Color Light"
  ];
  const calls: unknown[][] = [];
  const controller = createNeonEffectController({
    getActiveColorThemeLabel: () => labels.shift() || "",
    getNeonConfiguration: () => ({ brightness: 0.5, disableGlow: false }),
    neonEffectService: {
      buildCustomChromeStyles: (chromeStyles) => chromeStyles,
      enable: async (configuration) => {
        calls.push(["enable", configuration]);
      },
      disable: async () => {
        calls.push(["disable"]);
      },
      isEnabled: () => {
        calls.push(["isEnabled"]);
        return true;
      }
    }
  });

  controller.handleConfigurationChange(createConfigurationEvent(COLOR_THEME_SETTING));
  await Promise.resolve();

  assert.deepEqual(calls, [
    ["isEnabled"],
    ["enable", { brightness: 0.5, disableGlow: false }]
  ]);
});

function createConfigurationEvent(affectedConfiguration: string) {
  return {
    affectsConfiguration(configuration: string): boolean {
      return configuration === affectedConfiguration;
    }
  };
}
