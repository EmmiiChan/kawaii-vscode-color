import type { NeonEffectConfiguration, NeonEffectService } from "../services/NeonEffectService";
import { isThemeName } from "../../shared/models/theme";
import { normalizeEffectFeatureSettings } from "../../shared/models/effects";

export const COLOR_THEME_SETTING = "workbench.colorTheme";

export interface NeonEffectActions {
  enableNeon(configuration?: NeonEffectConfigurationOverride): Promise<void>;
  disableNeon(): Promise<void>;
  isNeonEnabled(): boolean;
}

export interface ConfigurationChangeEventLike {
  affectsConfiguration(configuration: string): boolean;
}

export interface NeonEffectController {
  disableNeon(): Promise<void>;
  enableNeon(configuration?: NeonEffectConfigurationOverride): Promise<void>;
  getSettingsActions(): NeonEffectActions;
  handleConfigurationChange(event: ConfigurationChangeEventLike): void;
  isNeonEnabled(): boolean;
}

export type NeonEffectConfigurationOverride = Partial<NeonEffectConfiguration>;

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
  private disableInFlight: Promise<void> | undefined;
  private enableInFlight: Promise<void> | undefined;
  private enableRerunRequested = false;
  private pendingEnableConfiguration: NeonEffectConfiguration | undefined;

  constructor(private readonly dependencies: NeonEffectControllerDependencies) {
    this.activeColorThemeLabel = dependencies.getActiveColorThemeLabel();
  }

  async enableNeon(configuration?: NeonEffectConfigurationOverride): Promise<void> {
    this.pendingEnableConfiguration = this.createEnableConfiguration(configuration);

    if (this.disableInFlight) {
      await this.disableInFlight;
    }

    if (this.enableInFlight) {
      this.enableRerunRequested = true;
      return this.enableInFlight;
    }

    const enableRun = this.runQueuedEnableRequests();
    this.enableInFlight = enableRun;

    try {
      await enableRun;
    } finally {
      if (this.enableInFlight === enableRun) {
        this.enableInFlight = undefined;
      }
    }
  }

  async disableNeon(): Promise<void> {
    this.pendingEnableConfiguration = undefined;
    this.enableRerunRequested = false;

    if (this.disableInFlight) {
      return this.disableInFlight;
    }

    const disableRun = this.runDisableAfterEnable(this.enableInFlight);
    this.disableInFlight = disableRun;

    try {
      await disableRun;
    } finally {
      if (this.disableInFlight === disableRun) {
        this.disableInFlight = undefined;
      }
    }
  }

  isNeonEnabled(): boolean {
    return this.dependencies.neonEffectService.isEnabled();
  }

  getSettingsActions(): NeonEffectActions {
    return {
      enableNeon: (configuration) => this.enableNeon(configuration),
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

  private async runQueuedEnableRequests(): Promise<void> {
    do {
      this.enableRerunRequested = false;
      const configuration = this.pendingEnableConfiguration || this.dependencies.getNeonConfiguration();
      this.pendingEnableConfiguration = undefined;
      await this.dependencies.neonEffectService.enable(configuration);
    } while (this.enableRerunRequested);
  }

  private createEnableConfiguration(configuration?: NeonEffectConfigurationOverride): NeonEffectConfiguration {
    const baseConfiguration = this.dependencies.getNeonConfiguration();

    if (!configuration) {
      return baseConfiguration;
    }

    const hasFeatureOverride = Object.prototype.hasOwnProperty.call(configuration, "features");

    return {
      ...baseConfiguration,
      ...configuration,
      features: hasFeatureOverride
        ? normalizeEffectFeatureSettings(configuration.features)
        : baseConfiguration.features
    };
  }

  private async runDisableAfterEnable(enableRun: Promise<void> | undefined): Promise<void> {
    if (enableRun) {
      await enableRun.catch(() => undefined);
    }

    await this.dependencies.neonEffectService.disable();
  }
}

function isKawaiiVsCodeColorTheme(themeLabel: string): boolean {
  return isThemeName(themeLabel);
}
