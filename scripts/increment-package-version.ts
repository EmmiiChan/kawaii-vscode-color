import fs = require("node:fs");
import path = require("node:path");

interface PackageManifest {
  version?: unknown;
  [key: string]: unknown;
}

interface PackageLockRootPackage {
  version?: unknown;
  [key: string]: unknown;
}

interface PackageLock {
  version?: unknown;
  packages?: Record<string, unknown>;
  [key: string]: unknown;
}

interface VersionIncrementResult {
  readonly previousVersion: string;
  readonly nextVersion: string;
}

const FILE_ENCODING = "utf8";
const WORKSPACE_ROOT = resolveWorkspaceRoot(__dirname);

function resolveWorkspaceRoot(scriptDirectory: string): string {
  const candidateRoots = [
    path.resolve(scriptDirectory, ".."),
    path.resolve(scriptDirectory, "..", "..")
  ];
  const workspaceRoot = candidateRoots.find((candidateRoot) => (
    fs.existsSync(path.join(candidateRoot, "package.json"))
    && fs.existsSync(path.join(candidateRoot, "package-lock.json"))
  ));

  return workspaceRoot || path.resolve(scriptDirectory, "..");
}

/**
 * Gets the next patch version for a numeric major.minor.patch package version.
 *
 * @param version Current package version.
 * @returns Incremented patch version.
 */
function getNextPatchVersion(version: string): string {
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!versionMatch) {
    throw new Error("Expected package version to use numeric major.minor.patch format.");
  }

  const majorVersion = versionMatch[1];
  const minorVersion = versionMatch[2];
  const patchVersion = versionMatch[3];

  if (!majorVersion || !minorVersion || !patchVersion) {
    throw new Error("Expected package version to use numeric major.minor.patch format.");
  }

  return `${majorVersion}.${minorVersion}.${Number(patchVersion) + 1}`;
}

/**
 * Reads and parses a JSON file.
 *
 * @param filePath JSON file path.
 * @returns Parsed JSON object.
 */
function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, FILE_ENCODING)) as T;
}

/**
 * Writes a JSON file using the repository's existing formatting style.
 *
 * @param filePath JSON file path.
 * @param data JSON data.
 * @returns {void}
 */
function writeJsonFile(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, FILE_ENCODING);
}

/**
 * Updates the package-lock root package version fields when present.
 *
 * @param packageLock Parsed package-lock data.
 * @param nextVersion Version to write.
 * @returns {void}
 */
function updatePackageLockVersion(packageLock: PackageLock, nextVersion: string): void {
  if (typeof packageLock.version === "string") {
    packageLock.version = nextVersion;
  }

  if (!packageLock.packages || typeof packageLock.packages !== "object" || Array.isArray(packageLock.packages)) {
    return;
  }

  const rootPackage = packageLock.packages[""];

  if (!rootPackage || typeof rootPackage !== "object" || Array.isArray(rootPackage)) {
    return;
  }

  (rootPackage as PackageLockRootPackage).version = nextVersion;
}

/**
 * Increments package.json patch version and synchronizes package-lock.json.
 *
 * @param workspaceRoot Repository root.
 * @returns Version change summary.
 */
function incrementPackageVersion(workspaceRoot = WORKSPACE_ROOT): VersionIncrementResult {
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  const packageLockPath = path.join(workspaceRoot, "package-lock.json");
  const packageManifest = readJsonFile<PackageManifest>(packageJsonPath);

  if (typeof packageManifest.version !== "string") {
    throw new Error("Expected package.json to contain a string version.");
  }

  const previousVersion = packageManifest.version;
  const nextVersion = getNextPatchVersion(previousVersion);

  packageManifest.version = nextVersion;
  writeJsonFile(packageJsonPath, packageManifest);

  if (fs.existsSync(packageLockPath)) {
    const packageLock = readJsonFile<PackageLock>(packageLockPath);

    updatePackageLockVersion(packageLock, nextVersion);
    writeJsonFile(packageLockPath, packageLock);
  }

  return {
    previousVersion,
    nextVersion
  };
}

/**
 * Runs the package version increment from the command line.
 *
 * @returns {void}
 */
function main(): void {
  const result = incrementPackageVersion();

  console.log(`Package version bumped: ${result.previousVersion} -> ${result.nextVersion}`);
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function logCliError(error: unknown): void {
  const normalizedError = normalizeError(error);

  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    methodName: "increment-package-version",
    context: {
      expectedBehavior: "Increment package.json patch version and synchronize package-lock.json before VSIX packaging.",
      actualBehavior: normalizedError.message
    },
    stack: normalizedError.stack
  }, null, 2));
}

function runCli(): void {
  try {
    main();
  } catch (error) {
    logCliError(error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

export {
  getNextPatchVersion,
  incrementPackageVersion,
  runCli,
  updatePackageLockVersion
};
