import {
  normalizeHexColor,
  removeThemeCustomizationBlockFromObject,
  resetTokenColorBlock,
  resetWorkbenchColorBlock,
  type PlainRecord,
  type ThemeVariant,
  type TokenRule,
  updateTokenColorBlock,
  updateWorkbenchColorBlock
} from "./settingsPersistence";
import type { SettingsStore } from "./settingsStore";

interface GeneratedTheme {
  readonly colors?: PlainRecord;
}

interface SettingsColorServiceDependencies {
  readonly colorThemeSetting: string;
  readonly getGeneratedTokenRule: (tokenIndex: number, themeVariant: ThemeVariant) => TokenRule | undefined;
  readonly getThemeVariantById: (themeVariantId: unknown) => ThemeVariant;
  readonly readGeneratedTheme: (themeVariant: ThemeVariant) => GeneratedTheme;
  readonly settingsStore: SettingsStore;
  readonly tokenCustomizationsSetting: string;
  readonly workbenchCustomizationsSetting: string;
}

export interface SettingsColorService {
  changeThemeVariant(themeVariantId: unknown): PromiseLike<void> | void;
  resetAllColorCustomizations(themeVariantId: unknown): Promise<void>;
  resetColorCustomization(section: string, id: unknown, themeVariantId: unknown): Promise<void>;
  updateColorCustomization(section: string, id: unknown, value: unknown, themeVariantId: unknown): Promise<void>;
}

export function createSettingsColorService(dependencies: SettingsColorServiceDependencies): SettingsColorService {
  const {
    colorThemeSetting,
    getGeneratedTokenRule,
    getThemeVariantById,
    readGeneratedTheme,
    settingsStore,
    tokenCustomizationsSetting,
    workbenchCustomizationsSetting
  } = dependencies;

  async function updateColorCustomization(section: string, id: unknown, value: unknown, themeVariantId: unknown): Promise<void> {
    const themeVariant = getThemeVariantById(themeVariantId);
    const colorValue = normalizeHexColor(value);

    if (section === "workbench") {
      await updateWorkbenchColor(String(id), colorValue, themeVariant);
      return;
    }

    if (section === "token") {
      await updateTokenColor(Number(id), colorValue, themeVariant);
      return;
    }

    throw new Error(`Unsupported color settings section: ${String(section)}`);
  }

  async function resetColorCustomization(section: string, id: unknown, themeVariantId: unknown): Promise<void> {
    const themeVariant = getThemeVariantById(themeVariantId);

    if (section === "workbench") {
      await resetWorkbenchColor(String(id), themeVariant);
      return;
    }

    if (section === "token") {
      await resetTokenColor(Number(id), themeVariant);
      return;
    }

    throw new Error(`Unsupported color settings section: ${String(section)}`);
  }

  function changeThemeVariant(themeVariantId: unknown): PromiseLike<void> | void {
    const themeVariant = getThemeVariantById(themeVariantId);
    return settingsStore.updateGlobalSetting(colorThemeSetting, themeVariant.label);
  }

  async function updateWorkbenchColor(colorId: string, colorValue: string, themeVariant: ThemeVariant): Promise<void> {
    const theme = readGeneratedTheme(themeVariant);

    if (!theme.colors || !Object.prototype.hasOwnProperty.call(theme.colors, colorId)) {
      throw new Error(`Unknown ${themeVariant.label} workbench color: ${colorId}`);
    }

    await settingsStore.updateGlobalSetting(
      workbenchCustomizationsSetting,
      updateWorkbenchColorBlock(
        settingsStore.getSettingsObject(workbenchCustomizationsSetting),
        colorId,
        colorValue,
        themeVariant
      )
    );
  }

  async function resetWorkbenchColor(colorId: string, themeVariant: ThemeVariant): Promise<void> {
    await settingsStore.updateSetting(
      workbenchCustomizationsSetting,
      resetWorkbenchColorBlock(
        settingsStore.getTargetSettingsObject(workbenchCustomizationsSetting, true),
        colorId,
        themeVariant
      ),
      true
    );

    if (settingsStore.canUpdateWorkspaceSettings()) {
      await settingsStore.updateSetting(
        workbenchCustomizationsSetting,
        resetWorkbenchColorBlock(
          settingsStore.getTargetSettingsObject(workbenchCustomizationsSetting, false),
          colorId,
          themeVariant
        ),
        false
      );
    }
  }

  async function updateTokenColor(tokenIndex: number, colorValue: string, themeVariant: ThemeVariant): Promise<void> {
    const tokenRule = getGeneratedTokenRule(tokenIndex, themeVariant);

    if (!tokenRule || !tokenRule.scope) {
      throw new Error(`Unknown ${themeVariant.label} token color index: ${tokenIndex}`);
    }

    await settingsStore.updateGlobalSetting(
      tokenCustomizationsSetting,
      updateTokenColorBlock(
        settingsStore.getSettingsObject(tokenCustomizationsSetting),
        tokenRule,
        colorValue,
        themeVariant
      )
    );
  }

  async function resetTokenColor(tokenIndex: number, themeVariant: ThemeVariant): Promise<void> {
    const tokenRule = getGeneratedTokenRule(tokenIndex, themeVariant);

    if (!tokenRule || !tokenRule.scope) {
      return;
    }

    await settingsStore.updateSetting(
      tokenCustomizationsSetting,
      resetTokenColorBlock(
        settingsStore.getTargetSettingsObject(tokenCustomizationsSetting, true),
        tokenRule,
        themeVariant
      ),
      true
    );

    if (settingsStore.canUpdateWorkspaceSettings()) {
      await settingsStore.updateSetting(
        tokenCustomizationsSetting,
        resetTokenColorBlock(
          settingsStore.getTargetSettingsObject(tokenCustomizationsSetting, false),
          tokenRule,
          themeVariant
        ),
        false
      );
    }
  }

  async function resetAllColorCustomizations(themeVariantId: unknown): Promise<void> {
    const themeVariant = getThemeVariantById(themeVariantId);

    await removeThemeCustomizationBlock(workbenchCustomizationsSetting, true, themeVariant);
    await removeThemeCustomizationBlock(tokenCustomizationsSetting, true, themeVariant);

    if (settingsStore.canUpdateWorkspaceSettings()) {
      await removeThemeCustomizationBlock(workbenchCustomizationsSetting, false, themeVariant);
      await removeThemeCustomizationBlock(tokenCustomizationsSetting, false, themeVariant);
    }
  }

  function removeThemeCustomizationBlock(settingName: string, isGlobalTarget: boolean, themeVariant: ThemeVariant): PromiseLike<void> | void {
    return settingsStore.updateSetting(
      settingName,
      removeThemeCustomizationBlockFromObject(
        settingsStore.getTargetSettingsObject(settingName, isGlobalTarget),
        themeVariant
      ),
      isGlobalTarget
    );
  }

  return {
    changeThemeVariant,
    resetAllColorCustomizations,
    resetColorCustomization,
    updateColorCustomization
  };
}
