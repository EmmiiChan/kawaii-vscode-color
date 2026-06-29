import path = require("path");
import {
  applyWorkbenchPatchScriptTag,
  isWorkbenchPatchEnabled,
  removeWorkbenchPatchScriptTag,
  resolveWorkbenchPatchPaths,
  type WorkbenchPatchPaths
} from "../../workbenchPatch";
import type { ExtensionFileSystem } from "../adapters/NodeFileSystem";

export type WorkbenchPatchApplyStatus = "activated" | "reactivated" | "workbench-not-found";
export type WorkbenchPatchRemoveStatus = "removed" | "not-running" | "workbench-not-found";

export interface WorkbenchPatchApplyResult {
  readonly paths: WorkbenchPatchPaths | null;
  readonly status: WorkbenchPatchApplyStatus;
}

export interface WorkbenchPatchRemoveResult {
  readonly paths: WorkbenchPatchPaths | null;
  readonly status: WorkbenchPatchRemoveStatus;
}

export interface WorkbenchPatchBinaryAsset {
  readonly content: Buffer;
  readonly fileName: string;
}

export interface WorkbenchPatchAssets {
  readonly deleteAssetFileNames?: readonly string[];
  readonly imageAssets?: readonly WorkbenchPatchBinaryAsset[];
  readonly scriptContent: string;
  readonly styleContent: string;
}

export interface WorkbenchPatchService {
  applyAssets(basePath: string, assets: WorkbenchPatchAssets): WorkbenchPatchApplyResult;
  isEnabled(basePath: string): boolean;
  removePatch(basePath: string): WorkbenchPatchRemoveResult;
  resolvePatchPaths(basePath: string): WorkbenchPatchPaths | null;
}

export interface WorkbenchPatchServiceDependencies {
  readonly fileSystem: ExtensionFileSystem;
  readonly versionToken?: () => string | number;
}

export function createWorkbenchPatchService(dependencies: WorkbenchPatchServiceDependencies): WorkbenchPatchService {
  return new DefaultWorkbenchPatchService(dependencies);
}

class DefaultWorkbenchPatchService implements WorkbenchPatchService {
  constructor(private readonly dependencies: WorkbenchPatchServiceDependencies) {}

  applyAssets(basePath: string, assets: WorkbenchPatchAssets): WorkbenchPatchApplyResult {
    const paths = this.resolvePatchPaths(basePath);

    if (!paths) {
      return { status: "workbench-not-found", paths: null };
    }

    const html = this.dependencies.fileSystem.readTextFile(paths.htmlFile);
    const wasEnabled = isWorkbenchPatchEnabled(html);
    const versionToken = this.getVersionToken();
    const scriptContent = replaceVersionToken(assets.scriptContent, versionToken);
    const styleContent = replaceVersionToken(assets.styleContent, versionToken);
    const output = applyWorkbenchPatchScriptTag(html, versionToken);

    this.deletePatchAssets(paths, assets.deleteAssetFileNames || []);
    this.writePatchImageAssets(paths, assets.imageAssets || []);
    this.dependencies.fileSystem.writeTextFile(paths.styleFile, styleContent);
    this.dependencies.fileSystem.writeTextFile(paths.scriptFile, scriptContent);
    this.dependencies.fileSystem.writeTextFile(paths.htmlFile, output);

    return {
      status: wasEnabled ? "reactivated" : "activated",
      paths
    };
  }

  isEnabled(basePath: string): boolean {
    const paths = this.resolvePatchPaths(basePath);

    if (!paths) {
      return false;
    }

    return isWorkbenchPatchEnabled(this.dependencies.fileSystem.readTextFile(paths.htmlFile));
  }

  removePatch(basePath: string): WorkbenchPatchRemoveResult {
    const paths = this.resolvePatchPaths(basePath);

    if (!paths) {
      return { status: "workbench-not-found", paths: null };
    }

    const html = this.dependencies.fileSystem.readTextFile(paths.htmlFile);
    const wasEnabled = isWorkbenchPatchEnabled(html);

    if (wasEnabled) {
      this.dependencies.fileSystem.writeTextFile(paths.htmlFile, removeWorkbenchPatchScriptTag(html));
    }

    this.deleteFileIfExists(paths.scriptFile);
    this.deleteFileIfExists(paths.styleFile);
    this.deletePatchAssets(paths, WORKBENCH_IMAGE_ASSET_FILE_NAMES);

    return { status: wasEnabled ? "removed" : "not-running", paths };
  }

  resolvePatchPaths(basePath: string): WorkbenchPatchPaths | null {
    return resolveWorkbenchPatchPaths(basePath, (candidatePath) => this.dependencies.fileSystem.exists(candidatePath));
  }

  private getVersionToken(): string | number {
    return this.dependencies.versionToken ? this.dependencies.versionToken() : Date.now();
  }

  private deletePatchAssets(paths: WorkbenchPatchPaths, fileNames: readonly string[]): void {
    for (const fileName of fileNames) {
      this.deleteFileIfExists(this.resolvePatchAssetPath(paths, fileName));
    }
  }

  private writePatchImageAssets(paths: WorkbenchPatchPaths, imageAssets: readonly WorkbenchPatchBinaryAsset[]): void {
    for (const asset of imageAssets) {
      this.dependencies.fileSystem.writeFile(
        this.resolvePatchAssetPath(paths, asset.fileName),
        asset.content
      );
    }
  }

  private resolvePatchAssetPath(paths: WorkbenchPatchPaths, fileName: string): string {
    if (path.basename(fileName) !== fileName) {
      throw new Error(`Unsafe workbench asset file name: ${fileName}`);
    }

    return path.join(path.dirname(paths.htmlFile), fileName);
  }

  private deleteFileIfExists(filePath: string): void {
    if (!this.dependencies.fileSystem.exists(filePath)) {
      return;
    }

    try {
      this.dependencies.fileSystem.deleteFile(filePath);
    } catch (error) {
      if (isErrorCode(error, "ENOENT")) {
        return;
      }

      throw error;
    }
  }
}

const WORKBENCH_IMAGE_ASSET_FILE_NAMES: readonly string[] = [
  "kawaii-vscode-colors-editor-background-image.png",
  "kawaii-vscode-colors-editor-background-image.jpg",
  "kawaii-vscode-colors-editor-background-image.jpeg",
  "kawaii-vscode-colors-editor-background-image.webp",
  "kawaii-vscode-colors-editor-background-image.svg",
  "kawaii-vscode-colors-empty-editor-logo-image.png",
  "kawaii-vscode-colors-empty-editor-logo-image.jpg",
  "kawaii-vscode-colors-empty-editor-logo-image.jpeg",
  "kawaii-vscode-colors-empty-editor-logo-image.webp",
  "kawaii-vscode-colors-empty-editor-logo-image.svg"
];

function replaceVersionToken(content: string, versionToken: string | number): string {
  return content.replace(/\[KAWAII_UI_STYLE_VERSION\]/g, String(versionToken));
}

function isErrorCode(error: unknown, code: string): boolean {
  const candidate = error as { code?: unknown };

  return Boolean(candidate && candidate.code === code);
}
