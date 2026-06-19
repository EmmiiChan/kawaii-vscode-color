import { clonePlainObject, type PlainRecord } from "./settingsPersistence";

type UpdateResult = PromiseLike<void> | void;

interface ConfigurationInspection {
  readonly globalValue?: unknown;
  readonly workspaceValue?: unknown;
}

interface WorkspaceConfiguration {
  get(settingName: string): unknown;
  inspect?(settingName: string): ConfigurationInspection | undefined;
  update(settingName: string, value: unknown, isGlobalTarget: boolean): UpdateResult;
}

interface VscodeWorkspaceLike {
  readonly workspaceFile?: unknown;
  readonly workspaceFolders?: readonly unknown[];
  getConfiguration(): WorkspaceConfiguration;
}

export interface SettingsStore {
  canUpdateWorkspaceSettings(): boolean;
  getConfigurationSettingValue(settingName: string): unknown;
  getSettingsObject(settingName: string): PlainRecord;
  getTargetSettingsObject(settingName: string, isGlobalTarget: boolean): PlainRecord;
  updateGlobalSetting(settingName: string, value: unknown): UpdateResult;
  updateSetting(settingName: string, value: unknown, isGlobalTarget: boolean): UpdateResult;
}

export function createSettingsStore(vscodeWorkspace: VscodeWorkspaceLike): SettingsStore {
  function getConfiguration(): WorkspaceConfiguration {
    return vscodeWorkspace.getConfiguration();
  }

  function getSettingsObject(settingName: string): PlainRecord {
    return clonePlainObject(getConfiguration().get(settingName));
  }

  function getTargetSettingsObject(settingName: string, isGlobalTarget: boolean): PlainRecord {
    const configuration = getConfiguration();
    const inspection = typeof configuration.inspect === "function" ? configuration.inspect(settingName) : undefined;
    const targetValue = isGlobalTarget
      ? inspection && inspection.globalValue
      : inspection && inspection.workspaceValue;

    return clonePlainObject(targetValue);
  }

  function getConfigurationSettingValue(settingName: string): unknown {
    const configuration = getConfiguration();
    const inspection = typeof configuration.inspect === "function" ? configuration.inspect(settingName) : undefined;

    if (inspection && Object.prototype.hasOwnProperty.call(inspection, "globalValue")) {
      return inspection.globalValue !== undefined
        ? inspection.globalValue
        : configuration.get(settingName);
    }

    return configuration.get(settingName);
  }

  function updateGlobalSetting(settingName: string, value: unknown): UpdateResult {
    return updateSetting(settingName, value, true);
  }

  function updateSetting(settingName: string, value: unknown, isGlobalTarget: boolean): UpdateResult {
    const shouldDeleteSetting = value
      && typeof value === "object"
      && !Array.isArray(value)
      && Object.keys(value).length === 0;
    const nextValue = shouldDeleteSetting ? undefined : value;

    return getConfiguration().update(settingName, nextValue, isGlobalTarget);
  }

  function canUpdateWorkspaceSettings(): boolean {
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
