export type SettingsViewModel = Record<string, unknown>;

export function createSettingsViewModel(initialState: unknown): SettingsViewModel {
  return isRecord(initialState) ? initialState : {};
}

export function serializeSettingsViewModel(viewModel: SettingsViewModel): string {
  return JSON.stringify(viewModel).replace(/</g, "\\u003c");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
