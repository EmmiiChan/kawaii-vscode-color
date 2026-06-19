const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  applyEffectsExport,
  createStoredImageExport,
  createStoredImageState,
  formatFileSize,
  getEditorBackgroundImageMimeType,
  getSafeEditorBackgroundImageFileName,
  getSafeEmptyEditorLogoImageFileName,
  getSupportedEditorBackgroundImageExtension,
  normalizeEditorBackgroundFit,
  normalizeEditorBackgroundOpacity,
  normalizeEmptyEditorLogoOpacity,
  normalizeExportedImage,
  normalizeStoredEditorBackgroundMetadata,
  normalizeStoredEmptyEditorLogoMetadata,
  removeStoredImageState,
  resolveStoredEditorBackgroundImagePath,
  resolveStoredEmptyEditorLogoImagePath,
  restoreStoredImageExport,
  storeImageState
} = require("../../out/src/settingsEffectsPersistence");

const FIXTURES_DIR = path.resolve(__dirname, "..", "fixtures", "settings");

function createContext() {
  const state = new Map();

  return {
    state,
    context: {
      globalState: {
        get(key) {
          return state.get(key);
        },
        update(key, value) {
          if (value === undefined) {
            state.delete(key);
          } else {
            state.set(key, value);
          }

          return Promise.resolve();
        }
      }
    }
  };
}

test("normalizes editor background and empty logo opacity plus fit values", () => {
  assert.equal(normalizeEditorBackgroundOpacity("0.126"), 0.13);
  assert.equal(normalizeEditorBackgroundOpacity("-1"), 0);
  assert.equal(normalizeEditorBackgroundOpacity("2"), 0.35);
  assert.equal(normalizeEditorBackgroundOpacity("bad"), 0.12);

  assert.equal(normalizeEmptyEditorLogoOpacity("0.756"), 0.76);
  assert.equal(normalizeEmptyEditorLogoOpacity("-1"), 0);
  assert.equal(normalizeEmptyEditorLogoOpacity("2"), 1);
  assert.equal(normalizeEmptyEditorLogoOpacity("bad"), 0.75);

  assert.equal(normalizeEditorBackgroundFit(" Top-Left "), "top-left");
  assert.equal(normalizeEditorBackgroundFit("botton-right"), "bottom-right");
  assert.equal(normalizeEditorBackgroundFit("unknown"), "full");
});

test("validates safe stored file names and resolves paths under storage", () => {
  const storagePath = path.normalize("C:/tmp/kawaii-storage");

  assert.equal(getSafeEditorBackgroundImageFileName("editor-background-image.png"), "editor-background-image.png");
  assert.equal(getSafeEditorBackgroundImageFileName("../editor-background-image.png"), undefined);
  assert.equal(getSafeEditorBackgroundImageFileName("other.png"), undefined);
  assert.equal(getSafeEmptyEditorLogoImageFileName("empty-editor-logo-image.webp"), "empty-editor-logo-image.webp");
  assert.equal(getSafeEmptyEditorLogoImageFileName("folder/empty-editor-logo-image.webp"), undefined);

  assert.equal(
    resolveStoredEditorBackgroundImagePath(storagePath, "editor-background-image.png"),
    path.resolve(storagePath, "editor-background-image.png")
  );
  assert.equal(
    resolveStoredEmptyEditorLogoImagePath(storagePath, "empty-editor-logo-image.png"),
    path.resolve(storagePath, "empty-editor-logo-image.png")
  );
  assert.throws(
    () => resolveStoredEditorBackgroundImagePath(storagePath, "../editor-background-image.png"),
    /Unsafe editor background image file name/
  );
});

test("normalizes supported image extensions, MIME types, and file sizes", () => {
  assert.equal(getSupportedEditorBackgroundImageExtension("IMAGE.PNG"), "png");
  assert.equal(getSupportedEditorBackgroundImageExtension("image.jpeg"), "jpeg");
  assert.equal(getSupportedEditorBackgroundImageExtension("image.gif"), undefined);
  assert.equal(getEditorBackgroundImageMimeType("jpg"), "image/jpeg");
  assert.equal(getEditorBackgroundImageMimeType("unknown"), "application/octet-stream");
  assert.equal(formatFileSize(12), "12 B");
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatFileSize(2 * 1024 * 1024), "2.0 MB");
});

