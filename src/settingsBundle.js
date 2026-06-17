const path = require("path");
const {
  ensurePlainObject,
  getThemeCustomizationBlocksExportFromObject,
  writeThemeCustomizationBlock
} = require("./settingsPersistence");

const SETTINGS_EXPORT_SCHEMA = "kawaii-vscode-color-settings";
const LEGACY_SETTINGS_EXPORT_SCHEMA = "kawaii-synthwave-settings";
const SETTINGS_EXPORT_SCHEMA_VERSION = 1;
const SYNC_SETTINGS_STATE_KEY = "kawaii_synthwave.syncedSettingsBundle";

function normalizeBrightnessSetting(brightness) {
  const numericBrightness = Number.parseFloat(String(brightness));

  if (!Number.isFinite(numericBrightness)) {
    return 0.45;
  }

  return Number(Math.min(1, Math.max(0, numericBrightness)).toFixed(2));
}

function normalizeSettingsBundle(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new Error("Invalid Kawaii VS Code Color settings file.");
  }

  if (![SETTINGS_EXPORT_SCHEMA, LEGACY_SETTINGS_EXPORT_SCHEMA].includes(bundle.schema)) {
    throw new Error("This JSON file is not a Kawaii VS Code Color settings export.");
  }

  if (bundle.schemaVersion !== SETTINGS_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported Kawaii VS Code Color settings version: ${String(bundle.schemaVersion)}`);
  }

  return bundle;
}

function getExtensionConfigurationExportFromStore(settingsStore, options) {
  return {
    brightness: settingsStore.getConfigurationSettingValue(options.brightnessSetting),
    disableGlow: settingsStore.getConfigurationSettingValue(options.disableGlowSetting)
  };
}

async function applyExtensionConfigurationExportToStore(settingsStore, configuration, options) {
  const settings = ensurePlainObject(configuration);

  if (Object.prototype.hasOwnProperty.call(settings, "brightness")) {
    await settingsStore.updateGlobalSetting(
      options.brightnessSetting,
      normalizeBrightnessSetting(settings.brightness)
    );
  }

  if (Object.prototype.hasOwnProperty.call(settings, "disableGlow")) {
    await settingsStore.updateGlobalSetting(
      options.disableGlowSetting,
      Boolean(settings.disableGlow)
    );
  }
}

function getColorCustomizationsExportFromStore(settingsStore, options) {
  return {
    workbench: getThemeCustomizationBlocksExportFromStore(
      settingsStore,
      options.workbenchCustomizationsSetting,
      options.themeVariants
    ),
    token: getThemeCustomizationBlocksExportFromStore(
      settingsStore,
      options.tokenCustomizationsSetting,
      options.themeVariants
    )
  };
}

function getThemeCustomizationBlocksExportFromStore(settingsStore, settingName, themeVariants) {
  return getThemeCustomizationBlocksExportFromObject(
    settingsStore.getTargetSettingsObject(settingName, true),
    themeVariants
  );
}

async function applyColorCustomizationsExportToStore(settingsStore, colorCustomizations, options) {
  const customizations = ensurePlainObject(colorCustomizations);

  await applyThemeCustomizationBlocksExportToStore(
    settingsStore,
    options.workbenchCustomizationsSetting,
    ensurePlainObject(customizations.workbench),
    options.themeVariants
  );
  await applyThemeCustomizationBlocksExportToStore(
    settingsStore,
    options.tokenCustomizationsSetting,
    ensurePlainObject(customizations.token),
    options.themeVariants
  );
}

async function applyThemeCustomizationBlocksExportToStore(settingsStore, settingName, blocks, themeVariants) {
  const customizations = settingsStore.getTargetSettingsObject(settingName, true);

  themeVariants.forEach(function applyThemeBlock(themeVariant) {
    writeThemeCustomizationBlock(
      customizations,
      ensurePlainObject(blocks[themeVariant.id]),
      themeVariant
    );
  });

  await settingsStore.updateGlobalSetting(settingName, customizations);
}

async function createSettingsBundle(context, dependencies) {
  const activeThemeVariant = dependencies.activeThemeService.getActiveThemeVariant();

  return {
    schema: SETTINGS_EXPORT_SCHEMA,
    schemaVersion: SETTINGS_EXPORT_SCHEMA_VERSION,
    exportedAt: getIsoTimestamp(dependencies),
    activeThemeVariantId: activeThemeVariant.id,
    activeThemeLabel: activeThemeVariant.label,
    extensionConfiguration: getExtensionConfigurationExportFromStore(
      dependencies.settingsStore,
      dependencies
    ),
    colorCustomizations: getColorCustomizationsExportFromStore(
      dependencies.settingsStore,
      dependencies
    ),
    effects: await dependencies.effectsService.getEffectsExport(context)
  };
}

async function applySettingsBundle(context, bundle, dependencies) {
  const normalizedBundle = normalizeSettingsBundle(bundle);

  await applyExtensionConfigurationExportToStore(
    dependencies.settingsStore,
    normalizedBundle.extensionConfiguration,
    dependencies
  );
  await applyColorCustomizationsExportToStore(
    dependencies.settingsStore,
    normalizedBundle.colorCustomizations,
    dependencies
  );
  await dependencies.effectsService.applyEffectsExport(context, normalizedBundle.effects);

  if (normalizedBundle.activeThemeVariantId) {
    await dependencies.activeThemeService.changeThemeVariant(normalizedBundle.activeThemeVariantId);
  }
}

function createSettingsBundleActions(dependencies) {
  function configureSettingsSync(context) {
    if (
      context
      && context.globalState
      && typeof context.globalState.setKeysForSync === "function"
    ) {
      context.globalState.setKeysForSync([SYNC_SETTINGS_STATE_KEY]);
    }
  }

  async function saveSettingsToVsSync(context) {
    const bundle = await createSettingsBundle(context, dependencies);
    await context.globalState.update(SYNC_SETTINGS_STATE_KEY, bundle);
    dependencies.window.showInformationMessage("Kawaii VS Code Color settings saved to VS Code Settings Sync state.");
  }

  async function importSettingsFromVsSync(context) {
    const bundle = context.globalState.get(SYNC_SETTINGS_STATE_KEY);

    if (!bundle) {
      dependencies.window.showWarningMessage("No Kawaii VS Code Color settings bundle was found in VS Code Settings Sync state.");
      return false;
    }

    await applySettingsBundle(context, bundle, dependencies);
    dependencies.window.showInformationMessage("Kawaii VS Code Color settings restored from VS Code Settings Sync state.");
    return true;
  }

  async function exportSettingsBundle(context) {
    const targetUri = await dependencies.window.showSaveDialog({
      title: "Export Kawaii VS Code Color settings",
      defaultUri: dependencies.uri.file(path.join(dependencies.homeDirectory(), dependencies.settingsExportFileName)),
      filters: {
        JSON: ["json"]
      }
    });

    if (!targetUri) {
      return false;
    }

    if (!targetUri.fsPath) {
      throw new Error("Selected export target does not expose a local file path.");
    }

    const bundle = await createSettingsBundle(context, dependencies);
    await dependencies.fileSystem.writeFile(targetUri.fsPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    dependencies.window.showInformationMessage("Kawaii VS Code Color settings exported.");
    return true;
  }

  async function importSettingsBundle(context) {
    const selectedUris = await dependencies.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      title: "Import Kawaii VS Code Color settings",
      filters: {
        JSON: ["json"]
      }
    });

    if (!selectedUris || selectedUris.length === 0) {
      return false;
    }

    const sourcePath = selectedUris[0].fsPath;

    if (!sourcePath) {
      throw new Error("Selected import file does not expose a local file path.");
    }

    const bundle = JSON.parse(await dependencies.fileSystem.readFile(sourcePath, "utf8"));
    await applySettingsBundle(context, bundle, dependencies);
    dependencies.window.showInformationMessage("Kawaii VS Code Color settings imported.");
    return true;
  }

  return {
    applySettingsBundle(context, bundle) {
      return applySettingsBundle(context, bundle, dependencies);
    },
    configureSettingsSync,
    createSettingsBundle(context) {
      return createSettingsBundle(context, dependencies);
    },
    exportSettingsBundle,
    importSettingsBundle,
    importSettingsFromVsSync,
    saveSettingsToVsSync
  };
}

function getIsoTimestamp(dependencies) {
  const value = typeof dependencies.now === "function" ? dependencies.now() : new Date();

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

module.exports = {
  applyColorCustomizationsExportToStore,
  applyExtensionConfigurationExportToStore,
  applySettingsBundle,
  createSettingsBundle,
  createSettingsBundleActions,
  getColorCustomizationsExportFromStore,
  getExtensionConfigurationExportFromStore,
  normalizeBrightnessSetting,
  normalizeSettingsBundle
};

