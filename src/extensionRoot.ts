import path = require("path");

/**
 * Resolves the package root from either source or compiled extension directories.
 *
 * @param currentDirName Directory of the currently executing module.
 * @returns Absolute package root path.
 */
export function resolveExtensionRoot(currentDirName: string): string {
  const normalizedDirName = path.resolve(currentDirName).replace(/\\/g, "/");
  const outMarker = "/out/";
  const outIndex = normalizedDirName.lastIndexOf(outMarker);

  if (outIndex >= 0) {
    return path.resolve(currentDirName.slice(0, outIndex));
  }

  return path.resolve(currentDirName, "..");
}

/**
 * Resolves a package-owned asset path from source or compiled extension code.
 *
 * @param currentDirName Directory of the currently executing module.
 * @param segments Package-root-relative path segments.
 * @returns Absolute path to a package-owned asset.
 */
export function resolveExtensionAssetPath(currentDirName: string, ...segments: readonly string[]): string {
  return path.join(resolveExtensionRoot(currentDirName), ...segments);
}