test("normalizes exported image data and rejects unsupported or oversized imports", () => {
  const normalized = normalizeExportedImage({
    dataBase64: Buffer.from("hello").toString("base64"),
    fileName: "custom.webp",
    originalName: "../unsafe.txt"
  });

  assert.equal(normalized.extension, "webp");
  assert.equal(normalized.originalName, "imported-kawaii-vscode-color-image.webp");
  assert.equal(normalized.mimeType, "image/webp");
  assert.deepEqual(normalized.imageBuffer, Buffer.from("hello"));

  assert.equal(normalizeExportedImage({}), undefined);
  assert.throws(
    () => normalizeExportedImage({ dataBase64: "aGVsbG8=", extension: "gif" }),
    /Imported image format is unsupported/
  );
  assert.throws(
    () => normalizeExportedImage({ dataBase64: Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64"), extension: "png" }),
    /Imported image must be 2\.0 MB or smaller/
  );
});

test("normalizes metadata and builds stored image state", () => {
  assert.deepEqual(normalizeStoredEditorBackgroundMetadata({
    fileName: "editor-background-image.png",
    originalName: "wallpaper.png",
    mimeType: "image/png",
    size: 2048
  }), {
    fileName: "editor-background-image.png",
    originalName: "wallpaper.png",
    mimeType: "image/png",
    size: 2048
  });
  assert.equal(normalizeStoredEditorBackgroundMetadata({ fileName: "../editor-background-image.png" }), undefined);
  assert.equal(normalizeStoredEmptyEditorLogoMetadata(null), undefined);

  assert.deepEqual(createStoredImageState({
    metadata: { fileName: "editor-background-image.png", originalName: "wallpaper.png", mimeType: "image/png", size: 2048 },
    fileExists: true,
    previewUri: "data:image/png;base64,abc",
    opacity: 0.12,
    minOpacity: 0,
    maxOpacity: 0.35,
    opacityStep: 0.01,
    fit: "full",
    fitOptions: [{ id: "full" }],
    supportedFormats: "PNG",
    dataUrlWarning: "warning",
    maxImageSizeBytes: 2 * 1024 * 1024
  }), {
    hasImage: true,
    missingImage: false,
    fileName: "editor-background-image.png",
    originalName: "wallpaper.png",
    mimeType: "image/png",
    size: 2048,
    sizeLabel: "2.0 KB",
    previewUri: "data:image/png;base64,abc",
    opacity: 0.12,
    minOpacity: 0,
    maxOpacity: 0.35,
    opacityStep: 0.01,
    fit: "full",
    fitOptions: [{ id: "full" }],
    supportedFormats: "PNG",
    dataUrlWarning: "warning",
    maxImageSizeLabel: "2.0 MB"
  });
});

test("exports stored image bytes when metadata and file are available", async () => {
  const imageBuffer = Buffer.from("image");
  const exported = await createStoredImageExport({
    fileName: "editor-background-image.png",
    originalName: "wallpaper.png",
    mimeType: "image/png",
    size: imageBuffer.length
  }, {
    exists() {
      return true;
    },
    readFile() {
      return Promise.resolve(imageBuffer);
    },
    resolvePath(storageFileName) {
      return `C:/tmp/${storageFileName}`;
    }
  });

  assert.deepEqual(exported, {
    fileName: "editor-background-image.png",
    originalName: "wallpaper.png",
    mimeType: "image/png",
    extension: "png",
    size: imageBuffer.length,
    dataBase64: imageBuffer.toString("base64")
  });

  assert.equal(await createStoredImageExport(undefined, { exists() {} }), undefined);
  assert.equal(await createStoredImageExport({ fileName: "editor-background-image.png" }, {
    exists() {
      return false;
    },
    resolvePath() {
      return "missing";
    }
  }), undefined);
});

test("exports PNG fixture images as stable bundle image payloads", async () => {
  const editorBackgroundPath = path.join(FIXTURES_DIR, "editor-background.png");
  const emptyEditorLogoPath = path.join(FIXTURES_DIR, "empty-editor-logo.png");
  const editorBackgroundBuffer = fs.readFileSync(editorBackgroundPath);
  const emptyEditorLogoBuffer = fs.readFileSync(emptyEditorLogoPath);

  assert.equal(editorBackgroundBuffer.length, 68);
  assert.equal(emptyEditorLogoBuffer.length, 68);

  const exportedEditorBackground = await createStoredImageExport({
    fileName: "editor-background-image.png",
    originalName: "editor-background.png",
    mimeType: "image/png",
    size: editorBackgroundBuffer.length
  }, {
    exists(filePath) {
      return fs.existsSync(filePath);
    },
    readFile(filePath) {
      return fs.promises.readFile(filePath);
    },
    resolvePath() {
      return editorBackgroundPath;
    }
  });

  const exportedEmptyEditorLogo = await createStoredImageExport({
    fileName: "empty-editor-logo-image.png",
    originalName: "empty-editor-logo.png",
    mimeType: "image/png",
    size: emptyEditorLogoBuffer.length
  }, {
    exists(filePath) {
      return fs.existsSync(filePath);
    },
    readFile(filePath) {
      return fs.promises.readFile(filePath);
    },
    resolvePath() {
      return emptyEditorLogoPath;
    }
  });

  assert.equal(exportedEditorBackground.extension, "png");
  assert.equal(exportedEditorBackground.dataBase64, editorBackgroundBuffer.toString("base64"));
  assert.equal(exportedEmptyEditorLogo.extension, "png");
  assert.equal(exportedEmptyEditorLogo.dataBase64, emptyEditorLogoBuffer.toString("base64"));
});

test("restores exported image by removing missing data or storing valid data", async () => {
  const calls = [];

  await restoreStoredImageExport({}, {
    removeImage() {
      calls.push("remove");
      return Promise.resolve();
    },
    storeImage() {
      calls.push("store");
      return Promise.resolve();
    }
  });

  await restoreStoredImageExport({
    dataBase64: Buffer.from("image").toString("base64"),
    extension: "png",
    originalName: "image.png"
  }, {
    removeImage() {
      calls.push("remove-valid");
      return Promise.resolve();
    },
    storeImage(imageData) {
      calls.push(`store:${imageData.extension}:${imageData.imageBuffer.toString("utf8")}`);
      return Promise.resolve();
    }
  });

  assert.deepEqual(calls, ["remove", "store:png:image"]);
});

test("stores image bytes, deletes previous files, and updates metadata", async () => {
  const { context, state } = createContext();
  const deleted = [];
  const writes = [];

  await storeImageState({
    context,
    stateKey: "image",
    imageData: {
      imageBuffer: Buffer.from("new"),
      extension: "png",
      originalName: "new.png",
      mimeType: "image/png"
    },
    fileName: "editor-background-image.png",
    previousMetadata: { fileName: "editor-background-image.jpg" },
    targetPath: "C:/tmp/editor-background-image.png",
    ensureStorageDirectory() {
      writes.push("mkdir");
      return Promise.resolve();
    },
    deletePreviousFile(metadata, preservedFileName) {
      deleted.push({ metadata, preservedFileName });
      return Promise.resolve();
    },
    fileSystem: {
      writeFile(filePath, imageBuffer) {
        writes.push(`${filePath}:${imageBuffer.toString("utf8")}`);
        return Promise.resolve();
      }
    },
    now() {
      return new Date("2026-06-17T12:00:00.000Z");
    },
    maxSizeErrorMessage: "Image too large."
  });

  assert.deepEqual(deleted, [
    { metadata: { fileName: "editor-background-image.jpg" }, preservedFileName: "editor-background-image.png" }
  ]);
  assert.deepEqual(writes, ["mkdir", "C:/tmp/editor-background-image.png:new"]);
  assert.deepEqual(state.get("image"), {
    fileName: "editor-background-image.png",
    originalName: "new.png",
    mimeType: "image/png",
    size: 3,
    updatedAt: "2026-06-17T12:00:00.000Z"
  });

  await assert.rejects(
    storeImageState({
      context,
      imageData: { imageBuffer: Buffer.alloc(2 * 1024 * 1024 + 1) },
      maxSizeErrorMessage: "Image too large."
    }),
    /Image too large\./
  );
});

test("removes stored image state and applies effects exports in order", async () => {
  const { context, state } = createContext();
  const calls = [];
  state.set("image", { fileName: "editor-background-image.png" });

  await removeStoredImageState({
    context,
    stateKey: "image",
    metadata: { fileName: "editor-background-image.png" },
    deleteFile(metadata) {
      calls.push(`delete:${metadata.fileName}`);
      return Promise.resolve();
    }
  });

  assert.equal(state.has("image"), false);
  assert.deepEqual(calls, ["delete:editor-background-image.png"]);

  await applyEffectsExport({
    editorBackground: { opacity: 0.2, fit: "left", image: { marker: "bg" } },
    emptyEditorLogo: { opacity: 0.7, image: { marker: "logo" } }
  }, {
    updateEditorBackgroundOpacity(value) {
      calls.push(`bg-opacity:${value}`);
      return Promise.resolve();
    },
    updateEditorBackgroundFit(value) {
      calls.push(`bg-fit:${value}`);
      return Promise.resolve();
    },
    restoreEditorBackgroundImage(value) {
      calls.push(`bg-image:${value.marker}`);
      return Promise.resolve();
    },
    updateEmptyEditorLogoOpacity(value) {
      calls.push(`logo-opacity:${value}`);
      return Promise.resolve();
    },
    restoreEmptyEditorLogoImage(value) {
      calls.push(`logo-image:${value.marker}`);
      return Promise.resolve();
    }
  });

  assert.deepEqual(calls.slice(1), [
    "bg-opacity:0.2",
    "bg-fit:left",
    "bg-image:bg",
    "logo-opacity:0.7",
    "logo-image:logo"
  ]);
});
