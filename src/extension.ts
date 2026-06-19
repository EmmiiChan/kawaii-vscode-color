import * as vscode from "vscode";
import settings = require("./settings");
import { createNeonEffectController, type NeonEffectController } from "./extensionHost/controllers/NeonEffectController";
import { nodeFileSystem } from "./extensionHost/adapters/NodeFileSystem";
import { createVscodeExtensionStorage } from "./extensionHost/adapters/VscodeExtensionStorage";
import { createVscodeNotificationService } from "./extensionHost/adapters/VscodeNotificationService";
import { createNeonEffectService, type NeonEffectConfiguration, type NeonEffectLogger } from "./extensionHost/services/NeonEffectService";
import { createWorkbenchPatchService } from "./extensionHost/services/WorkbenchPatchService";
import { resolveExtensionRoot } from "./extensionRoot";

let neonEffectController: NeonEffectController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const controller = createController(context);
  neonEffectController = controller;

  settings.configureSettingsSync(context);

  const openSettings = vscode.commands.registerCommand("kawaii_synthwave.openSettings", () => {
    return settings.openSettings(context, controller.getSettingsActions());
  });

  context.subscriptions.push(openSettings);
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => controller.handleConfigurationChange(event)));
}

export function deactivate(): void {
  neonEffectController = undefined;
}

export async function enableNeon(): Promise<void> {
  await getActiveController().enableNeon();
}

export async function disableNeon(): Promise<void> {
  await getActiveController().disableNeon();
}

export function isNeonEnabled(): boolean {
  return getActiveController().isNeonEnabled();
}

function createController(context: vscode.ExtensionContext): NeonEffectController {
  const fileSystem = nodeFileSystem;
  const workbenchPatchService = createWorkbenchPatchService({ fileSystem });
  const neonEffectService = createNeonEffectService({
    appRoot: vscode.env.appRoot,
    extensionRoot: resolveExtensionRoot(__dirname),
    fileSystem,
    logger: extensionLogger,
    notifications: createVscodeNotificationService(vscode),
    storage: createVscodeExtensionStorage(context),
    workbenchPatchService
  });

  return createNeonEffectController({
    getActiveColorThemeLabel,
    getNeonConfiguration,
    neonEffectService
  });
}

function getNeonConfiguration(): NeonEffectConfiguration {
  const config = vscode.workspace.getConfiguration("kawaii_synthwave");

  return {
    brightness: config.get("brightness"),
    disableGlow: config.get("disableGlow")
  };
}

function getActiveColorThemeLabel(): string {
  const colorTheme = vscode.workspace.getConfiguration().get("workbench.colorTheme");
  return typeof colorTheme === "string" ? colorTheme : "";
}

function getActiveController(): NeonEffectController {
  if (!neonEffectController) {
    throw new Error("Neon Effect controller is unavailable before extension activation.");
  }

  return neonEffectController;
}

const extensionLogger: NeonEffectLogger = {
  logError(methodName: string, error: unknown, context: Record<string, unknown>): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      methodName,
      context,
      message: normalizedError.message,
      stack: normalizedError.stack
    }, null, 2));
  }
};
