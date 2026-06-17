const fs = require("fs");
const path = require("path");

const NEON_SCRIPT_FILE_NAME = "neondreams.js";
const WORKBENCH_PATCH_START_MARKER = "<!-- KAWAII SYNTHWAVE -->";
const WORKBENCH_PATCH_END_MARKER = "<!-- NEON DREAMS -->";
const WORKBENCH_PATCH_SCRIPT_TAG_PATTERN = /^.*<!-- KAWAII SYNTHWAVE --><script src="neondreams\.js(?:\?v=[^"]+)?"><\/script><!-- NEON DREAMS -->.*\r?\n?/mg;
const WORKBENCH_HTML_CLOSING_TAG_PATTERN = /<\/html>/i;

/**
 * Checks whether Neon Dreams is currently patched into the VS Code workbench.
 *
 * @param {string} html - Workbench HTML.
 * @returns {boolean} True when the workbench HTML references neondreams.js.
 */
function isWorkbenchPatchEnabled(html) {
  return String(html || "").includes(NEON_SCRIPT_FILE_NAME);
}

/**
 * Replaces any existing Neon Dreams script tag with a cache-busted script URL.
 *
 * @param {string} html - Workbench HTML.
 * @param {string | number} [versionToken] - Optional cache-busting token for tests.
 * @returns {string} Workbench HTML with a fresh Neon Dreams script tag.
 */
function applyWorkbenchPatchScriptTag(html, versionToken = Date.now()) {
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
 * @param {string} html - Workbench HTML.
 * @returns {string} Workbench HTML without the marked script tag.
 */
function removeWorkbenchPatchScriptTag(html) {
  return String(html || "").replace(WORKBENCH_PATCH_SCRIPT_TAG_PATTERN, "");
}

/**
 * Creates the marked Neon Dreams script tag with a cache-busting query string.
 *
 * @param {string | number} versionToken - Cache-busting token.
 * @returns {string} Workbench script tag.
 */
function createWorkbenchPatchScriptTag(versionToken) {
  return `\t${WORKBENCH_PATCH_START_MARKER}<script src="${NEON_SCRIPT_FILE_NAME}?v=${versionToken}"></script>${WORKBENCH_PATCH_END_MARKER}`;
}

/**
 * Resolves all files needed by the workbench patch.
 *
 * @param {string} base - VS Code app/out/vs/code directory.
 * @param {(candidatePath: string) => boolean} [existsSync] - File existence function.
 * @returns {{htmlFile: string, templateFile: string} | null} Patch file paths.
 */
function resolveWorkbenchPatchPaths(base, existsSync = fs.existsSync) {
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
 * @param {string} base - VS Code app/out/vs/code directory.
 * @param {(candidatePath: string) => boolean} [existsSync] - File existence function.
 * @returns {[string, string] | null} Electron base directory and workbench HTML filename.
 */
function resolveWorkbenchPaths(base, existsSync = fs.existsSync) {
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

module.exports = {
  NEON_SCRIPT_FILE_NAME,
  applyWorkbenchPatchScriptTag,
  isWorkbenchPatchEnabled,
  removeWorkbenchPatchScriptTag,
  resolveWorkbenchPatchPaths,
  resolveWorkbenchPaths
};
