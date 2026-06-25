import fs = require("node:fs");
import path = require("node:path");

const FILE_ENCODING = "utf8";
const WORKSPACE_ROOT = resolveWorkspaceRoot(__dirname);
const EMPTY_EDITOR_LOGO_STYLES_PLACEHOLDER = "[EMPTY_EDITOR_LOGO_STYLES]";
const EDITOR_BACKGROUND_EFFECT_ROOT_CLASS = "kawaii-effect-editor-background";
const GLOW_EFFECT_ROOT_CLASS = "kawaii-effect-glow";

interface BuildKawaiiUiCssOptions {
  readonly workspaceRoot?: string;
  readonly sourceCssPath?: string;
  readonly generatedScssPath?: string;
  readonly entrypointScssPath?: string;
  readonly outputCssPath?: string;
}

function resolveWorkspaceRoot(scriptDirectory: string): string {
  const candidateRoots = [
    path.resolve(scriptDirectory, ".."),
    path.resolve(scriptDirectory, "..", "..")
  ];
  const workspaceRoot = candidateRoots.find((candidateRoot) => (
    fs.existsSync(path.join(candidateRoot, "package.json"))
    && fs.existsSync(path.join(candidateRoot, "src"))
  ));

  return workspaceRoot || path.resolve(scriptDirectory, "..");
}

function transformSelectorForWrapper(selector: string): string {
  const leadingWhitespace = selector.match(/^\s*/)?.[0] || "";
  const selectorBody = selector.slice(leadingWhitespace.length);
  const selectorParts = splitLeadingSelectorComments(selectorBody);

  if (selectorParts.selector.startsWith("[class~=")) {
    return `${leadingWhitespace}&${selectorBody},\n${leadingWhitespace}${selectorBody}`;
  }

  const effectRootClass = getSelectorEffectRootClass(selectorParts.selector);

  if (effectRootClass) {
    return `${leadingWhitespace}${selectorParts.prefix}&.${effectRootClass} ${selectorParts.selector}`;
  }

  return selector;
}

function splitLeadingSelectorComments(selector: string): { readonly prefix: string; readonly selector: string } {
  const match = selector.match(/^((?:\s*\/\*[\s\S]*?\*\/\s*)*)([\s\S]*)$/);

  return {
    prefix: match?.[1] || "",
    selector: match?.[2] || selector
  };
}

function getSelectorEffectRootClass(selector: string): string | undefined {
  if (selector.includes(".monaco-editor")) {
    return EDITOR_BACKGROUND_EFFECT_ROOT_CLASS;
  }

  if (
    selector.includes(".monaco-workbench")
    || selector.includes(".codicon-light")
    || selector.includes(".lightbulb-glyph")
    || selector.includes(".active-item-indicator")
  ) {
    return GLOW_EFFECT_ROOT_CLASS;
  }

  return undefined;
}

function stripStandaloneEmptyEditorLogoPlaceholder(css: string): string {
  return css.replace(/^\s*\[EMPTY_EDITOR_LOGO_STYLES\]\s*$/gm, "");
}

function generateScopedCssBridge(css: string): string {
  const normalizedCss = stripStandaloneEmptyEditorLogoPlaceholder(css);
  const scopedCss = normalizedCss.replace(/(^|})([^{}]+)\{/g, (match, prefix: string, selectorList: string) => {
    const transformedSelectorList = selectorList
      .split(",")
      .map((selector) => transformSelectorForWrapper(selector))
      .join(",");

    return `${prefix}${transformedSelectorList}{`;
  });

  const indentedScopedCss = scopedCss
    .trim()
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join("\n");

  return `@mixin styles {\n${indentedScopedCss}\n}`;
}

function getDefaultPaths(workspaceRoot: string): Required<Omit<BuildKawaiiUiCssOptions, "workspaceRoot">> {
  return {
    sourceCssPath: path.join(workspaceRoot, "src", "css", "editor_chrome.css"),
    generatedScssPath: path.join(workspaceRoot, "src", "scss", "generated", "_editor-chrome.generated.scss"),
    entrypointScssPath: path.join(workspaceRoot, "src", "scss", "kawaii-vscode-colors-ui.scss"),
    outputCssPath: path.join(workspaceRoot, "src", "css", "kawaii-vscode-colors-ui.min.css")
  };
}

function buildKawaiiUiCss(options: BuildKawaiiUiCssOptions = {}): void {
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;
  const defaultPaths = getDefaultPaths(workspaceRoot);
  const sourceCssPath = options.sourceCssPath || defaultPaths.sourceCssPath;
  const generatedScssPath = options.generatedScssPath || defaultPaths.generatedScssPath;
  const entrypointScssPath = options.entrypointScssPath || defaultPaths.entrypointScssPath;
  const outputCssPath = options.outputCssPath || defaultPaths.outputCssPath;
  const sass = require("sass") as typeof import("sass");

  const sourceCss = fs.readFileSync(sourceCssPath, FILE_ENCODING);
  const generatedScss = generateScopedCssBridge(sourceCss);
  fs.mkdirSync(path.dirname(generatedScssPath), { recursive: true });
  fs.writeFileSync(generatedScssPath, `${generatedScss.trim()}\n`, FILE_ENCODING);

  const compiledCss = sass.compile(entrypointScssPath, {
    loadPaths: [path.dirname(entrypointScssPath)],
    style: "compressed"
  }).css;

  const outputCss = compiledCss.includes(EMPTY_EDITOR_LOGO_STYLES_PLACEHOLDER)
    ? compiledCss
    : `${compiledCss}${EMPTY_EDITOR_LOGO_STYLES_PLACEHOLDER}`;

  fs.mkdirSync(path.dirname(outputCssPath), { recursive: true });
  fs.writeFileSync(outputCssPath, `${outputCss}\n`, FILE_ENCODING);
}

function main(): void {
  buildKawaiiUiCss();

  console.log([
    "Generated src/scss/generated/_editor-chrome.generated.scss",
    "Generated src/css/kawaii-vscode-colors-ui.min.css"
  ].join("\n"));
}

function runCli(): void {
  try {
    main();
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      methodName: "build-ui-css",
      context: {
        expectedBehavior: "Generate the scoped Sass bridge and compile the Kawaii workbench UI CSS.",
        actualBehavior: normalizedError.message
      },
      stack: normalizedError.stack
    }, null, 2));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

export {
  BuildKawaiiUiCssOptions,
  buildKawaiiUiCss,
  generateScopedCssBridge,
  main,
  runCli
};
