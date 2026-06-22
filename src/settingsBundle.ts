import path = require("path");
import {
  ensurePlainObject,
  getThemeCustomizationBlocksExportFromObject,
  type PlainRecord,
  type ThemeVariant,
  writeThemeCustomizationBlock
} from "./settingsPersistence";
import type { SettingsStore } from "./settingsStore";

const SETTINGS_EXPORT_SCHEMA = "kawaii-vscode-color-settings";
const LEGACY_SETTINGS_EXPORT_SCHEMA = "kawaii-synthwave-settings";
const SETTINGS_EXPORT_SCHEMA_VERSION = 1;
const SYNC_SETTINGS_STATE_KEY = "kawaii_synthwave.syncedSettingsBundle";

interface SettingsBundle {
  readonly schema: string;
  readonly schemaVersion: number;
  readonly exportedAt?: string;
  readonly activeThemeVariantId?: unknown;
  readonly activeThemeLabel?: string;
  readonly extensionConfiguration?: unknown;
  readonly colorCustomizations?: unknown;
  readonly effects?: unknown;
}

interface ActiveThemeService {
  getActiveThemeVariant(): ThemeVariant;
  changeThemeVariant(themeVariantId: unknown): Promise<void> | void;
}

interface EffectsService {
  getEffectsExport(context: unknown): Promise<unknown> | unknown;
  applyEffectsExport(context: unknown, effects: unknown): Promise<void> | void;
}

interface FileSystemLike {
  readFile(filePath: string, encoding: BufferEncoding): Promise<string> | string;
  writeFile(filePath: string, content: string, encoding: BufferEncoding): Promise<void> | void;
}

interface UriLike {
  readonly fsPath?: string;
}

interface UriFactory {
  file(filePath: string): UriLike;
}

interface WindowLike {
  showInformationMessage(message: string): Promise<unknown> | unknown;
  showWarningMessage(message: string): Promise<unknown> | unknown;
  showSaveDialog(options: unknown): Promise<UriLike | undefined> | UriLike | undefined;
  showOpenDialog(options: unknown): Promise<UriLike[] | undefined> | UriLike[] | undefined;
}

interface GlobalStateLike {
  get(key: string): unknown;
  setKeysForSync?(keys: string[]): void;
  update(key: string, value: unknown): Promise<void> | void;
}

interface ExtensionContextLike {
  readonly globalState: GlobalStateLike;
}

interface SettingsBundleDependencies {
  readonly activeThemeService: ActiveThemeService;
  readonly brightnessSetting: string;
  readonly disableGlowSetting: string;
  readonly effectsService: EffectsService;
  readonly fileSystem: FileSystemLike;
  readonly homeDirectory: () => string;
  readonly now?: () => Date | string | number;
  readonly settingsExportFileName: string;
  readonly settingsStore: SettingsStore;
  readonly themeVariants: readonly ThemeVariant[];
  readonly tokenCustomizationsSetting: string;
  readonly uri: UriFactory;
  readonly window: WindowLike;
  readonly workbenchCustomizationsSetting: string;
}

export function normalizeBrightnessSetting(brightness: unknown): number {
  const numericBrightness = Number.parseFloat(String(brightness));

  if (!Number.isFinite(numericBrightness)) {
    return 0.45;
  }

  return Number(Math.min(1, Math.max(0, numericBrightness)).toFixed(2));
}

