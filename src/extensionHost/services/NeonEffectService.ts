import path = require("path");
import { createEmptyEditorLogoStyles } from "../../emptyEditorLogoStyles";
import { replaceRendererPlaceholders } from "../../shared/contracts/rendererPlaceholders";
import type { ExtensionFileSystem } from "../adapters/NodeFileSystem";
import type { ExtensionStorage } from "../adapters/VscodeExtensionStorage";
import type { NeonNotificationService } from "../adapters/VscodeNotificationService";
import type { WorkbenchPatchService } from "./WorkbenchPatchService";

export const NEON_EFFECT_MESSAGES = {
  ACTIVATED: "Kawaii VS Code Color UI effects enabled. VS code must reload for this change to take effect. Code may display a warning that it is corrupted, this is normal. You can dismiss this message by choosing 'Don't show this again' on the notification.",
  DEACTIVATED: "Kawaii VS Code Color UI effects disabled. VS code must reload for this change to take effect",
  REACTIVATED: "Kawaii VS Code Color UI effects are already enabled. Reload to refresh JS settings.",
  NOT_RUNNING: "Kawaii VS Code Color UI effects are not running.",
  ERROR_ACCESS_DENIED: "Kawaii VS Code Color was unable to modify the core VS code files needed to launch UI effects. You may need to run VS code with admin privileges in order to enable them.",
  ERROR_WORKBENCH_NOT_FOUND: "Kawaii VS Code Color could not find the workbench HTML file. This is likely due to a change in VS Code's internal structure. Please open an issue on the Kawaii VS Code Color GitHub repository to report this.",
  ERROR_GENERIC: "Something went wrong when starting Kawaii VS Code Color UI effects"
} as const;

const EDITOR_BACKGROUND_IMAGE_STATE_KEY = "kawaii_synthwave.editorBackgroundImage";
const EDITOR_BACKGROUND_OPACITY_STATE_KEY = "kawaii_synthwave.editorBackgroundOpacity";
const EDITOR_BACKGROUND_IMAGE_FILE_PREFIX = "editor-background-image";
const EDITOR_BACKGROUND_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml"
};
const EDITOR_BACKGROUND_DEFAULT_OPACITY = 0.12;
const EDITOR_BACKGROUND_MIN_OPACITY = 0;
const EDITOR_BACKGROUND_MAX_OPACITY = 0.35;
const EDITOR_BACKGROUND_FIT_STATE_KEY = "kawaii_synthwave.editorBackgroundFit";
const EDITOR_BACKGROUND_DEFAULT_FIT = "full";
const EDITOR_BACKGROUND_DEFAULT_FIT_AREA: EditorBackgroundFitArea = {
  top: "0",
  right: "auto",
  bottom: "auto",
  left: "0",
  width: "100%",
  height: "100%"
};
const EDITOR_BACKGROUND_FIT_AREAS: Record<string, EditorBackgroundFitArea> = {
  full: EDITOR_BACKGROUND_DEFAULT_FIT_AREA,
  top: { top: "0", right: "auto", bottom: "auto", left: "0", width: "100%", height: "50%" },
  bottom: { top: "auto", right: "auto", bottom: "0", left: "0", width: "100%", height: "50%" },
  left: { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "100%" },
  right: { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "100%" },
  "top-left": { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "50%" },
  "top-right": { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "50%" },
  "bottom-left": { top: "auto", right: "auto", bottom: "0", left: "0", width: "50%", height: "50%" },
  "bottom-right": { top: "auto", right: "0", bottom: "0", left: "auto", width: "50%", height: "50%" }
};
const EDITOR_BACKGROUND_DEFAULT_POSITION = "center center";
const EDITOR_BACKGROUND_DEFAULT_SIZE = "contain";
const EDITOR_BACKGROUND_DEFAULT_REPEAT = "no-repeat";
const EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY = "kawaii_synthwave.emptyEditorLogoImage";
const EMPTY_EDITOR_LOGO_OPACITY_STATE_KEY = "kawaii_synthwave.emptyEditorLogoOpacity";
const EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX = "empty-editor-logo-image";
const EMPTY_EDITOR_LOGO_DEFAULT_OPACITY = 0.75;
const EMPTY_EDITOR_LOGO_MIN_OPACITY = 0;
const EMPTY_EDITOR_LOGO_MAX_OPACITY = 1;

export interface NeonEffectConfiguration {
  readonly brightness?: unknown;
  readonly disableGlow?: unknown;
}

