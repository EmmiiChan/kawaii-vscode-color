import path = require("path");
import { ensurePlainObject, type PlainRecord } from "./settingsPersistence";

const EDITOR_BACKGROUND_IMAGE_FILE_PREFIX = "editor-background-image";
const EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX = "empty-editor-logo-image";
const EDITOR_BACKGROUND_ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"] as const;
const EDITOR_BACKGROUND_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml"
};
const EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL = "PNG, JPG/JPEG, WEBP, SVG";
const EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const EDITOR_BACKGROUND_DEFAULT_OPACITY = 0.12;
const EDITOR_BACKGROUND_MIN_OPACITY = 0;
const EDITOR_BACKGROUND_MAX_OPACITY = 0.35;
const EDITOR_BACKGROUND_DEFAULT_FIT = "full";
const EDITOR_BACKGROUND_FIT_IDS = [
  "full",
  "top",
  "bottom",
  "left",
  "right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right"
] as const;
const EMPTY_EDITOR_LOGO_DEFAULT_OPACITY = 0.75;
const EMPTY_EDITOR_LOGO_MIN_OPACITY = 0;
const EMPTY_EDITOR_LOGO_MAX_OPACITY = 1;

type EditorBackgroundFit = typeof EDITOR_BACKGROUND_FIT_IDS[number];

export interface StoredImageMetadata {
  readonly fileName: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
}

export interface NormalizedImageData {
  readonly imageBuffer: Buffer;
  readonly extension: string;
  readonly originalName: string;
  readonly mimeType: string;
}

export interface StoredImageExport {
  readonly fileName: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly extension: string;
  readonly size: number;
  readonly dataBase64: string;
}

interface StoredImageStateOptions {
  readonly metadata?: StoredImageMetadata;
  readonly fileExists: boolean;
  readonly previewUri: string;
  readonly opacity: number;
  readonly minOpacity: number;
  readonly maxOpacity: number;
  readonly opacityStep: number;
  readonly fit?: string;
  readonly fitOptions?: readonly unknown[];
  readonly supportedFormats: string;
  readonly dataUrlWarning: string;
  readonly maxImageSizeBytes: number;
}

interface StoredImageState {
  hasImage: boolean;
  missingImage: boolean;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  sizeLabel: string;
  previewUri: string;
  opacity: number;
  minOpacity: number;
  maxOpacity: number;
  opacityStep: number;
  fit?: string;
  fitOptions?: readonly unknown[];
  supportedFormats?: string;
  dataUrlWarning?: string;
  maxImageSizeLabel?: string;
}

interface StoredImageExportDependencies {
  exists(filePath: string): boolean;
  readFile(filePath: string): Promise<Buffer> | Buffer;
  resolvePath(fileName: string): string;
}

interface RestoreStoredImageDependencies {
  removeImage(): Promise<void> | void;
  storeImage(imageData: NormalizedImageData): Promise<void> | void;
}

interface GlobalStateLike {
  update(key: string, value: unknown): Promise<void> | void;
}

interface ExtensionContextLike {
  readonly globalState: GlobalStateLike;
}

interface StoreImageStateOptions extends TimestampProvider {
  readonly context: ExtensionContextLike;
  readonly stateKey: string;
  readonly imageData: NormalizedImageData;
  readonly fileName: string;
  readonly previousMetadata?: StoredImageMetadata;
  readonly targetPath: string;
  readonly ensureStorageDirectory: () => Promise<void> | void;
  readonly deletePreviousFile: (metadata: StoredImageMetadata | undefined, preservedFileName: string) => Promise<void> | void;
  readonly fileSystem: {
    writeFile(filePath: string, imageBuffer: Buffer): Promise<void> | void;
  };
  readonly maxSizeBytes?: number;
  readonly maxSizeErrorMessage: string;
}

