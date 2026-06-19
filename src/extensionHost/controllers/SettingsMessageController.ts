export type SettingsHostMessage =
  | { readonly type: "ready" }
  | { readonly type: "refresh" }
  | { readonly type: "open-link"; readonly url: string }
  | { readonly type: "enable-neon" }
  | { readonly type: "disable-neon" }
  | { readonly type: "change-theme-variant"; readonly themeVariantId: unknown }
  | { readonly type: "save-settings-to-vssync" }
  | { readonly type: "import-settings-from-vssync" }
  | { readonly type: "export-settings" }
  | { readonly type: "import-settings" }
  | { readonly type: "e2e-apply-settings-bundle"; readonly bundle: unknown }
  | { readonly type: "e2e-set-test-fixtures"; readonly fixtures: unknown }
  | { readonly type: "select-editor-background-image" }
  | { readonly type: "select-random-neko-editor-background-image" }
  | { readonly type: "remove-editor-background-image" }
  | { readonly type: "download-editor-background-image" }
  | { readonly type: "update-editor-background-opacity"; readonly opacity: unknown }
  | { readonly type: "update-editor-background-fit"; readonly fit: unknown }
  | { readonly type: "select-empty-editor-logo-image" }
  | { readonly type: "select-random-neko-empty-editor-logo-image" }
  | { readonly type: "remove-empty-editor-logo-image" }
  | { readonly type: "download-empty-editor-logo-image" }
  | { readonly type: "update-empty-editor-logo-opacity"; readonly opacity: unknown }
  | {
    readonly type: "apply-neon-customizations";
    readonly editorBackgroundFit: unknown;
    readonly editorBackgroundOpacity: unknown;
    readonly emptyEditorLogoOpacity: unknown;
  }
  | {
    readonly type: "update-color";
    readonly id: unknown;
    readonly section: unknown;
    readonly themeVariantId: unknown;
    readonly value: unknown;
  }
  | {
    readonly type: "reset-color";
    readonly id: unknown;
    readonly section: unknown;
    readonly themeVariantId: unknown;
  }
  | { readonly type: "reset-all"; readonly themeVariantId: unknown };

export interface SettingsMessageController {
  handleMessage(message: unknown): Promise<void>;
}

export interface SettingsMessageHandlers {
  applyAllEffects(): Promise<void> | void;
  applyNeonCustomizations(message: Extract<SettingsHostMessage, { readonly type: "apply-neon-customizations" }>): Promise<void> | void;
  applySettingsBundle(bundle: unknown): Promise<void> | void;
  changeThemeVariant(themeVariantId: unknown): Promise<void> | void;
  disableNeon(): Promise<void> | void;
  downloadEditorBackgroundImage(): Promise<void> | void;
  downloadEmptyEditorLogoImage(): Promise<void> | void;
  enableNeon(): Promise<void> | void;
  exportSettingsBundle(): Promise<void> | void;
  importSettingsBundle(): Promise<boolean>;
  importSettingsFromVsSync(): Promise<boolean>;
  openDocumentationLink(url: string): Promise<void> | void;
  postEffectsPendingWarning(message: string): void;
  postNeonEffectStatus(message: string): void;
  postSettingsState(): Promise<void> | void;
  removeEditorBackgroundImage(): Promise<boolean>;
  removeEmptyEditorLogoImage(): Promise<boolean>;
  resetAllColorCustomizations(themeVariantId: unknown): Promise<void> | void;
  resetColorCustomization(section: unknown, id: unknown, themeVariantId: unknown): Promise<void> | void;
  saveSettingsToVsSync(): Promise<void> | void;
  selectEditorBackgroundImage(): Promise<boolean>;
  selectEmptyEditorLogoImage(): Promise<boolean>;
  selectRandomNekoEditorBackgroundImage(): Promise<void> | void;
  selectRandomNekoEmptyEditorLogoImage(): Promise<void> | void;
  setE2ETestFixtures(fixtures: unknown): void;
  updateColorCustomization(section: unknown, id: unknown, value: unknown, themeVariantId: unknown): Promise<void> | void;
  updateEditorBackgroundFit(fit: unknown): Promise<void> | void;
  updateEditorBackgroundOpacity(opacity: unknown): Promise<void> | void;
  updateEmptyEditorLogoOpacity(opacity: unknown): Promise<void> | void;
}

