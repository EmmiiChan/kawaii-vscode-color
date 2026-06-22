import fs = require("fs");
import path = require("path");

export const KAWAII_UI_SCRIPT_FILE_NAME = "kawaii-vscode-colors-ui.js";

const WORKBENCH_PATCH_START_MARKER = "<!-- KAWAII VSCODE COLORS UI -->";
const WORKBENCH_PATCH_END_MARKER = "<!-- /KAWAII VSCODE COLORS UI -->";
const WORKBENCH_PATCH_SCRIPT_TAG_PATTERNS = [
  /^.*<!-- KAWAII VSCODE COLORS UI --><script src="kawaii-vscode-colors-ui\.js(?:\?v=[^"]+)?"><\/script><!-- \/KAWAII VSCODE COLORS UI -->.*\r?\n?/mg,
  /^.*<!-- KAWAII SYNTHWAVE --><script src="neondreams\.js(?:\?v=[^"]+)?"><\/script><!-- NEON DREAMS -->.*\r?\n?/mg
] as const;
const WORKBENCH_HTML_CLOSING_TAG_PATTERN = /<\/html>/i;

export interface WorkbenchPatchPaths {
  readonly htmlFile: string;
  readonly templateFile: string;
}

type ExistsSync = (candidatePath: string) => boolean;

/**
 * Checks whether the extension UI script is currently patched into the VS Code workbench.
 *
 * @param html Workbench HTML.
 * @returns True when the workbench HTML references the current or legacy extension UI script.
 */
export function isWorkbenchPatchEnabled(html: string): boolean {
  return containsMarkedPatchScriptTag(html);
}

/**
 * Replaces any existing extension UI script tag with a cache-busted script URL.
 *
 * @param html Workbench HTML.
 * @param versionToken Optional cache-busting token for tests.
 * @returns Workbench HTML with a fresh extension UI script tag.
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
 * Removes extension-owned UI script tags from workbench HTML.
 *
 * @param html Workbench HTML.
 * @returns Workbench HTML without the marked script tag.
 */
export function removeWorkbenchPatchScriptTag(html: string): string {
  return WORKBENCH_PATCH_SCRIPT_TAG_PATTERNS.reduce(
    (output, pattern) => output.replace(pattern, ""),
    String(html || "")
  );
}

/**
 * Creates the marked extension UI script tag with a cache-busting query string.
 *
 * @param versionToken Cache-busting token.
 * @returns Workbench script tag.
 */
function createWorkbenchPatchScriptTag(versionToken: string | number): string {
  return `\t${WORKBENCH_PATCH_START_MARKER}<script src="${KAWAII_UI_SCRIPT_FILE_NAME}?v=${versionToken}"></script>${WORKBENCH_PATCH_END_MARKER}`;
}

function containsMarkedPatchScriptTag(html: string): boolean {
  const workbenchHtml = String(html || "");

  return WORKBENCH_PATCH_SCRIPT_TAG_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(workbenchHtml);
  });
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
    templateFile: path.join(workbenchDirectory, KAWAII_UI_SCRIPT_FILE_NAME)
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
