import type { NeonEffectConfiguration, NeonEffectService } from "../services/NeonEffectService";
import { isThemeName } from "../../shared/models/theme";

export const COLOR_THEME_SETTING = "workbench.colorTheme";

export interface NeonEffectActions {
  enableNeon(): Promise<void>;
  disableNeon(): Promise<void>;
  isNeonEnabled(): boolean;
}

export interface ConfigurationChangeEventLike {
  affectsConfiguration(configuration: string): boolean;
}

export interface NeonEffectController {
  disableNeon(): Promise<void>;
  enableNeon(): Promise<void>;
  getSettingsActions(): NeonEffectActions;
  handleConfigurationChange(event: ConfigurationChangeEventLike): void;
  isNeonEnabled(): boolean;
}

export interface NeonEffectControllerDependencies {
  readonly getActiveColorThemeLabel: () => string;
  readonly getNeonConfiguration: () => NeonEffectConfiguration;
  readonly neonEffectService: NeonEffectService;
}

export function createNeonEffectController(dependencies: NeonEffectControllerDependencies): NeonEffectController {
  return new DefaultNeonEffectController(dependencies);
}

class DefaultNeonEffectController implements NeonEffectController {
  private activeColorThemeLabel: string;

  constructor(private readonly dependencies: NeonEffectControllerDependencies) {
    this.activeColorThemeLabel = dependencies.getActiveColorThemeLabel();
  }

  async enableNeon(): Promise<void> {
    await this.dependencies.neonEffectService.enable(this.dependencies.getNeonConfiguration());
  }

  async disableNeon(): Promise<void> {
    await this.dependencies.neonEffectService.disable();
  }

  isNeonEnabled(): boolean {
    return this.dependencies.neonEffectService.isEnabled();
  }

  getSettingsActions(): NeonEffectActions {
    return {
      enableNeon: () => this.enableNeon(),
      disableNeon: () => this.disableNeon(),
      isNeonEnabled: () => this.isNeonEnabled()
    };
  }

  handleConfigurationChange(event: ConfigurationChangeEventLike): void {
    if (!event.affectsConfiguration(COLOR_THEME_SETTING)) {
      return;
    }

    const previousThemeLabel = this.activeColorThemeLabel;
    const currentThemeLabel = this.dependencies.getActiveColorThemeLabel();
    this.activeColorThemeLabel = currentThemeLabel;

    if (
      previousThemeLabel === currentThemeLabel
      || !isKawaiiVsCodeColorTheme(previousThemeLabel)
      || !isKawaiiVsCodeColorTheme(currentThemeLabel)
      || !this.isNeonEnabled()
    ) {
      return;
    }

    void this.enableNeon();
  }
}

function isKawaiiVsCodeColorTheme(themeLabel: string): boolean {
  return isThemeName(themeLabel);
}
