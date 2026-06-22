import type { NeonEffectActions } from "./NeonEffectController";

export interface SettingsCommandController {
  configureSettingsSync(context: unknown): void;
  openSettings(context: unknown, actions: NeonEffectActions): Promise<void>;
}

export interface SettingsCommandControllerDependencies {
  readonly configureSettingsSync: (context: unknown) => void;
  readonly openSettings: (context: unknown, actions: NeonEffectActions) => Promise<void> | void;
}

export function createSettingsCommandController(dependencies: SettingsCommandControllerDependencies): SettingsCommandController {
  return new DefaultSettingsCommandController(dependencies);
}

class DefaultSettingsCommandController implements SettingsCommandController {
  constructor(private readonly dependencies: SettingsCommandControllerDependencies) {}

  configureSettingsSync(context: unknown): void {
    this.dependencies.configureSettingsSync(context);
  }

  async openSettings(context: unknown, actions: NeonEffectActions): Promise<void> {
    await this.dependencies.openSettings(context, actions);
  }
}