interface RemoveStoredImageStateOptions {
  readonly context: ExtensionContextLike;
  readonly stateKey: string;
  readonly metadata?: StoredImageMetadata;
  readonly deleteFile: (metadata: StoredImageMetadata) => Promise<void> | void;
}

interface EffectsDependencies {
  updateEditorBackgroundOpacity(value: unknown): Promise<void> | void;
  updateEditorBackgroundFit(value: unknown): Promise<void> | void;
  restoreEditorBackgroundImage(value: unknown): Promise<void> | void;
  updateEmptyEditorLogoOpacity(value: unknown): Promise<void> | void;
  restoreEmptyEditorLogoImage(value: unknown): Promise<void> | void;
}

interface TimestampProvider {
  readonly now?: () => Date | string | number;
}

export function normalizeEditorBackgroundOpacity(opacity: unknown): number {
  return normalizeOpacity(
    opacity,
    EDITOR_BACKGROUND_DEFAULT_OPACITY,
    EDITOR_BACKGROUND_MIN_OPACITY,
    EDITOR_BACKGROUND_MAX_OPACITY
  );
}

export function normalizeEmptyEditorLogoOpacity(opacity: unknown): number {
  return normalizeOpacity(
    opacity,
    EMPTY_EDITOR_LOGO_DEFAULT_OPACITY,
    EMPTY_EDITOR_LOGO_MIN_OPACITY,
    EMPTY_EDITOR_LOGO_MAX_OPACITY
  );
}

function normalizeOpacity(opacity: unknown, defaultValue: number, minValue: number, maxValue: number): number {
  const numericOpacity = Number.parseFloat(String(opacity));

  if (!Number.isFinite(numericOpacity)) {
    return defaultValue;
  }

  const clampedOpacity = Math.min(maxValue, Math.max(minValue, numericOpacity));

  return Number(clampedOpacity.toFixed(2));
}

export function normalizeEditorBackgroundFit(fit: unknown): EditorBackgroundFit {
  const normalizedFit = String(fit || "")
    .trim()
    .toLowerCase()
    .replace(/^botton/, "bottom");

  return isEditorBackgroundFit(normalizedFit)
    ? normalizedFit
    : EDITOR_BACKGROUND_DEFAULT_FIT;
}

export function getSafeEditorBackgroundImageFileName(fileName: unknown): string | undefined {
  return getSafeStoredImageFileName(fileName, EDITOR_BACKGROUND_IMAGE_FILE_PREFIX);
}