export interface NeonEffectLogger {
  logError(methodName: string, error: unknown, context: Record<string, unknown>): void;
}

export interface NeonEffectService {
  buildCustomChromeStyles(chromeStyles: string): string;
  disable(): Promise<void>;
  enable(configuration: NeonEffectConfiguration): Promise<void>;
  isEnabled(): boolean;
}

export interface NeonEffectServiceDependencies {
  readonly appRoot: string;
  readonly extensionRoot: string;
  readonly fileSystem: ExtensionFileSystem;
  readonly logger?: NeonEffectLogger;
  readonly notifications: NeonNotificationService;
  readonly storage?: ExtensionStorage;
  readonly workbenchPatchService: WorkbenchPatchService;
}

export interface EditorBackgroundFitArea {
  readonly bottom: string;
  readonly height: string;
  readonly left: string;
  readonly right: string;
  readonly top: string;
  readonly width: string;
}

interface EditorBackgroundCssValues {
  readonly areaBottom: string;
  readonly areaHeight: string;
  readonly areaLeft: string;
  readonly areaRight: string;
  readonly areaTop: string;
  readonly areaWidth: string;
  readonly image: string;
  readonly opacity: string;
  readonly position: string;
  readonly repeat: string;
  readonly size: string;
}

interface StoredImageMetadata {
  readonly fileName: string;
  readonly mimeType: string;
}

export function createNeonEffectService(dependencies: NeonEffectServiceDependencies): NeonEffectService {
  return new DefaultNeonEffectService(dependencies);
}

export function normalizeEditorBackgroundFit(fit: unknown): string {
  const normalizedFit = String(fit || "")
    .trim()
    .toLowerCase()
    .replace(/^botton/, "bottom");

  return Object.prototype.hasOwnProperty.call(EDITOR_BACKGROUND_FIT_AREAS, normalizedFit)
    ? normalizedFit
    : EDITOR_BACKGROUND_DEFAULT_FIT;
}

export function getEditorBackgroundFitArea(fit: unknown): EditorBackgroundFitArea {
  return EDITOR_BACKGROUND_FIT_AREAS[normalizeEditorBackgroundFit(fit)] || EDITOR_BACKGROUND_DEFAULT_FIT_AREA;
}

class DefaultNeonEffectService implements NeonEffectService {
  constructor(private readonly dependencies: NeonEffectServiceDependencies) {}

  async enable(configuration: NeonEffectConfiguration): Promise<void> {
    const normalizedConfiguration = normalizeNeonEffectConfiguration(configuration);
    const basePath = resolveWorkbenchBasePath(this.dependencies.appRoot);

    if (!this.dependencies.workbenchPatchService.resolvePatchPaths(basePath)) {
      await this.dependencies.notifications.showErrorMessage(NEON_EFFECT_MESSAGES.ERROR_WORKBENCH_NOT_FOUND);
      return;
    }

    try {
      const uiStyles = this.buildCustomChromeStyles(
        this.dependencies.fileSystem.readTextFile(path.join(this.dependencies.extensionRoot, "src", "css", "kawaii-vscode-colors-ui.min.css"))
      );
      const jsTemplate = this.dependencies.fileSystem.readTextFile(
        path.join(this.dependencies.extensionRoot, "src", "js", "theme_template.js")
      );
      const scriptContent = replaceRendererPlaceholders(jsTemplate, {
        DISABLE_GLOW: String(normalizedConfiguration.disableGlow),
        NEON_BRIGHTNESS: normalizedConfiguration.neonBrightness
      });
      const result = this.dependencies.workbenchPatchService.applyAssets(basePath, {
        scriptContent,
        styleContent: uiStyles
      });

      if (result.status === "workbench-not-found") {
        await this.dependencies.notifications.showErrorMessage(NEON_EFFECT_MESSAGES.ERROR_WORKBENCH_NOT_FOUND);
        return;
      }

      const isReactivated = result.status === "reactivated";
      await this.dependencies.notifications.requestWorkbenchReload(
        isReactivated ? NEON_EFFECT_MESSAGES.REACTIVATED : NEON_EFFECT_MESSAGES.ACTIVATED,
        isReactivated ? "Restart editor to refresh settings" : "Restart editor to complete"
      );
    } catch (error) {
      this.logError("enableNeon", error, normalizedConfiguration);

      if (isFileAccessError(error)) {
        await this.dependencies.notifications.showInformationMessage(NEON_EFFECT_MESSAGES.ERROR_ACCESS_DENIED);
        return;
      }

      await this.dependencies.notifications.showErrorMessage(NEON_EFFECT_MESSAGES.ERROR_GENERIC);
    }
  }