export interface SettingsMessageControllerDependencies {
  readonly handlers: SettingsMessageHandlers;
  readonly isNeonE2ETestHookEnabled: () => boolean;
  readonly isSettingsE2ETestHookEnabled: () => boolean;
  readonly logError: (methodName: string, error: unknown, context: Record<string, unknown>) => void;
  readonly reportError: (error: Error) => Promise<void> | void;
}

const PAYLOADLESS_MESSAGE_TYPES = new Set<string>([
  "ready",
  "refresh",
  "enable-neon",
  "disable-neon",
  "save-settings-to-vssync",
  "import-settings-from-vssync",
  "export-settings",
  "import-settings",
  "select-editor-background-image",
  "select-random-neko-editor-background-image",
  "remove-editor-background-image",
  "download-editor-background-image",
  "select-empty-editor-logo-image",
  "select-random-neko-empty-editor-logo-image",
  "remove-empty-editor-logo-image",
  "download-empty-editor-logo-image"
]);

export function createSettingsMessageController(dependencies: SettingsMessageControllerDependencies): SettingsMessageController {
  return new DefaultSettingsMessageController(dependencies);
}

export function isSettingsHostMessage(message: unknown): message is SettingsHostMessage {
  if (!isRecord(message) || typeof message.type !== "string") {
    return false;
  }

  if (PAYLOADLESS_MESSAGE_TYPES.has(message.type)) {
    return true;
  }

  switch (message.type) {
    case "open-link":
      return typeof message.url === "string";
    case "change-theme-variant":
    case "reset-all":
    case "update-editor-background-opacity":
    case "update-editor-background-fit":
    case "update-empty-editor-logo-opacity":
    case "e2e-apply-settings-bundle":
    case "e2e-set-test-fixtures":
      return true;
    case "apply-neon-customizations":
      return Object.prototype.hasOwnProperty.call(message, "editorBackgroundOpacity")
        && Object.prototype.hasOwnProperty.call(message, "editorBackgroundFit")
        && Object.prototype.hasOwnProperty.call(message, "emptyEditorLogoOpacity");
    case "update-color":
      return Object.prototype.hasOwnProperty.call(message, "section")
        && Object.prototype.hasOwnProperty.call(message, "id")
        && Object.prototype.hasOwnProperty.call(message, "value")
        && Object.prototype.hasOwnProperty.call(message, "themeVariantId");
    case "reset-color":
      return Object.prototype.hasOwnProperty.call(message, "section")
        && Object.prototype.hasOwnProperty.call(message, "id")
        && Object.prototype.hasOwnProperty.call(message, "themeVariantId");
    default:
      return false;
  }
}

class DefaultSettingsMessageController implements SettingsMessageController {
  constructor(private readonly dependencies: SettingsMessageControllerDependencies) {}

  async handleMessage(message: unknown): Promise<void> {
    if (!isSettingsHostMessage(message)) {
      return;
    }

    try {
      await this.dispatchMessage(message);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.dependencies.logError("handleSettingsMessage", normalizedError, { message });
      await this.dependencies.reportError(normalizedError);
    }
  }

