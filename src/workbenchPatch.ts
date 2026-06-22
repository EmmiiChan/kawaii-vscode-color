import fs = require("fs");
import path = require("path");

export const NEON_SCRIPT_FILE_NAME = "neondreams.js";

const WORKBENCH_PATCH_START_MARKER = "<!-- KAWAII SYNTHWAVE -->";
const WORKBENCH_PATCH_END_MARKER = "<!-- NEON DREAMS -->";
const WORKBENCH_PATCH_SCRIPT_TAG_PATTERN = /^.*<!-- KAWAII SYNTHWAVE --><script src="neondreams\.js(?:\?v=[^"]+)?"><\/script><!-- NEON DREAMS -->.*\r?\n?/mg;
const WORKBENCH_HTML_CLOSING_TAG_PATTERN = /<\/html>/i;

export interface WorkbenchPatchPaths {
  readonly htmlFile: string;
  readonly templateFile: string;
}

type ExistsSync = (candidatePath: string) => boolean;

/**
 * Checks whether Neon Dreams is currently patched into the VS Code workbench.
 *
 * @param html Workbench HTML.
 * @returns True when the workbench HTML references neondreams.js.
 */
export function isWorkbenchPatchEnabled(html: string): boolean {
  return String(html || "").includes(NEON_SCRIPT_FILE_NAME);
}

/**
 * Replaces any existing Neon Dreams script tag with a cache-busted script URL.
 *
 * @param html Workbench HTML.
 * @param versionToken Optional cache-busting token for tests.
 * @returns Workbench HTML with a fresh Neon Dreams script tag.
 */
export function applyWorkbenchPatchScriptTag(html: string, versionToken: string | number = Date.now()): string {
  const cleanHtml = removeWorkbenchPatchScriptTag(html);
  const scriptTag = createWorkbenchPatchScriptTag(versionToken);

  if (!WORKBENCH_HTML_CLOSING_TAG_PATTERN.test(cleanHtml)) {
    return `${cleanHtml}\n${scriptTag}\n`;
  }

  return cleanHtml.replace(WORKBENCH_HTML_CLOSING_TAG_PATTERN, `${scriptTag}\n$&`);
}

/**
 * Removes extension-owned Neon Dreams script tags from workbench HTML.
 *
 * @param html Workbench HTML.
 * @returns Workbench HTML without the marked script tag.
 */
export function removeWorkbenchPatchScriptTag(html: string): string {
  return String(html || "").replace(WORKBENCH_PATCH_SCRIPT_TAG_PATTERN, "");
}

/**
 * Creates the marked Neon Dreams script tag with a cache-busting query string.
 *
 * @param versionToken Cache-busting token.
 * @returns Workbench script tag.
 */
function createWorkbenchPatchScriptTag(versionToken: string | number): string {
  return `\t${WORKBENCH_PATCH_START_MARKER}<script src="${NEON_SCRIPT_FILE_NAME}?v=${versionToken}"></script>${WORKBENCH_PATCH_END_MARKER}`;
}

/**
 * Resolves all files needed by the workbench patch.
 *
 * @param base VS Code app/out/vs/code directory.
 * @param existsSync File existence function.
 * @returns Patch file paths or null when no supported workbench HTML exists.
 */
export function resolveWorkbenchPatchPaths(base: string, existsSync: ExistsSync = fs.existsSync): WorkbenchPatchPaths | null {
  const workbenchPaths = resolveWorkbenchPaths(base, existsSync);

  if (!workbenchPaths) {
    return null;
  }

  const [electronBase, workBenchFilename] = workbenchPaths;
  const workbenchDirectory = path.join(base, electronBase, "workbench");

  return {
    htmlFile: path.join(workbenchDirectory, workBenchFilename),
    templateFile: path.join(workbenchDirectory, NEON_SCRIPT_FILE_NAME)
  };
}

/**
 * Finds the workbench HTML file and electron base directory.
 *
 * @param base VS Code app/out/vs/code directory.
 * @param existsSync File existence function.
 * @returns Electron base directory and workbench HTML filename, or null.
 */
export function resolveWorkbenchPaths(base: string, existsSync: ExistsSync = fs.existsSync): readonly [string, string] | null {
  const electronBaseCandidates = [
    "electron-browser",
    "electron-sandbox"
  ];

  const htmlCandidates = [
    "workbench.esm.html",
    "workbench.html"
  ];

  for (const electronBase of electronBaseCandidates) {
    for (const htmlFile of htmlCandidates) {
      if (existsSync(path.join(base, electronBase, "workbench", htmlFile))) {
        return [electronBase, htmlFile];
      }
    }
  }

  return null;
}
