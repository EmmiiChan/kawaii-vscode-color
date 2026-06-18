const { clonePlainObject } = require("./settingsPersistence");

function createSettingsStore(vscodeWorkspace) {
  function getConfiguration() {
    return vscodeWorkspace.getConfiguration();
  }

  function getSettingsObject(settingName) {
    return clonePlainObject(getConfiguration().get(settingName));
  }

  function getTargetSettingsObject(settingName, isGlobalTarget) {
    const configuration = getConfiguration();
    const inspection = typeof configuration.inspect === "function" ? configuration.inspect(settingName) : undefined;
    const targetValue = isGlobalTarget
      ? inspection && inspection.globalValue
      : inspection && inspection.workspaceValue;

    return clonePlainObject(targetValue);
  }

  function getConfigurationSettingValue(settingName) {
    const configuration = getConfiguration();
    const inspection = typeof configuration.inspect === "function" ? configuration.inspect(settingName) : undefined;

    if (inspection && Object.prototype.hasOwnProperty.call(inspection, "globalValue")) {
      return inspection.globalValue !== undefined
        ? inspection.globalValue
        : configuration.get(settingName);
    }

    return configuration.get(settingName);
  }

  function updateGlobalSetting(settingName, value) {
    return updateSetting(settingName, value, true);
  }

  function updateSetting(settingName, value, isGlobalTarget) {
    const shouldDeleteSetting = value
      && typeof value === "object"
      && !Array.isArray(value)
      && Object.keys(value).length === 0;
    const nextValue = shouldDeleteSetting ? undefined : value;

    return getConfiguration().update(settingName, nextValue, isGlobalTarget);
  }

  function canUpdateWorkspaceSettings() {
    return Boolean(
      vscodeWorkspace.workspaceFile
      || (vscodeWorkspace.workspaceFolders && vscodeWorkspace.workspaceFolders.length > 0)
    );
  }

  return {
    canUpdateWorkspaceSettings,
    getConfigurationSettingValue,
    getSettingsObject,
    getTargetSettingsObject,
    updateGlobalSetting,
    updateSetting
  };
}

module.exports = {
  createSettingsStore
};