export function getSafeEmptyEditorLogoImageFileName(fileName: unknown): string | undefined {
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

export function resolveStoredEditorBackgroundImagePath(storagePath: string, fileName: unknown): string {
  const safeFileName = getSafeEditorBackgroundImageFileName(fileName);

  if (!safeFileName) {
    throw new Error(`Unsafe editor background image file name: ${String(fileName)}`);
  }

  return resolveStoredImagePath(storagePath, safeFileName, "editor background image");
}

export function resolveStoredEmptyEditorLogoImagePath(storagePath: string, fileName: unknown): string {
  const safeFileName = getSafeEmptyEditorLogoImageFileName(fileName);

  if (!safeFileName) {
    throw new Error(`Unsafe empty editor logo file name: ${String(fileName)}`);
  }

  return resolveStoredImagePath(storagePath, safeFileName, "empty editor logo");
}

function resolveStoredImagePath(storagePath: string, safeFileName: string, label: string): string {
  const storageDirectory = path.resolve(storagePath);
  const imagePath = path.resolve(storageDirectory, safeFileName);

  if (!imagePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error(`Unsafe ${label} path: ${imagePath}`);
  }

  return imagePath;
}

export function getSupportedEditorBackgroundImageExtension(filePath: string): string | undefined {
  const extension = path.extname(filePath).slice(1).toLowerCase();

  return EDITOR_BACKGROUND_ALLOWED_EXTENSIONS.includes(extension as typeof EDITOR_BACKGROUND_ALLOWED_EXTENSIONS[number])
    ? extension
    : undefined;
}

export function getEditorBackgroundImageMimeType(extension: string): string {
  return EDITOR_BACKGROUND_MIME_TYPES[String(extension || "").toLowerCase()] || "application/octet-stream";
}

export function normalizeExportedImage(image: unknown): NormalizedImageData | undefined {
  const exportedImage = ensurePlainObject(image);
  const dataBase64 = typeof exportedImage.dataBase64 === "string" ? exportedImage.dataBase64 : "";

  if (!dataBase64) {
    return undefined;
  }

  const extension = normalizeExportedImageExtension(exportedImage.extension || exportedImage.fileName);
  const imageBuffer = Buffer.from(dataBase64, "base64");

  if (imageBuffer.length > EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Imported image must be ${formatFileSize(EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES)} or smaller.`);
  }

  return {
    imageBuffer,
    extension,
    originalName: getExportedImageOriginalName(exportedImage, extension),
    mimeType: getEditorBackgroundImageMimeType(extension)
  };
}

export function normalizeExportedImageExtension(extensionSource: unknown): string {
  const rawSource = String(extensionSource || "");
  const source = rawSource.includes(".")
    ? rawSource
    : `image.${rawSource}`;
  const extension = getSupportedEditorBackgroundImageExtension(source);

  if (!extension) {
    throw new Error(`Imported image format is unsupported. Use ${EDITOR_BACKGROUND_SUPPORTED_FORMATS_LABEL}.`);
  }

  return extension;
}

export function getExportedImageOriginalName(exportedImage: PlainRecord, extension: string): string {
  const originalName = path.basename(String(exportedImage.originalName || ""));

  if (originalName && getSupportedEditorBackgroundImageExtension(originalName)) {
    return originalName;
  }

  return `imported-kawaii-vscode-color-image.${extension}`;
}

export function normalizeStoredEditorBackgroundMetadata(metadata: unknown): StoredImageMetadata | undefined {
  return normalizeStoredImageMetadata(metadata, getSafeEditorBackgroundImageFileName);
}

export function normalizeStoredEmptyEditorLogoMetadata(metadata: unknown): StoredImageMetadata | undefined {
  return normalizeStoredImageMetadata(metadata, getSafeEmptyEditorLogoImageFileName);
}

function normalizeStoredImageMetadata(
  metadata: unknown,
  getSafeFileName: (fileName: unknown) => string | undefined
): StoredImageMetadata | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const metadataRecord = metadata as PlainRecord;
  const fileName = getSafeFileName(metadataRecord.fileName);

  if (!fileName) {
    return undefined;
  }

  return {
    fileName,
    originalName: typeof metadataRecord.originalName === "string" ? metadataRecord.originalName : fileName,
    mimeType: typeof metadataRecord.mimeType === "string" ? metadataRecord.mimeType : getEditorBackgroundImageMimeType(path.extname(fileName).slice(1)),
    size: typeof metadataRecord.size === "number" ? metadataRecord.size : 0
  };
}

export function createStoredImageState(options: StoredImageStateOptions): StoredImageState {
  const metadata = options.metadata;
  const fileExists = Boolean(metadata && options.fileExists);
  const size = metadata && typeof metadata.size === "number" ? metadata.size : 0;
  const state: StoredImageState = {
    hasImage: fileExists,
    missingImage: Boolean(metadata && !fileExists),
    fileName: metadata ? metadata.fileName : "",
    originalName: metadata ? metadata.originalName : "",
    mimeType: metadata ? metadata.mimeType : "",
    size,
    sizeLabel: size > 0 ? formatFileSize(size) : "",
    previewUri: fileExists ? options.previewUri : "",
    opacity: options.opacity,
    minOpacity: options.minOpacity,
    maxOpacity: options.maxOpacity,
    opacityStep: options.opacityStep
  };

  if (Object.prototype.hasOwnProperty.call(options, "fit")) {
    if (options.fit !== undefined) {
      state.fit = options.fit;
    }

    if (options.fitOptions !== undefined) {
      state.fitOptions = options.fitOptions;
    }
  }

  state.supportedFormats = options.supportedFormats;
  state.dataUrlWarning = options.dataUrlWarning;
  state.maxImageSizeLabel = formatFileSize(options.maxImageSizeBytes);

  return state;
}

export async function createStoredImageExport(
  metadata: StoredImageMetadata | undefined,
  dependencies: StoredImageExportDependencies
): Promise<StoredImageExport | undefined> {
  if (!metadata) {
    return undefined;
  }

  const imagePath = dependencies.resolvePath(metadata.fileName);

  if (!dependencies.exists(imagePath)) {
    return undefined;
  }

  const imageBuffer = await dependencies.readFile(imagePath);
  const extension = getSupportedEditorBackgroundImageExtension(metadata.fileName);

  if (!extension) {
    return undefined;
  }

  return {
    fileName: metadata.fileName,
    originalName: metadata.originalName,
    mimeType: metadata.mimeType,
    extension,
    size: imageBuffer.length,
    dataBase64: imageBuffer.toString("base64")
  };
}

export async function restoreStoredImageExport(
  image: unknown,
  dependencies: RestoreStoredImageDependencies
): Promise<void> {
  const imageData = normalizeExportedImage(image);

  if (!imageData) {
    await dependencies.removeImage();
    return;
  }

  await dependencies.storeImage(imageData);
}

export async function storeImageState(options: StoreImageStateOptions): Promise<void> {
  const maxSizeBytes = options.maxSizeBytes || EDITOR_BACKGROUND_MAX_IMAGE_SIZE_BYTES;

  if (options.imageData.imageBuffer.length > maxSizeBytes) {
    throw new Error(options.maxSizeErrorMessage);
  }

  await options.ensureStorageDirectory();
  await options.deletePreviousFile(options.previousMetadata, options.fileName);
  await options.fileSystem.writeFile(options.targetPath, options.imageData.imageBuffer);
  await options.context.globalState.update(options.stateKey, {
    fileName: options.fileName,
    originalName: options.imageData.originalName,
    mimeType: options.imageData.mimeType,
    size: options.imageData.imageBuffer.length,
    updatedAt: getIsoTimestamp(options)
  });
}

export async function removeStoredImageState(options: RemoveStoredImageStateOptions): Promise<void> {
  if (options.metadata) {
    await options.deleteFile(options.metadata);
  }

  await options.context.globalState.update(options.stateKey, undefined);
}

export async function applyEffectsExport(effects: unknown, dependencies: EffectsDependencies): Promise<void> {
  const exportedEffects = ensurePlainObject(effects);
  const editorBackground = ensurePlainObject(exportedEffects.editorBackground);
  const emptyEditorLogo = ensurePlainObject(exportedEffects.emptyEditorLogo);

  await dependencies.updateEditorBackgroundOpacity(editorBackground.opacity);
  await dependencies.updateEditorBackgroundFit(editorBackground.fit);
  await dependencies.restoreEditorBackgroundImage(editorBackground.image);
  await dependencies.updateEmptyEditorLogoOpacity(emptyEditorLogo.opacity);
  await dependencies.restoreEmptyEditorLogoImage(emptyEditorLogo.image);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kibibytes = bytes / 1024;

  if (kibibytes < 1024) {
    return `${kibibytes.toFixed(1)} KB`;
  }

  return `${(kibibytes / 1024).toFixed(1)} MB`;
}

function getIsoTimestamp(options: TimestampProvider): string {
  const value = typeof options.now === "function" ? options.now() : new Date();

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isEditorBackgroundFit(value: string): value is EditorBackgroundFit {
  return EDITOR_BACKGROUND_FIT_IDS.includes(value as EditorBackgroundFit);
}
