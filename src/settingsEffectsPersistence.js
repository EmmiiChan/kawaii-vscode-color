const path = require("path");
const { ensurePlainObject } = require("./settingsPersistence");

const EDITOR_BACKGROUND_IMAGE_FILE_PREFIX = "editor-background-image";
const EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX = "empty-editor-logo-image";
const EDITOR_BACKGROUND_ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"];
const EDITOR_BACKGROUND_MIME_TYPES = {
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
];
const EMPTY_EDITOR_LOGO_DEFAULT_OPACITY = 0.75;
const EMPTY_EDITOR_LOGO_MIN_OPACITY = 0;
const EMPTY_EDITOR_LOGO_MAX_OPACITY = 1;

function normalizeEditorBackgroundOpacity(opacity) {
  return normalizeOpacity(
    opacity,
    EDITOR_BACKGROUND_DEFAULT_OPACITY,
    EDITOR_BACKGROUND_MIN_OPACITY,
    EDITOR_BACKGROUND_MAX_OPACITY
  );
}

function normalizeEmptyEditorLogoOpacity(opacity) {
  return normalizeOpacity(
    opacity,
    EMPTY_EDITOR_LOGO_DEFAULT_OPACITY,
    EMPTY_EDITOR_LOGO_MIN_OPACITY,
    EMPTY_EDITOR_LOGO_MAX_OPACITY
  );
}

function normalizeOpacity(opacity, defaultValue, minValue, maxValue) {
  const numericOpacity = Number.parseFloat(String(opacity));

  if (!Number.isFinite(numericOpacity)) {
    return defaultValue;
  }

  const clampedOpacity = Math.min(maxValue, Math.max(minValue, numericOpacity));

  return Number(clampedOpacity.toFixed(2));
}

function normalizeEditorBackgroundFit(fit) {
  const normalizedFit = String(fit || "")
    .trim()
    .toLowerCase()
    .replace(/^botton/, "bottom");

  return EDITOR_BACKGROUND_FIT_IDS.includes(normalizedFit)
    ? normalizedFit
    : EDITOR_BACKGROUND_DEFAULT_FIT;
}

function getSafeEditorBackgroundImageFileName(fileName) {
  return getSafeStoredImageFileName(fileName, EDITOR_BACKGROUND_IMAGE_FILE_PREFIX);
}

function getSafeEmptyEditorLogoImageFileName(fileName) {
  return getSafeStoredImageFileName(fileName, EMPTY_EDITOR_LOGO_IMAGE_FILE_PREFIX);
}