export function normalizeSettingsBundle(bundle: unknown): SettingsBundle {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new Error("Invalid Kawaii VS Code Color settings file.");
  }

  const normalizedBundle = bundle as SettingsBundle;

  if (![SETTINGS_EXPORT_SCHEMA, LEGACY_SETTINGS_EXPORT_SCHEMA].includes(normalizedBundle.schema)) {
    throw new Error("This JSON file is not a Kawaii VS Code Color settings export.");
  }

  if (normalizedBundle.schemaVersion !== SETTINGS_EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported Kawaii VS Code Color settings version: ${String(normalizedBundle.schemaVersion)}`);
  }

  return normalizedBundle;
}

export function getExtensionConfigurationExportFromStore(
  settingsStore: SettingsStore,
  options: Pick<SettingsBundleDependencies, "brightnessSetting" | "disableGlowSetting">
): PlainRecord {
  return {
    brightness: settingsStore.getConfigurationSettingValue(options.brightnessSetting),
    disableGlow: settingsStore.getConfigurationSettingValue(options.disableGlowSetting)
  };
}

export async function applyExtensionConfigurationExportToStore(
  settingsStore: SettingsStore,
  configuration: unknown,
  options: Pick<SettingsBundleDependencies, "brightnessSetting" | "disableGlowSetting">
): Promise<void> {
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

export function getColorCustomizationsExportFromStore(
  settingsStore: SettingsStore,
  options: Pick<SettingsBundleDependencies, "workbenchCustomizationsSetting" | "tokenCustomizationsSetting" | "themeVariants">
): { readonly workbench: Record<string, PlainRecord>; readonly token: Record<string, PlainRecord> } {
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

function getThemeCustomizationBlocksExportFromStore(
  settingsStore: SettingsStore,
  settingName: string,
  themeVariants: readonly ThemeVariant[]
): Record<string, PlainRecord> {
  return getThemeCustomizationBlocksExportFromObject(
    settingsStore.getTargetSettingsObject(settingName, true),
    themeVariants
  );
}

export async function applyColorCustomizationsExportToStore(
  settingsStore: SettingsStore,
  colorCustomizations: unknown,
  options: Pick<SettingsBundleDependencies, "workbenchCustomizationsSetting" | "tokenCustomizationsSetting" | "themeVariants">
): Promise<void> {
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

async function applyThemeCustomizationBlocksExportToStore(
  settingsStore: SettingsStore,
  settingName: string,
  blocks: PlainRecord,
  themeVariants: readonly ThemeVariant[]
): Promise<void> {
  const customizations = settingsStore.getTargetSettingsObject(settingName, true);

  themeVariants.forEach((themeVariant) => {
    if (!themeVariant.id) {
      return;
    }

    writeThemeCustomizationBlock(
      customizations,
      ensurePlainObject(blocks[themeVariant.id]),
      themeVariant
    );
  });

  await settingsStore.updateGlobalSetting(settingName, customizations);
}

export async function createSettingsBundle(context: unknown, dependencies: SettingsBundleDependencies): Promise<SettingsBundle> {
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

export async function applySettingsBundle(
  context: unknown,
  bundle: unknown,
  dependencies: SettingsBundleDependencies
): Promise<void> {
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

export function createSettingsBundleActions(dependencies: SettingsBundleDependencies) {
  function configureSettingsSync(context: ExtensionContextLike): void {
    if (
      context
      && context.globalState
      && typeof context.globalState.setKeysForSync === "function"
    ) {
      context.globalState.setKeysForSync([SYNC_SETTINGS_STATE_KEY]);
    }
  }

  async function saveSettingsToVsSync(context: ExtensionContextLike): Promise<void> {
    const bundle = await createSettingsBundle(context, dependencies);
    await context.globalState.update(SYNC_SETTINGS_STATE_KEY, bundle);
    dependencies.window.showInformationMessage("Kawaii VS Code Color settings saved to VS Code Settings Sync state.");
  }

  async function importSettingsFromVsSync(context: ExtensionContextLike): Promise<boolean> {
    const bundle = context.globalState.get(SYNC_SETTINGS_STATE_KEY);

    if (!bundle) {
      dependencies.window.showWarningMessage("No Kawaii VS Code Color settings bundle was found in VS Code Settings Sync state.");
      return false;
    }

    await applySettingsBundle(context, bundle, dependencies);
    dependencies.window.showInformationMessage("Kawaii VS Code Color settings restored from VS Code Settings Sync state.");
    return true;
  }

  async function exportSettingsBundle(context: ExtensionContextLike): Promise<boolean> {
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

  async function importSettingsBundle(context: ExtensionContextLike): Promise<boolean> {
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

    const sourceUri = selectedUris[0];

    if (!sourceUri || !sourceUri.fsPath) {
      throw new Error("Selected import file does not expose a local file path.");
    }

    const bundle = JSON.parse(await dependencies.fileSystem.readFile(sourceUri.fsPath, "utf8")) as unknown;
    await applySettingsBundle(context, bundle, dependencies);
    dependencies.window.showInformationMessage("Kawaii VS Code Color settings imported.");
    return true;
  }

  return {
    applySettingsBundle(context: ExtensionContextLike, bundle: unknown): Promise<void> {
      return applySettingsBundle(context, bundle, dependencies);
    },
    configureSettingsSync,
    createSettingsBundle(context: ExtensionContextLike): Promise<SettingsBundle> {
      return createSettingsBundle(context, dependencies);
    },
    exportSettingsBundle,
    importSettingsBundle,
    importSettingsFromVsSync,
    saveSettingsToVsSync
  };
}

function getIsoTimestamp(dependencies: Pick<SettingsBundleDependencies, "now">): string {
  const value = typeof dependencies.now === "function" ? dependencies.now() : new Date();

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
