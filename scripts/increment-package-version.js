const fs = require("fs");
const path = require("path");

const FILE_ENCODING = "utf8";
const WORKSPACE_ROOT = path.resolve(__dirname, "..");

/**
 * Gets the next patch version for a numeric major.minor.patch package version.
 *
 * @param {string} version - Current package version.
 * @returns {string} Incremented patch version.
 */
function getNextPatchVersion(version) {
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!versionMatch) {
    throw new Error("Expected package version to use numeric major.minor.patch format.");
  }

  const [, majorVersion, minorVersion, patchVersion] = versionMatch;

  return `${majorVersion}.${minorVersion}.${Number(patchVersion) + 1}`;
}

/**
 * Reads and parses a JSON file.
 *
 * @param {string} filePath - JSON file path.
 * @returns {Record<string, unknown>} Parsed JSON object.
 */
function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, FILE_ENCODING));
}

/**
 * Writes a JSON file using the repository's existing formatting style.
 *
 * @param {string} filePath - JSON file path.
 * @param {Record<string, unknown>} data - JSON data.
 * @returns {void}
 */
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, FILE_ENCODING);
}

/**
 * Updates the package-lock root package version fields when present.
 *
 * @param {Record<string, unknown>} packageLock - Parsed package-lock data.
 * @param {string} nextVersion - Version to write.
 * @returns {void}
 */
function updatePackageLockVersion(packageLock, nextVersion) {
  if (typeof packageLock.version === "string") {
    packageLock.version = nextVersion;
  }

  if (
    packageLock.packages &&
    typeof packageLock.packages === "object" &&
    !Array.isArray(packageLock.packages) &&
    packageLock.packages[""] &&
    typeof packageLock.packages[""] === "object" &&
    !Array.isArray(packageLock.packages[""])
  ) {
    packageLock.packages[""].version = nextVersion;
  }
}

/**
 * Increments package.json patch version and synchronizes package-lock.json.
 *
 * @param {string} workspaceRoot - Repository root.
 * @returns {{previousVersion: string, nextVersion: string}} Version change summary.
 */
function incrementPackageVersion(workspaceRoot = WORKSPACE_ROOT) {
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  const packageLockPath = path.join(workspaceRoot, "package-lock.json");
  const packageManifest = readJsonFile(packageJsonPath);

  if (typeof packageManifest.version !== "string") {
    throw new Error("Expected package.json to contain a string version.");
  }

  const previousVersion = packageManifest.version;
  const nextVersion = getNextPatchVersion(previousVersion);

  packageManifest.version = nextVersion;
  writeJsonFile(packageJsonPath, packageManifest);

  if (fs.existsSync(packageLockPath)) {
    const packageLock = readJsonFile(packageLockPath);

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
function main() {
  const result = incrementPackageVersion();

  console.log(`Package version bumped: ${result.previousVersion} -> ${result.nextVersion}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      methodName: "increment-package-version",
      context: {
        expectedBehavior: "Increment package.json patch version and synchronize package-lock.json before VSIX packaging.",
        actualBehavior: normalizedError.message
      },
      stack: normalizedError.stack
    }, null, 2));

    process.exitCode = 1;
  }
}

module.exports = {
  getNextPatchVersion,
  incrementPackageVersion,
  updatePackageLockVersion
};