  private async dispatchMessage(message: SettingsHostMessage): Promise<void> {
    const handlers = this.dependencies.handlers;

    switch (message.type) {
      case "ready":
      case "refresh":
        await handlers.postSettingsState();
        return;
      case "open-link":
        await handlers.openDocumentationLink(message.url);
        return;
      case "enable-neon":
        await handlers.enableNeon();
        handlers.postNeonEffectStatus("Enable request sent. Follow the VS Code notification to restart the editor.");
        return;
      case "disable-neon":
        await handlers.disableNeon();
        handlers.postNeonEffectStatus("Disable request sent. Follow the VS Code notification to restart the editor.");
        return;
      case "change-theme-variant":
        await handlers.changeThemeVariant(message.themeVariantId);
        await handlers.postSettingsState();
        return;
      case "save-settings-to-vssync":
        await handlers.saveSettingsToVsSync();
        await handlers.postSettingsState();
        return;
      case "import-settings-from-vssync":
        if (await handlers.importSettingsFromVsSync()) {
          await handlers.postSettingsState();
          handlers.postEffectsPendingWarning("Settings restored from VSSync. Click Apply Effects, then reload VS Code to refresh image-backed effects.");
          return;
        }
        await handlers.postSettingsState();
        return;
      case "export-settings":
        await handlers.exportSettingsBundle();
        await handlers.postSettingsState();
        return;
      case "import-settings":
        if (await handlers.importSettingsBundle()) {
          await handlers.postSettingsState();
          handlers.postEffectsPendingWarning("Settings imported. Click Apply Effects, then reload VS Code to refresh image-backed effects.");
          return;
        }
        await handlers.postSettingsState();
        return;
      case "e2e-apply-settings-bundle":
        if (!this.dependencies.isNeonE2ETestHookEnabled()) {
          throw new Error("E2E settings bundle import is only available while KAWAII_E2E_ALLOW_NEON_PATCH=1.");
        }
        await handlers.applySettingsBundle(message.bundle);
        await handlers.postSettingsState();
        handlers.postEffectsPendingWarning("Settings restored from E2E bundle. Click Apply Effects, then reload VS Code to refresh image-backed effects.");
        return;
      case "e2e-set-test-fixtures":
        if (!this.dependencies.isSettingsE2ETestHookEnabled()) {
          throw new Error("E2E test fixtures are only available while KAWAII_E2E_TEST_HOOKS=1 or KAWAII_E2E_ALLOW_NEON_PATCH=1.");
        }
        handlers.setE2ETestFixtures(message.fixtures);
        await handlers.postSettingsState();
        return;
      case "select-editor-background-image":
        if (await handlers.selectEditorBackgroundImage()) {
          await handlers.postSettingsState();
          handlers.postEffectsPendingWarning("Editor background image saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await handlers.postSettingsState();
        return;
      case "select-random-neko-editor-background-image":
        await handlers.selectRandomNekoEditorBackgroundImage();
        await handlers.postSettingsState();
        handlers.postEffectsPendingWarning("Random neko editor background image saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "remove-editor-background-image":
        if (await handlers.removeEditorBackgroundImage()) {
          await handlers.postSettingsState();
          handlers.postEffectsPendingWarning("Editor background image removed. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await handlers.postSettingsState();
        return;
      case "download-editor-background-image":
        await handlers.downloadEditorBackgroundImage();
        await handlers.postSettingsState();
        return;
      case "update-editor-background-opacity":
        await handlers.updateEditorBackgroundOpacity(message.opacity);
        await handlers.postSettingsState();
        handlers.postEffectsPendingWarning("Editor background opacity saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "update-editor-background-fit":
        await handlers.updateEditorBackgroundFit(message.fit);
        await handlers.postSettingsState();
        handlers.postEffectsPendingWarning("Editor background fit area saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "select-empty-editor-logo-image":
        if (await handlers.selectEmptyEditorLogoImage()) {
          await handlers.postSettingsState();
          handlers.postEffectsPendingWarning("No-tab logo saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await handlers.postSettingsState();
        return;
      case "select-random-neko-empty-editor-logo-image":
        await handlers.selectRandomNekoEmptyEditorLogoImage();
        await handlers.postSettingsState();
        handlers.postEffectsPendingWarning("Random neko no-tab logo saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "remove-empty-editor-logo-image":
        if (await handlers.removeEmptyEditorLogoImage()) {
          await handlers.postSettingsState();
          handlers.postEffectsPendingWarning("No-tab logo removed. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
          return;
        }
        await handlers.postSettingsState();
        return;
      case "download-empty-editor-logo-image":
        await handlers.downloadEmptyEditorLogoImage();
        await handlers.postSettingsState();
        return;
      case "update-empty-editor-logo-opacity":
        await handlers.updateEmptyEditorLogoOpacity(message.opacity);
        await handlers.postSettingsState();
        handlers.postEffectsPendingWarning("No-tab logo opacity saved. Click Apply Effects, then reload VS Code. If the editor does not refresh cleanly, close and open VS Code manually.");
        return;
      case "apply-neon-customizations":
        await handlers.applyNeonCustomizations(message);
        await handlers.applyAllEffects();
        await handlers.postSettingsState();
        return;
      case "update-color":
        await handlers.updateColorCustomization(message.section, message.id, message.value, message.themeVariantId);
        await handlers.postSettingsState();
        return;
      case "reset-color":
        await handlers.resetColorCustomization(message.section, message.id, message.themeVariantId);
        await handlers.postSettingsState();
        return;
      case "reset-all":
        await handlers.resetAllColorCustomizations(message.themeVariantId);
        await handlers.postSettingsState();
        return;
      default:
        assertNever(message);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled settings message: ${JSON.stringify(value)}`);
}
