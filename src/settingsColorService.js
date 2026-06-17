const {
  normalizeHexColor,
  removeThemeCustomizationBlockFromObject,
  resetTokenColorBlock,
  resetWorkbenchColorBlock,
  updateTokenColorBlock,
  updateWorkbenchColorBlock
} = require("./settingsPersistence");

function createSettingsColorService(dependencies) {
  const {
    colorThemeSetting,
    getGeneratedTokenRule,
    getThemeVariantById,
    readGeneratedTheme,
    settingsStore,
    tokenCustomizationsSetting,
    workbenchCustomizationsSetting
  } = dependencies;

  async function updateColorCustomization(section, id, value, themeVariantId) {
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

  async function resetColorCustomization(section, id, themeVariantId) {
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

  function changeThemeVariant(themeVariantId) {
    const themeVariant = getThemeVariantById(themeVariantId);
    return settingsStore.updateGlobalSetting(colorThemeSetting, themeVariant.label);
  }

  async function updateWorkbenchColor(colorId, colorValue, themeVariant) {
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

  async function resetWorkbenchColor(colorId, themeVariant) {
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

  async function updateTokenColor(tokenIndex, colorValue, themeVariant) {
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

  async function resetTokenColor(tokenIndex, themeVariant) {
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

  async function resetAllColorCustomizations(themeVariantId) {
    const themeVariant = getThemeVariantById(themeVariantId);

    await removeThemeCustomizationBlock(workbenchCustomizationsSetting, true, themeVariant);
    await removeThemeCustomizationBlock(tokenCustomizationsSetting, true, themeVariant);

    if (settingsStore.canUpdateWorkspaceSettings()) {
      await removeThemeCustomizationBlock(workbenchCustomizationsSetting, false, themeVariant);
      await removeThemeCustomizationBlock(tokenCustomizationsSetting, false, themeVariant);
    }
  }

  function removeThemeCustomizationBlock(settingName, isGlobalTarget, themeVariant) {
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

module.exports = {
  createSettingsColorService
};

