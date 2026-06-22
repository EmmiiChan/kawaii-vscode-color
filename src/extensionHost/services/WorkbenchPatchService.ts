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

export interface WorkbenchPatchService {
  applyScriptTag(basePath: string, scriptContent: string): WorkbenchPatchApplyResult;
  isEnabled(basePath: string): boolean;
  removeScriptTag(basePath: string): WorkbenchPatchRemoveResult;
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

  applyScriptTag(basePath: string, scriptContent: string): WorkbenchPatchApplyResult {
    const paths = this.resolvePatchPaths(basePath);

    if (!paths) {
      return { status: "workbench-not-found", paths: null };
    }

    const html = this.dependencies.fileSystem.readTextFile(paths.htmlFile);
    const wasEnabled = isWorkbenchPatchEnabled(html);
    const output = applyWorkbenchPatchScriptTag(html, this.getVersionToken());

    this.dependencies.fileSystem.writeTextFile(paths.templateFile, scriptContent);
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

  removeScriptTag(basePath: string): WorkbenchPatchRemoveResult {
    const paths = this.resolvePatchPaths(basePath);

    if (!paths) {
      return { status: "workbench-not-found", paths: null };
    }

    const html = this.dependencies.fileSystem.readTextFile(paths.htmlFile);

    if (!isWorkbenchPatchEnabled(html)) {
      return { status: "not-running", paths };
    }

    this.dependencies.fileSystem.writeTextFile(paths.htmlFile, removeWorkbenchPatchScriptTag(html));

    return { status: "removed", paths };
  }

  resolvePatchPaths(basePath: string): WorkbenchPatchPaths | null {
    return resolveWorkbenchPatchPaths(basePath, (candidatePath) => this.dependencies.fileSystem.exists(candidatePath));
  }

  private getVersionToken(): string | number {
    return this.dependencies.versionToken ? this.dependencies.versionToken() : Date.now();
  }
}
