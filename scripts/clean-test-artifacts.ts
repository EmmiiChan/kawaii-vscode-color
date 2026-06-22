import fs = require("node:fs");
import path = require("node:path");

interface OutputWriter {
  write(chunk: string): unknown;
}

interface CleanTestArtifactsOptions {
  readonly workspaceRoot?: string;
  readonly artifactRelativePaths?: readonly string[];
  readonly output?: OutputWriter;
}

interface CleanTestArtifactsResult {
  readonly removedRelativePaths: readonly string[];
  readonly missingRelativePaths: readonly string[];
}

const TEST_ARTIFACT_RELATIVE_PATHS = [
  ".vscode-test",
  "test-results",
  "playwright-report",
  "out-tests"
] as const;
const WORKSPACE_MARKER_FILES = ["package.json", "tsconfig.extension.json"] as const;
const WORKSPACE_ROOT = resolveWorkspaceRoot(__dirname);

function resolveWorkspaceRoot(scriptDirectory: string): string {
  const candidateRoots = [
    path.resolve(scriptDirectory, ".."),
    path.resolve(scriptDirectory, "..", "..")
  ];
  const workspaceRoot = candidateRoots.find((candidateRoot) => hasWorkspaceMarkerFiles(candidateRoot));

  return workspaceRoot || path.resolve(scriptDirectory, "..");
}

function hasWorkspaceMarkerFiles(candidateRoot: string): boolean {
  return WORKSPACE_MARKER_FILES.every((fileName) => fs.existsSync(path.join(candidateRoot, fileName)));
}

function cleanTestArtifacts(options: CleanTestArtifactsOptions = {}): CleanTestArtifactsResult {
  const workspaceRoot = path.resolve(options.workspaceRoot || WORKSPACE_ROOT);
  const artifactRelativePaths = options.artifactRelativePaths || TEST_ARTIFACT_RELATIVE_PATHS;
  const output = options.output || process.stdout;
  const removedRelativePaths: string[] = [];
  const missingRelativePaths: string[] = [];

  for (const relativePath of artifactRelativePaths) {
    const artifactPath = resolveContainedArtifactPath(workspaceRoot, relativePath);

    if (!fs.existsSync(artifactPath)) {
      missingRelativePaths.push(relativePath);
      output.write(`Skipped missing test artifact: ${relativePath}\n`);
      continue;
    }

    fs.rmSync(artifactPath, { recursive: true, force: true });
    removedRelativePaths.push(relativePath);
    output.write(`Removed test artifact: ${relativePath}\n`);
  }

  return {
    removedRelativePaths,
    missingRelativePaths
  };
}

function resolveContainedArtifactPath(workspaceRoot: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to clean absolute test artifact path outside the workspace: ${relativePath}`);
  }

  const artifactPath = path.resolve(workspaceRoot, relativePath);
  const comparableWorkspaceRoot = normalizeForPathComparison(workspaceRoot);
  const comparableArtifactPath = normalizeForPathComparison(artifactPath);
  const workspacePrefix = comparableWorkspaceRoot.endsWith(path.sep)
    ? comparableWorkspaceRoot
    : `${comparableWorkspaceRoot}${path.sep}`;

  if (comparableArtifactPath === comparableWorkspaceRoot || !comparableArtifactPath.startsWith(workspacePrefix)) {
    throw new Error(`Refusing to clean test artifact path outside the workspace: ${relativePath}`);
  }

  return artifactPath;
}

function normalizeForPathComparison(filePath: string): string {
  const normalizedPath = path.resolve(filePath);
  return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
}

function runCli(): void {
  cleanTestArtifacts();
}

if (require.main === module) {
  runCli();
}

export {
  TEST_ARTIFACT_RELATIVE_PATHS,
  cleanTestArtifacts,
  resolveContainedArtifactPath,
  runCli
};