  buildCustomChromeStyles(chromeStyles: string): string {
    const editorBackgroundCssValues = getEditorBackgroundCssValues(this.dependencies.storage, this.dependencies.fileSystem, this.dependencies.logger);
    const emptyEditorLogoStyles = getEmptyEditorLogoStyles(this.dependencies.storage, this.dependencies.fileSystem, this.dependencies.logger);

    return replaceRendererPlaceholders(chromeStyles, {
      EDITOR_BACKGROUND_AREA_BOTTOM: editorBackgroundCssValues.areaBottom,
      EDITOR_BACKGROUND_AREA_HEIGHT: editorBackgroundCssValues.areaHeight,
      EDITOR_BACKGROUND_AREA_LEFT: editorBackgroundCssValues.areaLeft,
      EDITOR_BACKGROUND_AREA_RIGHT: editorBackgroundCssValues.areaRight,
      EDITOR_BACKGROUND_AREA_TOP: editorBackgroundCssValues.areaTop,
      EDITOR_BACKGROUND_AREA_WIDTH: editorBackgroundCssValues.areaWidth,
      EDITOR_BACKGROUND_IMAGE: editorBackgroundCssValues.image,
      EDITOR_BACKGROUND_IMAGE_OPACITY: editorBackgroundCssValues.opacity,
      EDITOR_BACKGROUND_IMAGE_POSITION: editorBackgroundCssValues.position,
      EDITOR_BACKGROUND_IMAGE_REPEAT: editorBackgroundCssValues.repeat,
      EDITOR_BACKGROUND_IMAGE_SIZE: editorBackgroundCssValues.size,
      EMPTY_EDITOR_LOGO_STYLES: emptyEditorLogoStyles
    });
  }

  async disable(): Promise<void> {
    try {
      const result = this.dependencies.workbenchPatchService.removeScriptTag(resolveWorkbenchBasePath(this.dependencies.appRoot));

      if (result.status === "workbench-not-found") {
        await this.dependencies.notifications.showErrorMessage(NEON_EFFECT_MESSAGES.ERROR_WORKBENCH_NOT_FOUND);
        return;
      }

      if (result.status === "not-running") {
        await this.dependencies.notifications.showInformationMessage(NEON_EFFECT_MESSAGES.NOT_RUNNING);
        return;
      }

      await this.dependencies.notifications.requestWorkbenchReload(NEON_EFFECT_MESSAGES.DEACTIVATED, "Restart editor to complete");
    } catch (error) {
      this.logError("disableNeon", error, {});

      if (isFileAccessError(error)) {
        await this.dependencies.notifications.showInformationMessage(NEON_EFFECT_MESSAGES.ERROR_ACCESS_DENIED);
        return;
      }

      await this.dependencies.notifications.showErrorMessage(NEON_EFFECT_MESSAGES.ERROR_GENERIC);
    }
  }

  isEnabled(): boolean {
    try {
      return this.dependencies.workbenchPatchService.isEnabled(resolveWorkbenchBasePath(this.dependencies.appRoot));
    } catch (error) {
      if (!isFileAccessError(error)) {
        this.logError("isNeonEnabled", error, {});
      }

      return false;
    }
  }

  private logError(methodName: string, error: unknown, context: Record<string, unknown>): void {
    if (this.dependencies.logger) {
      this.dependencies.logger.logError(methodName, error, context);
      return;
    }

    logExtensionError(methodName, error, context);
  }
}

function resolveWorkbenchBasePath(appRoot: string): string {
  return path.join(path.dirname(appRoot), "app", "out", "vs", "code");
}

function normalizeNeonEffectConfiguration(configuration: NeonEffectConfiguration): {
  readonly brightness: number;
  readonly disableGlow: boolean;
  readonly neonBrightness: string;
} {
  let brightness = Number.parseFloat(String(configuration.brightness)) > 1
    ? 1
    : Number.parseFloat(String(configuration.brightness));

  brightness = brightness < 0 ? 0 : brightness;
  brightness = Number.isNaN(brightness) ? 0.45 : brightness;

  return {
    brightness,
    disableGlow: Boolean(configuration.disableGlow),
    neonBrightness: Math.floor(brightness * 255).toString(16).toUpperCase()
  };
}

