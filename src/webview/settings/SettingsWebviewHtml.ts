import { createSettingsViewModel, type SettingsViewModel } from "./SettingsViewModel";

export interface SettingsWebviewLike {
  readonly cspSource?: string;
}

export interface SettingsWebviewHtmlOptions {
  readonly createLegacyHtml: (webview: SettingsWebviewLike, initialState: SettingsViewModel, nonce: string) => string;
  readonly initialState: unknown;
  readonly nonce: string;
  readonly webview: SettingsWebviewLike;
}

export function createSettingsWebviewContentSecurityPolicy(cspSource: string, nonce: string): string {
  return `default-src 'none'; img-src ${cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';`;
}

export function createSettingsWebviewHtml(options: SettingsWebviewHtmlOptions): string {
  return options.createLegacyHtml(
    options.webview,
    createSettingsViewModel(options.initialState),
    options.nonce
  );
}
