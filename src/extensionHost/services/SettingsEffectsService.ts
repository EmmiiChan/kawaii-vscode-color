export interface SettingsEffectsService {
  applyAllEffects(): Promise<void>;
  downloadEditorBackgroundImage(context: unknown): Promise<void>;
  downloadEmptyEditorLogoImage(context: unknown): Promise<void>;
  removeEditorBackgroundImage(context: unknown): Promise<boolean>;
  removeEmptyEditorLogoImage(context: unknown): Promise<boolean>;
  selectEditorBackgroundImage(context: unknown): Promise<boolean>;
  selectEmptyEditorLogoImage(context: unknown): Promise<boolean>;
  selectRandomNekoEditorBackgroundImage(context: unknown): Promise<void>;
  selectRandomNekoEmptyEditorLogoImage(context: unknown): Promise<void>;
  updateEditorBackgroundFit(context: unknown, fit: unknown): Promise<void>;
  updateEditorBackgroundOpacity(context: unknown, opacity: unknown): Promise<void>;
  updateEmptyEditorLogoOpacity(context: unknown, opacity: unknown): Promise<void>;
}

export interface SettingsEffectsServiceDependencies {
  readonly applyAllEffects: () => Promise<void> | void;
  readonly downloadEditorBackgroundImage: (context: unknown) => Promise<void> | void;
  readonly downloadEmptyEditorLogoImage: (context: unknown) => Promise<void> | void;
  readonly removeEditorBackgroundImage: (context: unknown) => Promise<boolean>;
  readonly removeEmptyEditorLogoImage: (context: unknown) => Promise<boolean>;
  readonly selectEditorBackgroundImage: (context: unknown) => Promise<boolean>;
  readonly selectEmptyEditorLogoImage: (context: unknown) => Promise<boolean>;
  readonly selectRandomNekoEditorBackgroundImage: (context: unknown) => Promise<void> | void;
  readonly selectRandomNekoEmptyEditorLogoImage: (context: unknown) => Promise<void> | void;
  readonly updateEditorBackgroundFit: (context: unknown, fit: unknown) => Promise<void> | void;
  readonly updateEditorBackgroundOpacity: (context: unknown, opacity: unknown) => Promise<void> | void;
  readonly updateEmptyEditorLogoOpacity: (context: unknown, opacity: unknown) => Promise<void> | void;
}

export function createSettingsEffectsService(dependencies: SettingsEffectsServiceDependencies): SettingsEffectsService {
  return new DefaultSettingsEffectsService(dependencies);
}

class DefaultSettingsEffectsService implements SettingsEffectsService {
  constructor(private readonly dependencies: SettingsEffectsServiceDependencies) {}

  async applyAllEffects(): Promise<void> {
    await this.dependencies.applyAllEffects();
  }

  async downloadEditorBackgroundImage(context: unknown): Promise<void> {
    await this.dependencies.downloadEditorBackgroundImage(context);
  }

  async downloadEmptyEditorLogoImage(context: unknown): Promise<void> {
    await this.dependencies.downloadEmptyEditorLogoImage(context);
  }

  async removeEditorBackgroundImage(context: unknown): Promise<boolean> {
    return this.dependencies.removeEditorBackgroundImage(context);
  }

  async removeEmptyEditorLogoImage(context: unknown): Promise<boolean> {
    return this.dependencies.removeEmptyEditorLogoImage(context);
  }

  async selectEditorBackgroundImage(context: unknown): Promise<boolean> {
    return this.dependencies.selectEditorBackgroundImage(context);
  }

  async selectEmptyEditorLogoImage(context: unknown): Promise<boolean> {
    return this.dependencies.selectEmptyEditorLogoImage(context);
  }

  async selectRandomNekoEditorBackgroundImage(context: unknown): Promise<void> {
    await this.dependencies.selectRandomNekoEditorBackgroundImage(context);
  }

  async selectRandomNekoEmptyEditorLogoImage(context: unknown): Promise<void> {
    await this.dependencies.selectRandomNekoEmptyEditorLogoImage(context);
  }

  async updateEditorBackgroundFit(context: unknown, fit: unknown): Promise<void> {
    await this.dependencies.updateEditorBackgroundFit(context, fit);
  }

  async updateEditorBackgroundOpacity(context: unknown, opacity: unknown): Promise<void> {
    await this.dependencies.updateEditorBackgroundOpacity(context, opacity);
  }

  async updateEmptyEditorLogoOpacity(context: unknown, opacity: unknown): Promise<void> {
    await this.dependencies.updateEmptyEditorLogoOpacity(context, opacity);
  }
}