function getEditorBackgroundCssValues(
  storage: ExtensionStorage | undefined,
  fileSystem: ExtensionFileSystem,
  logger: NeonEffectLogger | undefined
): EditorBackgroundCssValues {
  const defaultArea = getEditorBackgroundFitArea(EDITOR_BACKGROUND_DEFAULT_FIT);
  const defaultValues: EditorBackgroundCssValues = {
    image: "none",
    opacity: "0",
    position: EDITOR_BACKGROUND_DEFAULT_POSITION,
    size: EDITOR_BACKGROUND_DEFAULT_SIZE,
    repeat: EDITOR_BACKGROUND_DEFAULT_REPEAT,
    areaTop: defaultArea.top,
    areaRight: defaultArea.right,
    areaBottom: defaultArea.bottom,
    areaLeft: defaultArea.left,
    areaWidth: defaultArea.width,
    areaHeight: defaultArea.height
  };

  if (!storage) {
    return defaultValues;
  }

  try {
    const metadata = getStoredEditorBackgroundImageMetadata(storage);

    if (!metadata) {
      return defaultValues;
    }

    const imagePath = getEditorBackgroundImagePath(storage, metadata.fileName);

    if (!fileSystem.exists(imagePath)) {
      return defaultValues;
    }

    const imageBuffer = fileSystem.readFile(imagePath);
    const dataUri = `data:${metadata.mimeType};base64,${imageBuffer.toString("base64")}`;
    const fitArea = getEditorBackgroundFitArea(getStoredEditorBackgroundFit(storage));

    return {
      image: `url("${dataUri}")`,
      opacity: String(getStoredEditorBackgroundOpacity(storage)),
      position: EDITOR_BACKGROUND_DEFAULT_POSITION,
      size: EDITOR_BACKGROUND_DEFAULT_SIZE,
      repeat: EDITOR_BACKGROUND_DEFAULT_REPEAT,
      areaTop: fitArea.top,
      areaRight: fitArea.right,
      areaBottom: fitArea.bottom,
      areaLeft: fitArea.left,
      areaWidth: fitArea.width,
      areaHeight: fitArea.height
    };
  } catch (error) {
    logWithOptionalLogger(logger, "getEditorBackgroundCssValues", error, {});
    return defaultValues;
  }
}

function getEmptyEditorLogoStyles(
  storage: ExtensionStorage | undefined,
  fileSystem: ExtensionFileSystem,
  logger: NeonEffectLogger | undefined
): string {
  if (!storage) {
    return "";
  }

  try {
    const metadata = getStoredEmptyEditorLogoImageMetadata(storage);

    if (!metadata) {
      return "";
    }

    const logoPath = getEmptyEditorLogoImagePath(storage, metadata.fileName);

    if (!fileSystem.exists(logoPath)) {
      return "";
    }

    const logoBuffer = fileSystem.readFile(logoPath);
    const dataUri = `data:${metadata.mimeType};base64,${logoBuffer.toString("base64")}`;

    return createEmptyEditorLogoStyles(dataUri, getStoredEmptyEditorLogoOpacity(storage));
  } catch (error) {
    logWithOptionalLogger(logger, "getEmptyEditorLogoStyles", error, {});
    return "";
  }
}

function getStoredEditorBackgroundImageMetadata(storage: ExtensionStorage): StoredImageMetadata | undefined {
  return getStoredImageMetadata(storage, EDITOR_BACKGROUND_IMAGE_STATE_KEY, getSafeEditorBackgroundImageFileName);
}

function getStoredEmptyEditorLogoImageMetadata(storage: ExtensionStorage): StoredImageMetadata | undefined {
  return getStoredImageMetadata(storage, EMPTY_EDITOR_LOGO_IMAGE_STATE_KEY, getSafeEmptyEditorLogoImageFileName);
}

function getStoredImageMetadata(
  storage: ExtensionStorage,
  stateKey: string,
  getSafeFileName: (fileName: unknown) => string | undefined
): StoredImageMetadata | undefined {
  const metadata = storage.getValue(stateKey);

  if (!isRecord(metadata)) {
    return undefined;
  }

  const fileName = getSafeFileName(metadata.fileName);

  if (!fileName) {
    return undefined;
  }

  const extension = path.extname(fileName).slice(1).toLowerCase();

  return {
    fileName,
    mimeType: typeof metadata.mimeType === "string" ? metadata.mimeType : getEditorBackgroundImageMimeType(extension)
  };
}

