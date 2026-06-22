export interface SettingsStateService {
  createSettingsState(context: unknown, webview: unknown): unknown;
}

export interface SettingsStateServiceDependencies {
  readonly createState: (context: unknown, webview: unknown) => unknown;
}

export function createSettingsStateService(dependencies: SettingsStateServiceDependencies): SettingsStateService {
  return {
    createSettingsState(context: unknown, webview: unknown): unknown {
      return dependencies.createState(context, webview);
    }
  };
}
