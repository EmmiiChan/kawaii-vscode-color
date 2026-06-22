export interface SettingsBundleService {
  applySettingsBundle(context: unknown, bundle: unknown): Promise<void>;
  configureSettingsSync(context: unknown): void;
  exportSettingsBundle(context: unknown): Promise<void>;
  importSettingsBundle(context: unknown): Promise<boolean>;
  importSettingsFromVsSync(context: unknown): Promise<boolean>;
  saveSettingsToVsSync(context: unknown): Promise<void>;
}

export interface SettingsBundleServiceDependencies {
  readonly applySettingsBundle: (context: unknown, bundle: unknown) => Promise<void> | void;
  readonly configureSettingsSync: (context: unknown) => void;
  readonly exportSettingsBundle: (context: unknown) => Promise<void> | void;
  readonly importSettingsBundle: (context: unknown) => Promise<boolean>;
  readonly importSettingsFromVsSync: (context: unknown) => Promise<boolean>;
  readonly saveSettingsToVsSync: (context: unknown) => Promise<void> | void;
}

export function createSettingsBundleService(dependencies: SettingsBundleServiceDependencies): SettingsBundleService {
  return new DefaultSettingsBundleService(dependencies);
}

class DefaultSettingsBundleService implements SettingsBundleService {
  constructor(private readonly dependencies: SettingsBundleServiceDependencies) {}

  async applySettingsBundle(context: unknown, bundle: unknown): Promise<void> {
    await this.dependencies.applySettingsBundle(context, bundle);
  }

  configureSettingsSync(context: unknown): void {
    this.dependencies.configureSettingsSync(context);
  }

  async exportSettingsBundle(context: unknown): Promise<void> {
    await this.dependencies.exportSettingsBundle(context);
  }

  async importSettingsBundle(context: unknown): Promise<boolean> {
    return this.dependencies.importSettingsBundle(context);
  }

  async importSettingsFromVsSync(context: unknown): Promise<boolean> {
    return this.dependencies.importSettingsFromVsSync(context);
  }

  async saveSettingsToVsSync(context: unknown): Promise<void> {
    await this.dependencies.saveSettingsToVsSync(context);
  }
}