function getStoredEditorBackgroundOpacity(storage: ExtensionStorage): number {
  return normalizeEditorBackgroundOpacity(storage.getValue(EDITOR_BACKGROUND_OPACITY_STATE_KEY));
}

function getStoredEditorBackgroundFit(storage: ExtensionStorage): string {
  return normalizeEditorBackgroundFit(storage.getValue(EDITOR_BACKGROUND_FIT_STATE_KEY));
}

function getStoredEmptyEditorLogoOpacity(storage: ExtensionStorage): number {
  return normalizeEmptyEditorLogoOpacity(storage.getValue(EMPTY_EDITOR_LOGO_OPACITY_STATE_KEY));
}

function normalizeEditorBackgroundOpacity(opacity: unknown): number {
  return normalizeOpacity(opacity, EDITOR_BACKGROUND_DEFAULT_OPACITY, EDITOR_BACKGROUND_MIN_OPACITY, EDITOR_BACKGROUND_MAX_OPACITY);
}

function normalizeEmptyEditorLogoOpacity(opacity: unknown): number {
  return normalizeOpacity(opacity, EMPTY_EDITOR_LOGO_DEFAULT_OPACITY, EMPTY_EDITOR_LOGO_MIN_OPACITY, EMPTY_EDITOR_LOGO_MAX_OPACITY);
}

function normalizeOpacity(opacity: unknown, defaultOpacity: number, minOpacity: number, maxOpacity: number): number {
  const numericOpacity = Number.parseFloat(String(opacity));

  if (!Number.isFinite(numericOpacity)) {
    return defaultOpacity;
  }

  const clampedOpacity = Math.min(maxOpacity, Math.max(minOpacity, numericOpacity));

  return Number(clampedOpacity.toFixed(2));
}

function getEditorBackgroundImagePath(storage: ExtensionStorage, fileName: string): string {
  return getStoredImagePath(storage, fileName, getSafeEditorBackgroundImageFileName, "editor background image");
}

function getEmptyEditorLogoImagePath(storage: ExtensionStorage, fileName: string): string {
  return getStoredImagePath(storage, fileName, getSafeEmptyEditorLogoImageFileName, "empty editor logo");
}

function getStoredImagePath(
  storage: ExtensionStorage,
  fileName: string,
  getSafeFileName: (fileName: unknown) => string | undefined,
  label: string
): string {
  const safeFileName = getSafeFileName(fileName);

  if (!safeFileName) {
    throw new Error(`Unsafe ${label} file name: ${String(fileName)}`);
  }

  const storageDirectory = path.resolve(storage.getGlobalStoragePath());
  const imagePath = path.resolve(storageDirectory, safeFileName);

  if (!imagePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error(`Unsafe ${label} path: ${imagePath}`);
  }

  return imagePath;
}

function getSafeEditorBackgroundImageFileName(fileName: unknown): string | undefined {
  return getSafeStoredImageFileName(fileName, EDITOR_BACKGROUND_IMAGE_FILE_PREFIX);
}

function getSafeEmptyEditorLogoImageFileName(fileName: unknown): string | undefined {
  return getSafeStoredImageFileName(fileName, EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX);
}

function getSafeStoredImageFileName(fileName: unknown, prefix: string): string | undefined {
  const normalizedFileName = String(fileName || "");

  if (
    !normalizedFileName
    || path.basename(normalizedFileName) !== normalizedFileName
    || !normalizedFileName.startsWith(`${prefix}.`)
  ) {
    return undefined;
  }

  return normalizedFileName;
}

function getEditorBackgroundImageMimeType(extension: string): string {
  return EDITOR_BACKGROUND_MIME_TYPES[String(extension || "").toLowerCase()] || "application/octet-stream";
}

function isFileAccessError(error: unknown): boolean {
  const code = isRecord(error) ? error.code : undefined;

  return typeof code === "string" && /ENOENT|EACCES|EPERM/.test(code);
}

function logWithOptionalLogger(
  logger: NeonEffectLogger | undefined,
  methodName: string,
  error: unknown,
  context: Record<string, unknown>
): void {
  if (logger) {
    logger.logError(methodName, error, context);
    return;
  }

  logExtensionError(methodName, error, context);
}

function logExtensionError(methodName: string, error: unknown, context: Record<string, unknown>): void {
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    methodName,
    context,
    message: normalizedError.message,
    stack: normalizedError.stack
  }, null, 2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
