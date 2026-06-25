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

test("NeonEffectController coalesces concurrent enables and reruns with latest configuration", async () => {
  const firstEnable = createDeferred();
  const calls: unknown[][] = [];
  const configurations = [
    { brightness: 0.2, disableGlow: false },
    { brightness: 0.4, disableGlow: false },
    { brightness: 0.8, disableGlow: true }
  ];
  const controller = createNeonEffectController({
    getActiveColorThemeLabel: () => "Dark Pink Kawaii",
    getNeonConfiguration: () => configurations.shift() || { brightness: 1, disableGlow: true },
    neonEffectService: {
      buildCustomChromeStyles: (chromeStyles) => chromeStyles,
      enable: async (configuration) => {
        calls.push(["enable", configuration]);

        if (calls.length === 1) {
          await firstEnable.promise;
        }
      },
      disable: async () => {
        calls.push(["disable"]);
      },
      isEnabled: () => true
    }
  });

  const first = controller.enableNeon();
  const second = controller.enableNeon();
  const third = controller.enableNeon();

  firstEnable.resolve();
  await Promise.all([first, second, third]);

  assert.deepEqual(calls, [
    ["enable", { brightness: 0.2, disableGlow: false }],
    ["enable", { brightness: 0.8, disableGlow: true }]
  ]);
});

test("NeonEffectController coalesces rapid Kawaii theme change regenerations", async () => {
  const firstEnable = createDeferred();
  const labels = [
    "Dark Pink Kawaii",
    "Light Pink-Pastel Kawaii",
    "Dark Pink Kawaii",
    "Light Pink-Pastel Kawaii"
  ];
  const calls: string[] = [];
  const controller = createNeonEffectController({
    getActiveColorThemeLabel: () => labels.shift() || "Light Pink-Pastel Kawaii",
    getNeonConfiguration: () => ({ brightness: calls.length / 10, disableGlow: false }),
    neonEffectService: {
      buildCustomChromeStyles: (chromeStyles) => chromeStyles,
      enable: async () => {
        calls.push("enable");

        if (calls.length === 1) {
          await firstEnable.promise;
        }
      },
      disable: async () => {
        calls.push("disable");
      },
      isEnabled: () => {
        calls.push("isEnabled");
        return true;
      }
    }
  });

  controller.handleConfigurationChange(createConfigurationEvent(COLOR_THEME_SETTING));
  controller.handleConfigurationChange(createConfigurationEvent(COLOR_THEME_SETTING));
  controller.handleConfigurationChange(createConfigurationEvent(COLOR_THEME_SETTING));

  firstEnable.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(calls, [
    "isEnabled",
    "enable",
    "isEnabled",
    "isEnabled",
    "enable"
  ]);
});

test("NeonEffectController lets disable clear stale queued enable reruns", async () => {
  const firstEnable = createDeferred();
  const calls: string[] = [];
  const controller = createNeonEffectController({
    getActiveColorThemeLabel: () => "Dark Pink Kawaii",
    getNeonConfiguration: () => ({ brightness: 0.3, disableGlow: false }),
    neonEffectService: {
      buildCustomChromeStyles: (chromeStyles) => chromeStyles,
      enable: async () => {
        calls.push("enable");
        await firstEnable.promise;
      },
      disable: async () => {
        calls.push("disable");
      },
      isEnabled: () => true
    }
  });

  const first = controller.enableNeon();
  const staleQueued = controller.enableNeon();
  const disabled = controller.disableNeon();

  firstEnable.resolve();
  await Promise.all([first, staleQueued, disabled]);

  assert.deepEqual(calls, ["enable", "disable"]);
});

function createConfigurationEvent(affectedConfiguration: string) {
  return {
    affectsConfiguration(configuration: string): boolean {
      return configuration === affectedConfiguration;
    }
  };
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}
