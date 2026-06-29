// @ts-nocheck
const {
  createSettingsViewModel,
  serializeSettingsViewModel
} = require("./webview/settings/SettingsViewModel");
const {
  createSettingsWebviewContentSecurityPolicy
} = require("./webview/settings/SettingsWebviewHtml");

/**
 * Returns the full webview HTML document.
 *
 * @param {vscode.Webview} webview - VS Code webview.
 * @param {Record<string, unknown>} initialState - Initial UI state.
 * @returns {string} HTML document.
 */
function createSettingsWebviewHtml(webview, initialState, nonce = createNonce()) {
  const viewModel = createSettingsViewModel(initialState);
  const serializedState = serializeSettingsViewModel(viewModel);
  const contentSecurityPolicy = createSettingsWebviewContentSecurityPolicy(webview.cspSource || "vscode-resource:", nonce);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kawaii VS Code Color Settings</title>
  <style>
    :root {
      --panel-gap: 12px;
      --control-height: 30px;
      --border-color: var(--vscode-editorWidget-border);
      --muted-color: var(--vscode-descriptionForeground);
      --panel-bg: var(--vscode-editor-background);
      --row-bg: var(--vscode-editorWidget-background);
      --accent: var(--vscode-textLink-foreground);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--vscode-foreground);
      background: var(--panel-bg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .app {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
    }

    .sidebar {
      min-height: 100vh;
      padding: 14px 10px;
      background: var(--vscode-sideBar-background);
      border-right: 1px solid var(--border-color);
    }

    .brand {
      padding: 0 8px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .brand-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
    }

    .brand-subtitle {
      margin: 4px 0 0;
      color: var(--muted-color);
      font-size: 12px;
    }

    .nav {
      display: grid;
      gap: 4px;
      margin-top: 12px;
    }

    .nav-group {
      margin: 12px 8px 4px;
      color: var(--muted-color);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .nav-button {
      width: 100%;
      min-height: var(--control-height);
      padding: 6px 8px;
      color: var(--vscode-sideBar-foreground);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      text-align: left;
      cursor: pointer;
    }

    .nav-button:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .nav-button.active {
      color: var(--vscode-list-activeSelectionForeground);
      background: var(--vscode-list-activeSelectionBackground);
      border-color: var(--vscode-focusBorder);
    }

    .workspace {
      min-width: 0;
      min-height: 100vh;
      background: var(--panel-bg);
    }

    .shared-feedback {
      padding: 12px 28px 0;
    }

    .shared-feedback .effects-warning {
      margin-top: 0;
    }

    .shared-feedback .status {
      padding: 8px 0 0;
    }

    .page {
      min-height: 100vh;
    }

    .hidden {
      display: none !important;
    }

    .home {
      max-width: 860px;
      padding: 28px;
    }

    .home-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
    }

    .home-actions {
      display: flex;
      justify-content: flex-end;
    }

    .home-label {
      margin: 0 0 6px;
      color: var(--muted-color);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .home-title {
      margin: 0 0 10px;
      font-size: 24px;
      line-height: 1.2;
    }

    .home-text {
      margin: 0 0 18px;
      color: var(--vscode-foreground);
      line-height: 1.5;
    }

    .home-section {
      margin-top: 24px;
    }

    .home-section-title {
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--muted-color);
    }

    .link-list {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .link-button {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      min-height: 38px;
      padding: 8px 10px;
      overflow: hidden;
      color: var(--vscode-textLink-foreground);
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      text-align: left;
      cursor: pointer;
    }

    .link-button:hover {
      color: var(--vscode-textLink-activeForeground);
      border-color: var(--vscode-focusBorder);
    }

    .link-label {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .link-url {
      display: block;
      width: 100%;
      min-width: 0;
      margin-top: 2px;
      overflow: hidden;
      color: var(--muted-color);
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .neon-effect {
      max-width: 860px;
      min-width: 0;
      padding: 28px;
    }

    .neon-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0;
    }

    .disclaimer {
      min-width: 0;
      max-width: 100%;
      padding: 14px;
      color: var(--vscode-editorWarning-foreground, var(--vscode-foreground));
      background: var(--vscode-inputValidation-warningBackground, var(--vscode-editorWidget-background));
      border: 1px solid var(--vscode-inputValidation-warningBorder, var(--border-color));
      border-radius: 6px;
      overflow-wrap: anywhere;
    }

    .disclaimer-title {
      margin: 0 0 8px;
      font-weight: 700;
    }

    .disclaimer-list {
      margin: 0;
      padding-left: 18px;
      line-height: 1.5;
    }

    .workaround {
      margin-top: 18px;
      min-width: 0;
      max-width: 100%;
      padding: 14px;
      overflow: hidden;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow-wrap: anywhere;
    }

    .workaround-steps {
      display: grid;
      gap: 8px;
      margin: 0 0 14px;
      line-height: 1.5;
    }

    .workaround-step {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 6px;
    }

    .workaround-index {
      font-weight: 700;
      text-align: right;
    }

    .workaround-detail {
      min-width: 0;
    }

    .workaround-inline-link {
      display: grid;
      gap: 8px;
      margin-top: 8px;
      min-width: 0;
    }

    .workaround-links {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .neon-status {
      min-height: 0;
      margin: 12px 0;
      padding: 10px 12px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .neon-status:empty {
      display: none;
    }

    .neon-status[data-tone="busy"] {
      border-color: var(--vscode-progressBar-background, var(--vscode-focusBorder));
    }

    .neon-status[data-tone="success"] {
      border-color: var(--vscode-testing-iconPassed, var(--vscode-focusBorder));
    }

    .neon-status[data-tone="warning"] {
      border-color: var(--vscode-inputValidation-warningBorder, var(--border-color));
    }

    .neon-status[data-tone="error"] {
      border-color: var(--vscode-inputValidation-errorBorder, var(--border-color));
    }

    .effect-feature-list {
      display: grid;
      gap: 8px;
      margin: 16px 0;
    }

    .effect-feature {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      padding: 10px 12px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }

    .effect-feature input {
      margin-top: 2px;
    }

    .effect-feature-title {
      display: block;
      font-weight: 600;
    }

    .effect-feature-description {
      display: block;
      margin-top: 2px;
      color: var(--muted-color);
      font-size: 12px;
      line-height: 1.4;
    }

    .app-settings {
      max-width: 860px;
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      padding: 28px;
    }

    .settings-list {
      min-height: 0;
      margin-top: 18px;
      padding-right: 4px;
      overflow: auto;
    }

    .settings-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      padding: 12px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }

    .settings-row-title {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin: 0;
      font-size: 13px;
      font-weight: 700;
    }

    .settings-row-description,
    .settings-row-meta {
      margin: 4px 0 0;
      color: var(--muted-color);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .settings-info {
      position: relative;
      display: inline-flex;
      flex: 0 0 auto;
    }

    .settings-info-button {
      width: 18px;
      height: 18px;
      display: inline-grid;
      place-items: center;
      padding: 0;
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 50%;
      font-size: 11px;
      line-height: 1;
      cursor: help;
    }

    .settings-popover {
      position: absolute;
      z-index: 10;
      left: 0;
      top: 24px;
      width: min(320px, 70vw);
      display: none;
      padding: 8px 10px;
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      box-shadow: 0 4px 16px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.35));
      font-size: 12px;
      font-weight: 400;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .settings-info:hover .settings-popover,
    .settings-info:focus-within .settings-popover {
      display: block;
    }

    .switch-control {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .switch-control input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .switch-track {
      width: 42px;
      height: 22px;
      position: relative;
      display: inline-block;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 999px;
    }

    .switch-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      background: var(--vscode-foreground);
      border-radius: 50%;
      transition: left 120ms ease, background 120ms ease;
    }

    .switch-control input:checked + .switch-track {
      background: var(--vscode-button-background);
      border-color: var(--vscode-focusBorder);
    }

    .switch-control input:checked + .switch-track .switch-thumb {
      left: 23px;
      background: var(--vscode-button-foreground);
    }

    .switch-control input:focus + .switch-track {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    .settings-save-bar {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 0 0;
      margin-top: 12px;
      background: var(--panel-bg);
      border-top: 1px solid var(--border-color);
    }

    .settings-save-bar .button {
      min-width: 120px;
    }

    .color-settings {
      display: grid;
      grid-template-rows: auto auto auto auto auto auto auto auto 1fr auto;
    }

    .theme-mode {
      min-width: 0;
      padding: 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }

    .theme-mode-row {
      display: grid;
      grid-template-columns: minmax(180px, 260px) minmax(220px, 1fr);
      gap: 8px;
      align-items: center;
    }

    .theme-mode-label {
      color: var(--muted-color);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .theme-mode-description {
      margin: 8px 0 0;
      min-width: 0;
      max-width: 100%;
      color: var(--muted-color);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .theme-mode-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .sync-file-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }

    .sync-file-group {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
      padding: 12px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }

    .sync-file-copy {
      min-width: 0;
    }

    .sync-file-title {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 700;
    }

    .sync-file-description {
      margin: 0;
      color: var(--muted-color);
      font-size: 12px;
      line-height: 1.4;
    }

    .sync-file-buttons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 0;
    }

    .sync-file-buttons .button {
      width: 100%;
      min-width: 0;
      white-space: normal;
    }

    .effects-warning {
      margin-top: 12px;
      min-width: 0;
      max-width: 100%;
      padding: 10px 12px;
      color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
      background: var(--vscode-inputValidation-warningBackground, var(--vscode-editorWidget-background));
      border: 1px solid var(--vscode-inputValidation-warningBorder, var(--border-color));
      border-radius: 6px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .editor-background {
      min-width: 0;
      padding: 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }

    .editor-background-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
    }

    .editor-background-title {
      margin: 0;
      color: var(--muted-color);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .image-preview-column {
      display: grid;
      gap: 8px;
      min-width: 0;
      width: min(260px, 100%);
    }

    .image-preview-actions {
      display: grid;
      gap: 8px;
    }

    .image-preview-actions .button {
      min-width: 0;
      white-space: normal;
    }

    .image-source-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .editor-background-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
      gap: 12px;
      margin-top: 12px;
      align-items: center;
    }

    .image-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      display: grid;
      place-items: center;
      overflow: hidden;
      color: var(--muted-color);
      background-color: var(--vscode-editorWidget-background);
      background-position: center;
      background-repeat: no-repeat;
      background-size: contain;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 11px;
    }

    .image-preview.has-image {
      color: transparent;
    }

    .image-preview.is-loading {
      color: var(--vscode-foreground);
    }

    .image-preview-loading {
      position: absolute;
      inset: 0;
      display: none;
      place-items: center;
      padding: 10px;
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      text-align: center;
      overflow-wrap: anywhere;
    }

    .image-preview.is-loading .image-preview-loading {
      display: grid;
    }

    .editor-background-file {
      min-width: 0;
      padding: 8px 10px;
      overflow: hidden;
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .image-data-url-warning {
      margin: 8px 0 0;
      min-width: 0;
      max-width: 100%;
      color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .editor-background-options {
      display: grid;
      grid-template-columns: minmax(220px, 320px) minmax(220px, 1fr);
      gap: 12px;
      margin-top: 12px;
      align-items: center;
    }

    .fit-control {
      display: grid;
      grid-template-columns: auto minmax(150px, 1fr);
      gap: 8px;
      align-items: center;
      color: var(--muted-color);
      font-size: 12px;
    }

    .opacity-control {
      display: grid;
      grid-template-columns: auto minmax(120px, 1fr) 44px;
      gap: 8px;
      align-items: center;
      color: var(--muted-color);
      font-size: 12px;
    }

    .opacity-slider {
      width: 100%;
      min-width: 0;
    }

    .select {
      height: var(--control-height);
      min-width: 0;
      padding: 4px 8px;
      color: var(--vscode-dropdown-foreground);
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border, var(--border-color));
      outline-color: var(--vscode-focusBorder);
    }

    .section-divider {
      height: 0;
      margin: 0;
      border: 0;
      border-top: 1px solid var(--border-color);
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) auto auto;
      gap: 8px;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--vscode-editorGroupHeader-tabsBackground);
    }

    .search {
      height: var(--control-height);
      padding: 4px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border-color));
      outline-color: var(--vscode-focusBorder);
    }

    .button {
      min-height: var(--control-height);
      padding: 4px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }

    .button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .button.secondary {
      color: var(--vscode-foreground);
      background: var(--vscode-editorWidget-background);
      border-color: var(--border-color);
    }

    .tabs {
      display: flex;
      gap: 4px;
      padding: 8px 12px 0;
      background: var(--vscode-editor-background);
    }

    .tab {
      min-height: var(--control-height);
      padding: 5px 10px;
      color: var(--vscode-tab-inactiveForeground);
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      cursor: pointer;
    }

    .tab.active {
      color: var(--vscode-tab-activeForeground);
      border-bottom-color: var(--accent);
    }

    .content {
      padding: 12px;
      overflow: auto;
    }

    .section {
      margin-bottom: 18px;
    }

    .section-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted-color);
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .grid {
      display: grid;
      gap: 8px;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(220px, 1.2fr) 42px minmax(132px, 170px) auto;
      gap: 8px;
      align-items: start;
      padding: 8px;
      background: var(--row-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
    }

    .row-name {
      min-width: 0;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .meta {
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--muted-color);
      font-size: 11px;
    }

    .description {
      margin-top: 3px;
      color: var(--vscode-descriptionForeground, var(--muted-color));
      font-size: 11px;
      line-height: 1.4;
    }

    .picker {
      width: 42px;
      height: var(--control-height);
      padding: 0;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
    }

    .hex {
      width: 100%;
      height: var(--control-height);
      padding: 4px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--border-color));
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family);
      outline-color: var(--vscode-focusBorder);
    }

    .hex.invalid {
      border-color: var(--vscode-inputValidation-errorBorder);
      background: var(--vscode-inputValidation-errorBackground);
    }

    .reset {
      min-height: var(--control-height);
      padding: 4px 8px;
      color: var(--vscode-foreground);
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      cursor: pointer;
    }

    .reset:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .status {
      min-height: 18px;
      padding: 0 12px 8px;
      color: var(--muted-color);
      font-size: 12px;
    }

    .status:empty {
      display: none;
    }

    .empty {
      padding: 24px;
      color: var(--muted-color);
      text-align: center;
    }

    @media (max-width: 720px) {
      .app {
        grid-template-columns: 1fr;
      }

      .sidebar {
        min-height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--border-color);
      }

      .nav {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .nav-group {
        grid-column: 1 / -1;
      }

      .home {
        padding: 18px;
      }

      .app-settings {
        padding: 18px;
      }

      .home-header {
        grid-template-columns: 1fr;
      }

      .home-actions {
        justify-content: flex-start;
      }

      .neon-effect {
        padding: 18px;
      }

      .toolbar {
        grid-template-columns: 1fr;
      }

      .theme-mode-row {
        grid-template-columns: 1fr;
      }

      .settings-row {
        grid-template-columns: 1fr;
      }

      .settings-save-bar {
        justify-content: stretch;
      }

      .settings-save-bar .button {
        width: 100%;
      }

      .sync-file-actions,
      .sync-file-buttons {
        grid-template-columns: 1fr;
      }

      .editor-background-header,
      .editor-background-details,
      .editor-background-options {
        grid-template-columns: 1fr;
      }

      .image-preview-column {
        width: 100%;
      }

      .row {
        grid-template-columns: 1fr 42px minmax(120px, 1fr);
      }

      .reset {
        grid-column: 1 / -1;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <h1 class="brand-title">Kawaii VS Code Color</h1>
        <p class="brand-subtitle">Theme setup</p>
      </div>
      <nav class="nav" aria-label="Kawaii VS Code Color settings">
        <button class="nav-button active" data-page="home" type="button">Home</button>
        <div class="nav-group">Settings</div>
        <button class="nav-button" data-page="settings" type="button">Settings</button>
        <button class="nav-button" data-page="color-settings" type="button">Color Settings</button>
        <button class="nav-button" data-page="neon-effect" type="button">Effects</button>
        <button class="nav-button" data-page="image-customization" type="button">Image Customization</button>
        <button class="nav-button" data-page="sync-files" type="button">Sync / Files</button>
        <button class="nav-button" data-page="help" type="button">Help</button>
      </nav>
    </aside>
    <div class="workspace">
      <div class="shared-feedback" aria-live="polite">
        <div id="effects-warning" class="effects-warning hidden" role="status"></div>
        <div id="status" class="status"></div>
      </div>
      <section id="home-page" class="page">
        <div class="home">
          <div class="home-header">
            <div>
              <p class="home-label">Kawaii VS Code Color</p>
              <h2 class="home-title">Dark pink and light pastel VS Code theme setup</h2>
            </div>
            <div class="home-actions">
              <button id="home-apply-effects" class="button" type="button">Apply Effects</button>
            </div>
          </div>
          <p class="home-text">Kawaii VS Code Color focuses on dark pink and light green pastel-pink themes. It is inspired by SynthWave '84 and Sakura Theme, and was originally forked from SynthWave '84. This setup page keeps local user customization in VS Code settings and preserves the repository theme files as source assets.</p>
          <p class="home-text">Use Color Settings to edit theme-specific colors, Sync / Files to move settings between installs, and Image Customization to manage image-backed effects. Random Neko image inputs use Nekos.moe and were inspired by CatgirlDownloader.</p>
          <section class="home-section" aria-labelledby="references-title">
            <h3 id="references-title" class="home-section-title">References</h3>
            <div id="documentation-links" class="link-list"></div>
          </section>
        </div>
      </section>
      <section id="settings-page" class="page hidden">
        <div class="app-settings">
          <div>
            <p class="home-label">Settings</p>
            <h2 class="home-title">Application settings</h2>
            <p class="home-text">These options write directly to VS Code user settings and are refreshed from the current editor state whenever this page opens.</p>
          </div>
          <div class="settings-list" aria-label="Application settings list">
            <section class="settings-row" aria-labelledby="startup-editor-setting-title">
              <div>
                <h3 id="startup-editor-setting-title" class="settings-row-title">
                  <span>Open VS Code Welcome page on startup</span>
                  <span class="settings-info">
                    <button class="settings-info-button" type="button" aria-label="Show startup editor setting info" aria-describedby="startup-editor-setting-info">?</button>
                    <span id="startup-editor-setting-info" class="settings-popover" role="tooltip">Controls VS Code workbench.startupEditor. Enabled saves welcomePage so VS Code opens the native Welcome page. Disabled saves none.</span>
                  </span>
                </h3>
                <p class="settings-row-description">Open the native VS Code Welcome page when VS Code starts.</p>
                <p id="startup-editor-setting-meta" class="settings-row-meta"></p>
              </div>
              <label class="switch-control" for="startup-editor-toggle">
                <input id="startup-editor-toggle" type="checkbox">
                <span class="switch-track" aria-hidden="true">
                  <span class="switch-thumb"></span>
                </span>
              </label>
            </section>
          </div>
          <div class="settings-save-bar">
            <button id="save-application-settings" class="button" type="button">Save</button>
          </div>
        </div>
      </section>
      <section id="neon-effect-page" class="page hidden">
        <div class="neon-effect">
          <p class="home-label">Effects</p>
          <h2 class="home-title">Configure Kawaii UI effects</h2>
          <p class="home-text">Effects add modular editor chrome styling that VS Code color themes cannot express through normal theme JSON.</p>
          <div class="effect-feature-list" aria-label="Effect modules">
            <label class="effect-feature" for="effect-feature-foundation">
              <input id="effect-feature-foundation" type="checkbox" data-effect-feature="foundation">
              <span>
                <span class="effect-feature-title">Foundation / Runtime Layer</span>
                <span class="effect-feature-description">Installs or removes the wrapper script and shared stylesheet.</span>
              </span>
            </label>
            <label class="effect-feature" for="effect-feature-editor-background">
              <input id="effect-feature-editor-background" type="checkbox" data-effect-feature="editorBackground">
              <span>
                <span class="effect-feature-title">Editor Background</span>
                <span class="effect-feature-description">Applies the editor gradient, background image, opacity, and fit area.</span>
              </span>
            </label>
            <label class="effect-feature" for="effect-feature-no-page-logo">
              <input id="effect-feature-no-page-logo" type="checkbox" data-effect-feature="noPageLogo">
              <span>
                <span class="effect-feature-title">No-Page Logo</span>
                <span class="effect-feature-description">Replaces the empty editor watermark logo when no tab is open.</span>
              </span>
            </label>
            <label class="effect-feature" for="effect-feature-glow">
              <input id="effect-feature-glow" type="checkbox" data-effect-feature="glow">
              <span>
                <span class="effect-feature-title">Glow Effects</span>
                <span class="effect-feature-description">Applies syntax glow, active tab glow, activity indicators, and lightbulb styling.</span>
              </span>
            </label>
          </div>
          <div class="neon-actions">
            <button id="enable-neon" class="button" type="button">Enable Effects</button>
            <button id="disable-neon" class="button secondary" type="button">Disable Effects</button>
          </div>
          <div id="neon-status" class="status neon-status"></div>
          <div class="workaround">
            <p class="disclaimer-title">Corruption warning workaround</p>
            <div class="workaround-steps">
              <div class="workaround-step">
                <span class="workaround-index">1.</span>
                <span>If VS Code shows an installation corrupt or unsupported warning after enabling the effect, treat it as expected while this patch is active.</span>
              </div>
              <div class="workaround-step">
                <span class="workaround-index">2.</span>
                <span>If you only want to hide the warning, use the warning notification option to stop showing it again.</span>
              </div>
              <div class="workaround-step">
                <span class="workaround-index">3.</span>
                <div class="workaround-detail">
                  <span>Optional community workaround: install the checksum-fix extension below and follow its command instructions. This also changes VS Code internals, so use it only if you accept that risk.</span>
                  <div id="checksum-fix-link" class="workaround-inline-link"></div>
                </div>
              </div>
              <div class="workaround-step">
                <span class="workaround-index">4.</span>
                <span>To restore the supported state, disable Effects and reinstall or repair VS Code so the modified workbench files are replaced.</span>
              </div>
            </div>
            <div id="corruption-warning-links" class="workaround-links"></div>
          </div>
          <div class="disclaimer">
            <p class="disclaimer-title">Potential side effects</p>
            <ul class="disclaimer-list">
              <li>Enabling Effects modifies installed VS Code workbench files by adding a generated script reference.</li>
              <li>VS Code can show an unsupported or corrupted installation warning after the patch.</li>
              <li>Administrator permissions may be required on Windows depending on the install location.</li>
              <li>VS Code updates can overwrite the patch, so the effect may need to be enabled again after updates.</li>
              <li>Disable Effects before troubleshooting editor startup or workbench rendering issues.</li>
            </ul>
          </div>
        </div>
      </section>
      <section id="image-customization-page" class="page hidden">
        <div class="home">
          <div class="home-header">
            <div>
              <p class="home-label">Image Customization</p>
              <h2 class="home-title">Editor background and no-tab logo</h2>
            </div>
            <div class="home-actions">
              <button id="apply-effects" class="button" type="button">Apply Effects</button>
            </div>
          </div>
          <p class="home-text">Image-backed effects use VS Code settings and the Kawaii Neon runtime. Uploads, opacity, fit area, random image selection, removal, and downloads are managed here.</p>
          <p class="home-text">Image changes do not auto-apply. Click Apply Effects, then reload VS Code when prompted.</p>
          <section class="editor-background" aria-labelledby="editor-background-title">
            <div class="editor-background-header">
              <div>
                <h2 id="editor-background-title" class="editor-background-title">Editor Background Image</h2>
                <p class="theme-mode-description">Upload a local image for the editor background. Image changes apply through Effects and take effect after VS Code reloads.</p>
                <p id="editor-background-data-url-warning" class="image-data-url-warning"></p>
              </div>
            </div>
            <div class="editor-background-details">
              <div class="image-preview-column">
                <div id="editor-background-preview" class="image-preview"></div>
                <div class="image-preview-actions">
                  <div class="image-source-actions">
                    <button id="editor-background-upload" class="button" type="button">Upload Image</button>
                    <button id="editor-background-random-neko" class="button" type="button">Random Neko</button>
                  </div>
                  <button id="editor-background-remove" class="button secondary" type="button">Remove Image</button>
                  <button id="editor-background-download" class="button secondary" type="button">Download Image</button>
                </div>
              </div>
              <div id="editor-background-file" class="editor-background-file"></div>
              <label class="opacity-control" for="editor-background-opacity">
                <span>Opacity</span>
                <input id="editor-background-opacity" class="opacity-slider" type="range">
                <span id="editor-background-opacity-value"></span>
              </label>
            </div>
            <div class="editor-background-options">
              <label class="fit-control" for="editor-background-fit">
                <span>Fit area</span>
                <select id="editor-background-fit" class="select"></select>
              </label>
              <p id="editor-background-fit-description" class="theme-mode-description"></p>
            </div>
          </section>
          <hr class="section-divider">
          <section class="editor-background" aria-labelledby="empty-editor-logo-title">
            <div class="editor-background-header">
              <div>
                <h2 id="empty-editor-logo-title" class="editor-background-title">No-tab Logo</h2>
                <p class="theme-mode-description">Upload a local image to replace the VS Code watermark logo shown when there are no open editor tabs. Image changes apply through Effects and take effect after VS Code reloads.</p>
                <p id="empty-editor-logo-data-url-warning" class="image-data-url-warning"></p>
              </div>
            </div>
            <div class="editor-background-details">
              <div class="image-preview-column">
                <div id="empty-editor-logo-preview" class="image-preview"></div>
                <div class="image-preview-actions">
                  <div class="image-source-actions">
                    <button id="empty-editor-logo-upload" class="button" type="button">Upload Logo</button>
                    <button id="empty-editor-logo-random-neko" class="button" type="button">Random Neko</button>
                  </div>
                  <button id="empty-editor-logo-remove" class="button secondary" type="button">Remove Logo</button>
                  <button id="empty-editor-logo-download" class="button secondary" type="button">Download Logo</button>
                </div>
              </div>
              <div id="empty-editor-logo-file" class="editor-background-file"></div>
              <label class="opacity-control" for="empty-editor-logo-opacity">
                <span>Opacity</span>
                <input id="empty-editor-logo-opacity" class="opacity-slider" type="range">
                <span id="empty-editor-logo-opacity-value"></span>
              </label>
            </div>
          </section>
        </div>
      </section>
      <section id="sync-files-page" class="page hidden">
        <div class="home">
          <p class="home-label">Sync / Files</p>
          <h2 class="home-title">Settings Sync and JSON import/export</h2>
          <p class="home-text">Save a Kawaii VS Code Color settings bundle to VS Code Settings Sync, restore it on another synced installation, or use JSON import/export for explicit file transfer.</p>
          <p class="home-text">These actions preserve repository theme files and write user-local customization to VS Code settings only.</p>
          <div class="sync-file-actions" aria-label="Settings Sync and file actions">
            <section class="sync-file-group" aria-labelledby="settings-sync-actions-title">
              <div class="sync-file-copy">
                <h3 id="settings-sync-actions-title" class="sync-file-title">Settings Sync</h3>
                <p class="sync-file-description">Store or restore the current bundle through VS Code synced extension state.</p>
              </div>
              <div class="sync-file-buttons">
                <button id="save-vssync" class="button" type="button">Save to VSSync</button>
                <button id="import-vssync" class="button secondary" type="button">Import VSSync</button>
              </div>
            </section>
            <section class="sync-file-group" aria-labelledby="settings-file-actions-title">
              <div class="sync-file-copy">
                <h3 id="settings-file-actions-title" class="sync-file-title">JSON Files</h3>
                <p class="sync-file-description">Export a portable settings file or import a previously saved bundle.</p>
              </div>
              <div class="sync-file-buttons">
                <button id="export-settings" class="button" type="button">Export As</button>
                <button id="import-settings" class="button secondary" type="button">Import</button>
              </div>
            </section>
          </div>
        </div>
      </section>
      <section id="help-page" class="page hidden">
        <div class="home">
          <p class="home-label">Help</p>
          <h2 class="home-title">Project resources</h2>
          <p class="home-text">Repository, issue tracker, README/homepage, publisher, and support resources for this extension.</p>
          <div id="project-links" class="link-list"></div>
        </div>
      </section>
      <section id="color-settings-page" class="page color-settings hidden">
        <section class="theme-mode" aria-labelledby="theme-mode-title">
          <div class="theme-mode-row">
            <label id="theme-mode-title" class="theme-mode-label" for="theme-variant">Theme mode</label>
            <select id="theme-variant" class="select"></select>
          </div>
          <p class="theme-mode-description">Dark and light customizations are stored separately in their own VS Code theme blocks.</p>
        </section>
        <hr class="section-divider">
        <div class="toolbar">
          <input id="search" class="search" type="search" placeholder="Filter colors" aria-label="Filter colors">
          <button id="refresh" class="button secondary" type="button">Refresh</button>
          <button id="reset-all" class="button" type="button">Reset All</button>
        </div>
        <div class="tabs" role="tablist">
          <button class="tab active" data-section="workbench" type="button">Workbench</button>
          <button class="tab" data-section="token" type="button">Syntax</button>
        </div>
        <main id="content" class="content"></main>
      </section>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initialState = ${serializedState};
    const colorPattern = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    let state = initialState;
    let activePage = "home";
    let activeSection = "workbench";
    let filterText = "";
    let effectsPending = false;
    let lastEffectsStatusDedupeKey = "";
    let pendingPageAfterStateRefresh = "";
    const pendingUpdates = new Map();
    const editorBackgroundOpacityPendingKey = "editor-background-opacity";
    const emptyEditorLogoOpacityPendingKey = "empty-editor-logo-opacity";
    const defaultEffectFeatures = {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: true
    };

    if (state.e2eTestApiEnabled) {
      Object.defineProperty(window, "kawaiiVsCodeColorE2EPostMessage", {
        configurable: true,
        value(message) {
          vscode.postMessage(message);
        }
      });
      Object.defineProperty(window, "kawaiiVsCodeColorE2EGetState", {
        configurable: true,
        value() {
          return JSON.parse(JSON.stringify(state));
        }
      });
    }

    const pages = {
      home: document.getElementById("home-page"),
      settings: document.getElementById("settings-page"),
      "neon-effect": document.getElementById("neon-effect-page"),
      "image-customization": document.getElementById("image-customization-page"),
      "sync-files": document.getElementById("sync-files-page"),
      help: document.getElementById("help-page"),
      "color-settings": document.getElementById("color-settings-page")
    };
    const navButtons = document.querySelectorAll(".nav-button");
    const documentationLinks = document.getElementById("documentation-links");
    const projectLinks = document.getElementById("project-links");
    const corruptionWarningLinks = document.getElementById("corruption-warning-links");
    const checksumFixLink = document.getElementById("checksum-fix-link");
    const homeApplyEffects = document.getElementById("home-apply-effects");
    const content = document.getElementById("content");
    const search = document.getElementById("search");
    const status = document.getElementById("status");
    const neonStatus = document.getElementById("neon-status");
    const themeVariantSelect = document.getElementById("theme-variant");
    const startupEditorToggle = document.getElementById("startup-editor-toggle");
    const startupEditorSettingMeta = document.getElementById("startup-editor-setting-meta");
    const saveApplicationSettings = document.getElementById("save-application-settings");
    const saveVssync = document.getElementById("save-vssync");
    const importVssync = document.getElementById("import-vssync");
    const exportSettings = document.getElementById("export-settings");
    const importSettings = document.getElementById("import-settings");
    const applyEffects = document.getElementById("apply-effects");
    const effectsWarning = document.getElementById("effects-warning");
    const editorBackgroundPreview = document.getElementById("editor-background-preview");
    const editorBackgroundFile = document.getElementById("editor-background-file");
    const editorBackgroundUpload = document.getElementById("editor-background-upload");
    const editorBackgroundRandomNeko = document.getElementById("editor-background-random-neko");
    const editorBackgroundRemove = document.getElementById("editor-background-remove");
    const editorBackgroundDownload = document.getElementById("editor-background-download");
    const editorBackgroundOpacity = document.getElementById("editor-background-opacity");
    const editorBackgroundOpacityValue = document.getElementById("editor-background-opacity-value");
    const editorBackgroundFit = document.getElementById("editor-background-fit");
    const editorBackgroundFitDescription = document.getElementById("editor-background-fit-description");
    const editorBackgroundDataUrlWarning = document.getElementById("editor-background-data-url-warning");
    const emptyEditorLogoPreview = document.getElementById("empty-editor-logo-preview");
    const emptyEditorLogoFile = document.getElementById("empty-editor-logo-file");
    const emptyEditorLogoUpload = document.getElementById("empty-editor-logo-upload");
    const emptyEditorLogoRandomNeko = document.getElementById("empty-editor-logo-random-neko");
    const emptyEditorLogoRemove = document.getElementById("empty-editor-logo-remove");
    const emptyEditorLogoDownload = document.getElementById("empty-editor-logo-download");
    const emptyEditorLogoOpacity = document.getElementById("empty-editor-logo-opacity");
    const emptyEditorLogoOpacityValue = document.getElementById("empty-editor-logo-opacity-value");
    const emptyEditorLogoDataUrlWarning = document.getElementById("empty-editor-logo-data-url-warning");
    const effectFeatureInputs = Array.from(document.querySelectorAll("[data-effect-feature]"));

    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextPage = button.dataset.page;

        if (nextPage === "settings") {
          pendingPageAfterStateRefresh = "settings";
          setStatus("Refreshing application settings...");
          vscode.postMessage({ type: "refresh" });
          return;
        }

        pendingPageAfterStateRefresh = "";
        activePage = nextPage;
        render();
      });
    });

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        activeSection = tab.dataset.section;
        document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
        render();
      });
    });

    search.addEventListener("input", () => {
      filterText = search.value.trim().toLowerCase();
      render();
    });

    document.getElementById("refresh").addEventListener("click", () => {
      setStatus("Refreshing...");
      vscode.postMessage({ type: "refresh" });
    });

    document.getElementById("reset-all").addEventListener("click", () => {
      setStatus("Resetting...");
      vscode.postMessage({ type: "reset-all", themeVariantId: getActiveThemeVariantId() });
    });

    themeVariantSelect.addEventListener("change", () => {
      clearPendingUpdates();
      setStatus("Switching theme...");
      vscode.postMessage({ type: "change-theme-variant", themeVariantId: themeVariantSelect.value });
    });

    startupEditorToggle.addEventListener("change", () => {
      setStatus("Unsaved application setting change.");
    });

    saveApplicationSettings.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Saving application settings...");
      vscode.postMessage({
        type: "update-application-settings",
        openNativeWelcomePage: Boolean(startupEditorToggle.checked)
      });
    });

    saveVssync.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Saving settings to VS Code Sync state...");
      vscode.postMessage({ type: "save-settings-to-vssync" });
    });

    importVssync.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Importing settings from VS Code Sync state...");
      vscode.postMessage({ type: "import-settings-from-vssync" });
    });

    exportSettings.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Exporting settings...");
      vscode.postMessage({ type: "export-settings" });
    });

    importSettings.addEventListener("click", () => {
      clearPendingUpdates();
      setStatus("Opening settings import...");
      vscode.postMessage({ type: "import-settings" });
    });

    homeApplyEffects.addEventListener("click", handleApplyEffectsClick);
    applyEffects.addEventListener("click", handleApplyEffectsClick);
    effectFeatureInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const features = getEffectFeaturesFromControls();
        updateLocalEffectFeatures(features);
        setStatus("Saving effect selection...");
        vscode.postMessage({ type: "update-effect-features", features });
      });
    });

    function handleApplyEffectsClick() {
      hideEffectsWarning();
      setStatus("Applying effects...");
      setNeonStatus("Requesting effects apply...");
      applyConfiguredEffects();
    }

    editorBackgroundUpload.addEventListener("click", () => {
      setStatus("Opening image picker...");
      vscode.postMessage({ type: "select-editor-background-image" });
    });

    editorBackgroundRandomNeko.addEventListener("click", () => {
      startImageLoading(editorBackgroundPreview, editorBackgroundRandomNeko, "Fetching random neko image...");
      vscode.postMessage({ type: "select-random-neko-editor-background-image" });
    });

    editorBackgroundRemove.addEventListener("click", () => {
      setStatus("Removing editor background image...");
      vscode.postMessage({ type: "remove-editor-background-image" });
    });

    editorBackgroundDownload.addEventListener("click", () => {
      setStatus("Opening save as dialog...");
      vscode.postMessage({ type: "download-editor-background-image" });
    });

    editorBackgroundOpacity.addEventListener("input", () => {
      renderEditorBackgroundOpacityValue(editorBackgroundOpacity.value);
      scheduleEditorBackgroundOpacityUpdate(editorBackgroundOpacity.value);
    });

    editorBackgroundFit.addEventListener("change", () => {
      setStatus("Saving editor background fit area...");
      vscode.postMessage({ type: "update-editor-background-fit", fit: editorBackgroundFit.value });
    });

    emptyEditorLogoUpload.addEventListener("click", () => {
      setStatus("Opening logo picker...");
      vscode.postMessage({ type: "select-empty-editor-logo-image" });
    });

    emptyEditorLogoRandomNeko.addEventListener("click", () => {
      startImageLoading(emptyEditorLogoPreview, emptyEditorLogoRandomNeko, "Fetching random neko logo...");
      vscode.postMessage({ type: "select-random-neko-empty-editor-logo-image" });
    });

    emptyEditorLogoRemove.addEventListener("click", () => {
      setStatus("Removing no-tab logo...");
      vscode.postMessage({ type: "remove-empty-editor-logo-image" });
    });

    emptyEditorLogoDownload.addEventListener("click", () => {
      setStatus("Opening save as dialog...");
      vscode.postMessage({ type: "download-empty-editor-logo-image" });
    });

    emptyEditorLogoOpacity.addEventListener("input", () => {
      renderEmptyEditorLogoOpacityValue(emptyEditorLogoOpacity.value);
      scheduleEmptyEditorLogoOpacityUpdate(emptyEditorLogoOpacity.value);
    });

    document.getElementById("enable-neon").addEventListener("click", () => {
      setNeonStatus("Requesting enable...");
      vscode.postMessage({ type: "enable-neon" });
    });

    document.getElementById("disable-neon").addEventListener("click", () => {
      setNeonStatus("Requesting disable...");
      vscode.postMessage({ type: "disable-neon" });
    });

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.type === "state") {
        state = message.state;
        if (pendingPageAfterStateRefresh) {
          activePage = pendingPageAfterStateRefresh;
          pendingPageAfterStateRefresh = "";
        }
        clearImageLoading(editorBackgroundPreview, editorBackgroundRandomNeko);
        clearImageLoading(emptyEditorLogoPreview, emptyEditorLogoRandomNeko);
        render();
        if ((activePage === "settings" || activePage === "color-settings" || activePage === "image-customization") && !effectsPending) {
          setStatus("Saved " + new Date().toLocaleTimeString());
        }
      }
      if (message.type === "effects-pending") {
        showEffectsWarning(message.message || getDefaultEffectsPendingMessage());
      }
      if (message.type === "neon-status") {
        hideEffectsWarning();
        setNeonStatus(message.message || "Effects request completed.");
      }
      if (message.type === "effects-status") {
        showEffectsStatus(message);
      }
      if (message.type === "error") {
        setStatus(message.message || "Settings failed.");
        setNeonStatus(message.message || "Settings failed.");
        clearImageLoading(editorBackgroundPreview, editorBackgroundRandomNeko);
        clearImageLoading(emptyEditorLogoPreview, emptyEditorLogoRandomNeko);
      }
    });

    function render() {
      syncPages();
      renderHome();
      renderHelp();
      renderCorruptionWarningLinks();
      renderChecksumFixLink();
      renderApplicationSettings();
      renderThemeVariantSelector();
      renderEffectFeatureSettings();
      renderEditorBackgroundSettings();
      renderEmptyEditorLogoSettings();

      if (activePage === "color-settings") {
        renderColorSettings();
      }
    }

    function syncPages() {
      Object.keys(pages).forEach((pageId) => {
        pages[pageId].classList.toggle("hidden", pageId !== activePage);
      });

      navButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.page === activePage);
      });
    }

    function renderHome() {
      documentationLinks.innerHTML = "";
      (state.documentationLinks || []).forEach((link) => {
        documentationLinks.appendChild(createDocumentationLinkButton(link));
      });
    }

    function renderHelp() {
      projectLinks.innerHTML = "";
      (state.projectLinks || []).forEach((link) => {
        projectLinks.appendChild(createDocumentationLinkButton(link));
      });
    }

    function renderCorruptionWarningLinks() {
      corruptionWarningLinks.innerHTML = "";
      (state.corruptionWarningLinks || []).forEach((link) => {
        corruptionWarningLinks.appendChild(createDocumentationLinkButton(link));
      });
    }

    function renderChecksumFixLink() {
      checksumFixLink.innerHTML = "";

      if (state.checksumFixLink) {
        checksumFixLink.appendChild(createDocumentationLinkButton(state.checksumFixLink));
      }
    }

    function renderApplicationSettings() {
      const startupEditor = getStartupEditorState();
      startupEditorToggle.checked = Boolean(startupEditor.openNativeWelcomePage);
      startupEditorSettingMeta.textContent = "Current VS Code setting: " + startupEditor.setting + " = " + startupEditor.value + ".";
    }

    function getStartupEditorState() {
      const applicationSettings = state.applicationSettings || {};
      const startupEditor = applicationSettings.startupEditor || {};

      return {
        setting: startupEditor.setting || "workbench.startupEditor",
        value: startupEditor.value || "none",
        openNativeWelcomePage: startupEditor.openNativeWelcomePage === true
      };
    }

    function renderThemeVariantSelector() {
      const activeThemeVariantId = getActiveThemeVariantId();
      themeVariantSelect.innerHTML = "";

      (state.themeVariants || []).forEach((themeVariant) => {
        const option = document.createElement("option");
        option.value = themeVariant.id;
        option.textContent = themeVariant.modeLabel + " - " + themeVariant.label;
        themeVariantSelect.appendChild(option);
      });

      themeVariantSelect.value = activeThemeVariantId;
    }

    function renderEditorBackgroundSettings() {
      const editorBackground = state.editorBackground || {};
      const opacity = Number(editorBackground.opacity || 0);

      editorBackgroundOpacity.min = String(editorBackground.minOpacity || 0);
      editorBackgroundOpacity.max = String(editorBackground.maxOpacity || 0.35);
      editorBackgroundOpacity.step = String(editorBackground.opacityStep || 0.01);
      editorBackgroundOpacity.value = String(opacity);
      editorBackgroundRemove.disabled = !editorBackground.hasImage && !editorBackground.missingImage;
      editorBackgroundDownload.disabled = !editorBackground.hasImage;
      renderImagePreview(editorBackgroundPreview, editorBackground.previewUri, "No image");
      editorBackgroundFile.textContent = getEditorBackgroundFileText(editorBackground);
      editorBackgroundFile.title = editorBackgroundFile.textContent;
      renderEditorBackgroundOpacityValue(opacity);
      renderEditorBackgroundFitOptions(editorBackground);
      editorBackgroundDataUrlWarning.textContent = editorBackground.dataUrlWarning || "";
    }

    function getEditorBackgroundFileText(editorBackground) {
      if (editorBackground.missingImage) {
        return "Stored image is missing. Upload a new image or remove the customization.";
      }

      if (editorBackground.hasImage) {
        return editorBackground.originalName + " | " + editorBackground.sizeLabel;
      }

      return "No image selected. Supported formats: " + editorBackground.supportedFormats + "; max " + editorBackground.maxImageSizeLabel + ".";
    }

    function renderEditorBackgroundOpacityValue(opacity) {
      const numericOpacity = Number.parseFloat(String(opacity));
      const safeOpacity = Number.isFinite(numericOpacity) ? numericOpacity : 0;
      editorBackgroundOpacityValue.textContent = Math.round(safeOpacity * 100) + "%";
    }

    function renderEditorBackgroundFitOptions(editorBackground) {
      const fitOptions = Array.isArray(editorBackground.fitOptions) ? editorBackground.fitOptions : [];
      const selectedFit = editorBackground.fit || "full";
      const selectedOption = fitOptions.find((option) => option.id === selectedFit);

      editorBackgroundFit.innerHTML = "";
      fitOptions.forEach((option) => {
        const item = document.createElement("option");
        item.value = option.id;
        item.textContent = option.label + " (" + option.description + ")";
        editorBackgroundFit.appendChild(item);
      });

      editorBackgroundFit.value = selectedOption ? selectedOption.id : "full";
      renderEditorBackgroundFitDescription(selectedOption);
    }

    function renderEditorBackgroundFitDescription(option) {
      if (!option) {
        editorBackgroundFitDescription.textContent = "Full area: image fits inside 100% x 100% of the editor.";
        return;
      }

      editorBackgroundFitDescription.textContent = option.label + " area: image fits inside " + option.description + " of the editor.";
    }

    function renderEmptyEditorLogoSettings() {
      const emptyEditorLogo = state.emptyEditorLogo || {};
      const opacity = Number(emptyEditorLogo.opacity || 0);

      emptyEditorLogoOpacity.min = String(emptyEditorLogo.minOpacity || 0);
      emptyEditorLogoOpacity.max = String(emptyEditorLogo.maxOpacity || 1);
      emptyEditorLogoOpacity.step = String(emptyEditorLogo.opacityStep || 0.01);
      emptyEditorLogoOpacity.value = String(opacity);
      emptyEditorLogoRemove.disabled = !emptyEditorLogo.hasImage && !emptyEditorLogo.missingImage;
      emptyEditorLogoDownload.disabled = !emptyEditorLogo.hasImage;
      renderImagePreview(emptyEditorLogoPreview, emptyEditorLogo.previewUri, "No logo");
      emptyEditorLogoFile.textContent = getEmptyEditorLogoFileText(emptyEditorLogo);
      emptyEditorLogoFile.title = emptyEditorLogoFile.textContent;
      renderEmptyEditorLogoOpacityValue(opacity);
      emptyEditorLogoDataUrlWarning.textContent = emptyEditorLogo.dataUrlWarning || "";
    }

    function getEmptyEditorLogoFileText(emptyEditorLogo) {
      if (emptyEditorLogo.missingImage) {
        return "Stored logo is missing. Upload a new logo or remove the customization.";
      }

      if (emptyEditorLogo.hasImage) {
        return emptyEditorLogo.originalName + " | " + emptyEditorLogo.sizeLabel;
      }

      return "No logo selected. Supported formats: " + emptyEditorLogo.supportedFormats + "; max " + emptyEditorLogo.maxImageSizeLabel + ".";
    }

    function renderEmptyEditorLogoOpacityValue(opacity) {
      const numericOpacity = Number.parseFloat(String(opacity));
      const safeOpacity = Number.isFinite(numericOpacity) ? numericOpacity : 0;
      emptyEditorLogoOpacityValue.textContent = Math.round(safeOpacity * 100) + "%";
    }

    function renderImagePreview(container, previewUri, emptyText) {
      container.innerHTML = "";
      container.style.backgroundImage = "";
      container.classList.toggle("has-image", Boolean(previewUri));
      container.setAttribute("role", "img");

      if (!previewUri) {
        container.textContent = emptyText;
        container.setAttribute("aria-label", emptyText);
        container.title = emptyText;
        return;
      }

      container.textContent = "";
      container.style.backgroundImage = "url(" + JSON.stringify(previewUri) + ")";
      container.setAttribute("aria-label", "Selected image preview");
      container.title = "Selected image preview";
    }

    function startImageLoading(container, button, message) {
      setStatus(message);
      button.disabled = true;
      container.classList.add("is-loading");
      renderImageLoadingOverlay(container, message);
    }

    function clearImageLoading(container, button) {
      button.disabled = false;
      container.classList.remove("is-loading");
      const overlay = container.querySelector(".image-preview-loading");
      if (overlay) {
        overlay.remove();
      }
    }

    function renderImageLoadingOverlay(container, message) {
      let overlay = container.querySelector(".image-preview-loading");

      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "image-preview-loading";
        container.appendChild(overlay);
      }

      overlay.textContent = message;
    }

    function showEffectsWarning(message) {
      if (!effectsWarning.classList.contains("hidden") && effectsWarning.textContent === message) {
        return;
      }

      effectsPending = true;
      effectsWarning.textContent = message;
      effectsWarning.classList.remove("hidden");
      setStatus(message);
    }

    function hideEffectsWarning() {
      effectsPending = false;
      effectsWarning.textContent = "";
      effectsWarning.classList.add("hidden");
    }

    function showEffectsStatus(message) {
      const dedupeKey = typeof message.dedupeKey === "string" ? message.dedupeKey : "";
      const title = typeof message.title === "string" && message.title ? message.title : "Effects";
      const detail = typeof message.message === "string" ? message.message : "";
      const tone = typeof message.tone === "string" ? message.tone : "info";
      const renderedMessage = detail ? title + ": " + detail : title;

      if (dedupeKey && lastEffectsStatusDedupeKey === dedupeKey && neonStatus.textContent === renderedMessage) {
        return;
      }

      lastEffectsStatusDedupeKey = dedupeKey;
      hideEffectsWarning();
      setNeonStatus(renderedMessage, tone);

      if (detail) {
        setStatus(detail);
      }
    }

    function getDefaultEffectsPendingMessage() {
      return "Image customization saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.";
    }

    function createDocumentationLinkButton(link) {
      const button = document.createElement("button");
      button.className = "link-button";
      button.type = "button";
      button.title = link.url;

      const label = document.createElement("span");
      label.className = "link-label";
      label.textContent = link.label;

      const url = document.createElement("span");
      url.className = "link-url";
      url.textContent = link.url;

      button.appendChild(label);
      button.appendChild(url);
      button.addEventListener("click", () => {
        vscode.postMessage({ type: "open-link", url: link.url });
      });

      return button;
    }

    function renderColorSettings() {
      const items = getVisibleItems();
      content.innerHTML = "";

      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No matching colors";
        content.appendChild(empty);
        return;
      }

      const groups = groupItems(items);
      Object.keys(groups).sort().forEach((groupName) => {
        const section = document.createElement("section");
        section.className = "section";

        const title = document.createElement("h2");
        title.className = "section-title";
        title.textContent = groupName;
        section.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";
        groups[groupName].forEach((item) => grid.appendChild(createColorRow(item)));
        section.appendChild(grid);
        content.appendChild(section);
      });
    }

    function getVisibleItems() {
      const items = activeSection === "workbench" ? (state.workbenchColors || []) : (state.tokenColors || []);

      return items.filter((item) => {
        if (!filterText) {
          return true;
        }

        return [item.label, item.scope, item.defaultValue, item.value, item.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(filterText));
      });
    }

    function groupItems(items) {
      return items.reduce((groups, item) => {
        const groupName = activeSection === "workbench" ? item.group : "Syntax Tokens";
        groups[groupName] = groups[groupName] || [];
        groups[groupName].push(item);
        return groups;
      }, {});
    }

    function createColorRow(item) {
      const row = document.createElement("div");
      row.className = "row";

      const name = document.createElement("div");
      name.className = "row-name";

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = item.label;
      label.title = item.label;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = activeSection === "workbench" ? "Default " + item.defaultValue : item.scope + " | Default " + item.defaultValue;
      meta.title = meta.textContent;

      const description = document.createElement("div");
      description.className = "description";
      description.textContent = item.description || "No description available.";
      description.title = description.textContent;

      name.appendChild(label);
      name.appendChild(meta);
      name.appendChild(description);

      const picker = document.createElement("input");
      picker.className = "picker";
      picker.type = "color";
      picker.value = toColorInputValue(item.value);
      picker.title = item.label;

      const input = document.createElement("input");
      input.className = "hex";
      input.value = item.value;
      input.spellcheck = false;
      input.setAttribute("aria-label", item.label + " hex color");

      const reset = document.createElement("button");
      reset.className = "reset";
      reset.type = "button";
      reset.textContent = "Reset";
      reset.disabled = !item.customized;

      picker.addEventListener("input", () => {
        input.value = mergeColorInputWithAlpha(picker.value, input.value);
        handleColorInput(item, input);
      });

      input.addEventListener("input", () => {
        handleColorInput(item, input);
        if (colorPattern.test(input.value.trim())) {
          picker.value = toColorInputValue(input.value);
        }
      });

      reset.addEventListener("click", () => {
        setStatus("Resetting...");
        vscode.postMessage({ type: "reset-color", section: activeSection, id: item.id, themeVariantId: getActiveThemeVariantId() });
      });

      row.appendChild(name);
      row.appendChild(picker);
      row.appendChild(input);
      row.appendChild(reset);

      return row;
    }

    function handleColorInput(item, input) {
      const value = input.value.trim();
      const isValid = colorPattern.test(value);
      input.classList.toggle("invalid", !isValid);

      if (!isValid) {
        setStatus("Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.");
        return;
      }

      scheduleColorUpdate(activeSection, item.id, value);
    }

    function scheduleColorUpdate(section, id, value) {
      const themeVariantId = getActiveThemeVariantId();
      const key = themeVariantId + ":" + section + ":" + id;
      clearTimeout(pendingUpdates.get(key));
      pendingUpdates.set(key, setTimeout(() => {
        setStatus("Saving...");
        vscode.postMessage({ type: "update-color", section, id, value, themeVariantId });
      }, 220));
    }

    function scheduleEditorBackgroundOpacityUpdate(opacity) {
      clearTimeout(pendingUpdates.get(editorBackgroundOpacityPendingKey));
      pendingUpdates.set(editorBackgroundOpacityPendingKey, setTimeout(() => {
        setStatus("Saving editor background opacity...");
        vscode.postMessage({ type: "update-editor-background-opacity", opacity });
      }, 220));
    }

    function scheduleEmptyEditorLogoOpacityUpdate(opacity) {
      clearTimeout(pendingUpdates.get(emptyEditorLogoOpacityPendingKey));
      pendingUpdates.set(emptyEditorLogoOpacityPendingKey, setTimeout(() => {
        setStatus("Saving no-tab logo opacity...");
        vscode.postMessage({ type: "update-empty-editor-logo-opacity", opacity });
      }, 220));
    }

    function clearImageCustomizationUpdateTimers() {
      clearTimeout(pendingUpdates.get(editorBackgroundOpacityPendingKey));
      pendingUpdates.delete(editorBackgroundOpacityPendingKey);
      clearTimeout(pendingUpdates.get(emptyEditorLogoOpacityPendingKey));
      pendingUpdates.delete(emptyEditorLogoOpacityPendingKey);
    }

    function renderEffectFeatureSettings() {
      const features = getEffectFeatures();

      effectFeatureInputs.forEach((input) => {
        input.checked = features[input.dataset.effectFeature] !== false;
      });
    }

    function getEffectFeatures() {
      const candidate = state.effects && state.effects.features ? state.effects.features : {};

      return Object.keys(defaultEffectFeatures).reduce((features, featureId) => {
        features[featureId] = candidate[featureId] !== false;
        return features;
      }, {});
    }

    function getEffectFeaturesFromControls() {
      const features = getEffectFeatures();

      effectFeatureInputs.forEach((input) => {
        features[input.dataset.effectFeature] = Boolean(input.checked);
      });

      return features;
    }

    function updateLocalEffectFeatures(features) {
      state = {
        ...state,
        effects: {
          ...(state.effects || {}),
          features
        }
      };
    }

    function applyConfiguredEffects() {
      clearImageCustomizationUpdateTimers();
      const features = getEffectFeaturesFromControls();
      updateLocalEffectFeatures(features);
      vscode.postMessage({
        type: "apply-effects",
        editorBackgroundOpacity: editorBackgroundOpacity.value,
        editorBackgroundFit: editorBackgroundFit.value,
        emptyEditorLogoOpacity: emptyEditorLogoOpacity.value,
        features
      });
    }

    function clearPendingUpdates() {
      pendingUpdates.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingUpdates.clear();
    }

    function getActiveThemeVariantId() {
      return state.activeThemeVariantId || "dark";
    }

    function toColorInputValue(value) {
      const normalizedValue = String(value || "#000000").trim();

      if (/^#[0-9a-fA-F]{3,4}$/.test(normalizedValue)) {
        return "#" + normalizedValue.slice(1, 4).split("").map((part) => part + part).join("");
      }

      return normalizedValue.slice(0, 7);
    }

    function mergeColorInputWithAlpha(rgbValue, currentValue) {
      const value = String(currentValue || "");

      if (/^#[0-9a-fA-F]{8}$/.test(value)) {
        return rgbValue + value.slice(7, 9);
      }

      if (/^#[0-9a-fA-F]{4}$/.test(value)) {
        return rgbValue + value.slice(4, 5).repeat(2);
      }

      return rgbValue;
    }

    function setStatus(message) {
      status.textContent = message;
    }

    function setNeonStatus(message, tone) {
      neonStatus.textContent = message;

      if (tone) {
        neonStatus.dataset.tone = tone;
        return;
      }

      delete neonStatus.dataset.tone;
    }

    render();
    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
}

/**
 * Creates a nonce for webview scripts.
 *
 * @returns {string} Nonce value.
 */
function createNonce() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";

  for (let index = 0; index < 32; index += 1) {
    nonce += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return nonce;
}


module.exports = {
  createNonce,
  createSettingsWebviewHtml
};