function getSafeStoredImageFileName(fileName, prefix) {
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

function resolveStoredEditorBackgroundImagePath(storagePath, fileName) {
  const safeFileName = getSafeEditorBackgroundImageFileName(fileName);

  if (!safeFileName) {
    throw new Error(`Unsafe editor background image file name: ${String(fileName)}`);
  }

  return resolveStoredImagePath(storagePath, safeFileName, "editor background image");
}

function resolveStoredEmptyEditorLogoImagePath(storagePath, fileName) {
  const safeFileName = getSafeEmptyEditorLogoImageFileName(fileName);

  if (!safeFileName) {
    throw new Error(`Unsafe empty editor logo file name: ${String(fileName)}`);
  }

  return resolveStoredImagePath(storagePath, safeFileName, "empty editor logo");
}

function resolveStoredImagePath(storagePath, safeFileName, label) {
  const storageDirectory = path.resolve(storagePath);
  const imagePath = path.resolve(storageDirectory, safeFileName);

  if (!imagePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error(`Unsafe ${label} path: ${imagePath}`);
  }

  return imagePath;
}

function getSupportedEditorBackgroundImageExtension(filePath) {
  const extension = path.extname(filePath).slice(1).toLowerCase();

  return EDITOR_BACKGROUND_ALLOWED_EXTENSIONS.includes(extension) ? extension : undefined;
}

function getEditorBackgroundImageMimeType(extension) {
  return EDITOR_BACKGROUND_MIME_TYPES[String(extension || "").toLowerCase()] || "application/octet-stream";
}

function normalizeExportedImage(image) {
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

function normalizeExportedImageExtension(extensionSource) {
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

function getExportedImageOriginalName(exportedImage, extension) {
  const originalName = path.basename(String(exportedImage.originalName || ""));

  if (originalName && getSupportedEditorBackgroundImageExtension(originalName)) {
    return originalName;
  }

  return `imported-kawaii-vscode-color-image.${extension}`;
}

function normalizeStoredEditorBackgroundMetadata(metadata) {
  return normalizeStoredImageMetadata(metadata, getSafeEditorBackgroundImageFileName);
}

function normalizeStoredEmptyEditorLogoMetadata(metadata) {
  return normalizeStoredImageMetadata(metadata, getSafeEmptyEditorLogoImageFileName);
}

function normalizeStoredImageMetadata(metadata, getSafeFileName) {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const fileName = getSafeFileName(metadata.fileName);

  if (!fileName) {
    return undefined;
  }

  return {
    fileName,
    originalName: typeof metadata.originalName === "string" ? metadata.originalName : fileName,
    mimeType: typeof metadata.mimeType === "string" ? metadata.mimeType : getEditorBackgroundImageMimeType(path.extname(fileName).slice(1)),
    size: typeof metadata.size === "number" ? metadata.size : 0
  };
}

function createStoredImageState(options) {
  const metadata = options.metadata;
  const fileExists = Boolean(metadata && options.fileExists);
  const size = metadata && typeof metadata.size === "number" ? metadata.size : 0;
  const state = {
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
    state.fit = options.fit;
    state.fitOptions = options.fitOptions;
  }

  state.supportedFormats = options.supportedFormats;
  state.dataUrlWarning = options.dataUrlWarning;
  state.maxImageSizeLabel = formatFileSize(options.maxImageSizeBytes);

  return state;
}

async function createStoredImageExport(metadata, dependencies) {
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

async function restoreStoredImageExport(image, dependencies) {
  const imageData = normalizeExportedImage(image);

  if (!imageData) {
    await dependencies.removeImage();
    return;
  }

  await dependencies.storeImage(imageData);
}

async function storeImageState(options) {
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

async function removeStoredImageState(options) {
  if (options.metadata) {
    await options.deleteFile(options.metadata);
  }

  await options.context.globalState.update(options.stateKey, undefined);
}

async function applyEffectsExport(effects, dependencies) {
  const exportedEffects = ensurePlainObject(effects);
  const editorBackground = ensurePlainObject(exportedEffects.editorBackground);
  const emptyEditorLogo = ensurePlainObject(exportedEffects.emptyEditorLogo);

  await dependencies.updateEditorBackgroundOpacity(editorBackground.opacity);
  await dependencies.updateEditorBackgroundFit(editorBackground.fit);
  await dependencies.restoreEditorBackgroundImage(editorBackground.image);
  await dependencies.updateEmptyEditorLogoOpacity(emptyEditorLogo.opacity);
  await dependencies.restoreEmptyEditorLogoImage(emptyEditorLogo.image);
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kibibytes = bytes / 1024;

  if (kibibytes < 1024) {
    return `${kibibytes.toFixed(1)} KB`;
  }

  return `${(kibibytes / 1024).toFixed(1)} MB`;
}

function getIsoTimestamp(options) {
  const value = typeof options.now === "function" ? options.now() : new Date();

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

module.exports = {
  applyEffectsExport,
  createStoredImageExport,
  createStoredImageState,
  formatFileSize,
  getEditorBackgroundImageMimeType,
  getExportedImageOriginalName,
  getSafeEditorBackgroundImageFileName,
  getSafeEmptyEditorLogoImageFileName,
  getSupportedEditorBackgroundImageExtension,
  normalizeEditorBackgroundFit,
  normalizeEditorBackgroundOpacity,
  normalizeEmptyEditorLogoOpacity,
  normalizeExportedImage,
  normalizeExportedImageExtension,
  normalizeStoredEditorBackgroundMetadata,
  normalizeStoredEmptyEditorLogoMetadata,
  removeStoredImageState,
  resolveStoredEditorBackgroundImagePath,
  resolveStoredEmptyEditorLogoImagePath,
  restoreStoredImageExport,
  storeImageState
};

