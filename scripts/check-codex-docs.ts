import fs = require("node:fs");
import path = require("node:path");

interface PackageManifest {
  readonly name?: string;
  readonly publisher?: string;
  readonly main?: string;
  readonly engines?: {
    readonly vscode?: string;
  };
  readonly activationEvents?: readonly string[];
  readonly devDependencies?: Record<string, string>;
  readonly contributes?: {
    readonly themes?: readonly ThemeContribution[];
  };
}

interface PackageLock {
  readonly lockfileVersion?: number;
}

interface ThemeContribution {
  readonly label: string;
  readonly uiTheme: string;
  readonly path: string;
}

interface ThemeBuildPath {
  readonly baseThemePath?: string;
  readonly overridesThemePath?: string;
  readonly generatedThemePath?: string;
}

interface ThemeFact {
  readonly label: string;
  readonly uiTheme: string;
  readonly manifestPath: string;
  readonly baseThemePath: string | undefined;
  readonly overridesThemePath: string | undefined;
  readonly generatedThemePath: string;
  readonly generatedName: string | undefined;
  readonly type: string | undefined;
  readonly hasSemanticTokenColors: boolean;
}

interface PackageFacts {
  readonly name: string | undefined;
  readonly publisher: string | undefined;
  readonly main: string | undefined;
  readonly vscodeEngine: string | undefined;
  readonly activationEvents: readonly string[];
  readonly devDependencies: Record<string, string>;
  readonly lockfileVersion: number | undefined;
}

interface ThemeJson {
  readonly name?: string;
  readonly type?: string;
}

interface SchemaFacts {
  readonly current: string;
  readonly legacy: string;
  readonly version: number;
}

interface SemanticTokenColorFacts {
  readonly dark: boolean;
  readonly light: boolean;
}

interface ProjectFacts {
  readonly package: PackageFacts;
  readonly themes: readonly ThemeFact[];
  readonly criticalFiles: readonly string[];
  readonly webviewMessageTypes: readonly string[];
  readonly hostMessageTypes: readonly string[];
  readonly stateKeys: readonly string[];
  readonly schemas: SchemaFacts;
  readonly rendererPlaceholders: readonly string[];
  readonly semanticTokenColors: SemanticTokenColorFacts;
}

interface CodexDocuments {
  readonly readme: string;
  readonly agents: string;
  readonly docs: string;
  readonly structure: string;
  readonly colorReference: string;
  readonly systemMap: string;
  readonly changeImpact: string;
}

interface ValidationResult {
  readonly errors: string[];
}

const DOC_PATHS = {
  readme: ".codex/README.md",
  agents: ".codex/AGENTS.md",
  docs: ".codex/docs.md",
  structure: ".codex/structure.md",
  colorReference: ".codex/color_scheme_reference.md",
  systemMap: ".codex/system-map.md",
  changeImpact: ".codex/change-impact.md"
};

const THEME_BUILD_PATHS: Record<string, ThemeBuildPath> = {
  "Dark Pink Kawaii": {
    baseThemePath: "src/core-themes/kawaii_synthwave-color-theme.json",
    overridesThemePath: "themes/dark-pink-kawaii.json",
    generatedThemePath: "src/generated-themes/kawaii_synthwave-generated-color-theme.json"
  },
  "Light Pink-Pastel Kawaii": {
    baseThemePath: "src/core-themes/kawaii_synthwave-color-theme-light.json",
    overridesThemePath: "themes/light-pink-pastel-kawaii.json",
    generatedThemePath: "src/generated-themes/kawaii_synthwave-generated-color-theme-light.json"
  }
};

const CRITICAL_FILES = [
  ".codex/AGENTS.md",
  ".codex/README.md",
  ".codex/change-impact.md",
  ".codex/color_scheme_reference.md",
  ".codex/docs.md",
  ".codex/structure.md",
  ".codex/system-map.md",
  "package.json",
  "package-lock.json",
  "scripts/build-color-theme.js",
  "scripts/build-color-theme.ts",
  "scripts/build-ui-css.js",
  "scripts/build-ui-css.ts",
  "scripts/check-codex-docs.js",
  "scripts/check-codex-docs.ts",
  "scripts/clean-test-artifacts.js",
  "scripts/clean-test-artifacts.ts",
  "scripts/e2e-last-run.js",
  "scripts/e2e-last-run.ts",
  "scripts/increment-package-version.js",
  "scripts/increment-package-version.ts",
  "scripts/package-local-vsix.js",
  "scripts/package-local-vsix.ts",
  "scripts/require-e2e-neon-flag.js",
  "scripts/require-e2e-neon-flag.ts",
  "scripts/run-e2e.js",
  "scripts/run-e2e.ts",
  "scripts/test-process-cleanup-diagnostics.js",
  "scripts/test-process-cleanup-diagnostics.ts",
  "scripts/run-test-all.js",
  "scripts/run-test-all.ts",
  "scripts/update-theme-color-packs.js",
  "scripts/update-theme-color-packs.ts",
  "src/css/editor_chrome.css",
  "src/css/kawaii-vscode-colors-ui.min.css",
  "src/core-themes",
  "src/emptyEditorLogoStyles.ts",
  "src/extension.ts",
  "src/extensionHost",
  "src/extensionRoot.ts",
  "src/generated-themes",
  "src/js/theme_template.js",
  "src/randomNekoImage.ts",
  "src/renderer",
  "src/scss/kawaii-vscode-colors-ui.scss",
  "src/scss/generated/_editor-chrome.generated.scss",
  "src/settings.ts",
  "src/settingsBundle.ts",
  "src/settingsColorService.ts",
  "src/settingsEffectsPersistence.ts",
  "src/settingsPersistence.ts",
  "src/settingsStore.ts",
  "src/settingsWebview.ts",
  "src/webview",
  "src/workbenchPatch.ts",
  "test/dom",
  "test/e2e",
  "test/integration",
  "test/unit",
  "themes/dark-pink-kawaii.json",
  "themes/light-pink-pastel-kawaii.json",
  "tsconfig.tests.emit.json"
];

function validateCodexDocs(workspaceRoot = process.cwd()): ValidationResult {
  const facts = collectProjectFacts(workspaceRoot);
  const documents = readCodexDocuments(workspaceRoot);

  return validateCodexDocFacts(facts, documents);
}

function collectProjectFacts(workspaceRoot = process.cwd()): ProjectFacts {
  const packageManifest = readJsonFile<PackageManifest>(path.join(workspaceRoot, "package.json"));
  const packageLock = readJsonFile<PackageLock>(path.join(workspaceRoot, "package-lock.json"));
  const settingsSource = readTextFile(path.join(workspaceRoot, "src", "settings.ts"));
  const extensionSource = readTextFile(path.join(workspaceRoot, "src", "extension.ts"));
  const settingsBundleSource = readTextFile(path.join(workspaceRoot, "src", "settingsBundle.ts"));
  const themeTemplateSource = readTextFile(path.join(workspaceRoot, "src", "js", "theme_template.js"));
  const editorChromeSource = readTextFile(path.join(workspaceRoot, "src", "css", "editor_chrome.css"));
  const uiCssSource = readTextFile(path.join(workspaceRoot, "src", "css", "kawaii-vscode-colors-ui.min.css"));

  return {
    package: collectPackageFacts(packageManifest, packageLock),
    themes: collectThemeFacts(workspaceRoot, packageManifest),
    criticalFiles: CRITICAL_FILES.filter((filePath) => fs.existsSync(path.join(workspaceRoot, filePath))),
    webviewMessageTypes: collectWebviewMessageTypes(settingsSource),
    hostMessageTypes: collectHostMessageTypes(settingsSource),
    stateKeys: collectKawaiiKeys([settingsSource, extensionSource, settingsBundleSource]),
    schemas: collectSchemaFacts(settingsBundleSource),
    rendererPlaceholders: collectRendererPlaceholders([themeTemplateSource, editorChromeSource, uiCssSource]),
    semanticTokenColors: collectSemanticTokenColorFacts(workspaceRoot)
  };
}

function validateCodexDocFacts(facts: ProjectFacts, documents: CodexDocuments): ValidationResult {
  const errors: string[] = [];
  const allDocs = Object.values(documents).join("\n");
  const docsAndAgents = `${documents.docs || ""}\n${documents.agents || ""}`;
  const structureAndSystemMap = `${documents.structure || ""}\n${documents.systemMap || ""}`;

  requireText(documents.readme, ".codex/system-map.md", ".codex/README.md", "system-map entry", errors);
  requireText(documents.readme, ".codex/change-impact.md", ".codex/README.md", "change-impact entry", errors);

  requireText(docsAndAgents, facts.package.name, ".codex docs", "package name", errors);
  requireText(docsAndAgents, facts.package.publisher, ".codex docs", "package publisher", errors);
  requireText(documents.docs, facts.package.main, ".codex/docs.md", "package main", errors);
  requireText(docsAndAgents, facts.package.vscodeEngine, ".codex docs", "VS Code engine", errors);
  requireText(docsAndAgents, `lockfileVersion: ${facts.package.lockfileVersion}`, ".codex docs", "lockfile version", errors);

  facts.package.activationEvents.forEach((activationEvent) => {
    requireText(allDocs, activationEvent, ".codex docs", "activation event", errors);
  });

  Object.entries(facts.package.devDependencies).forEach(([packageName, version]) => {
    if (!contains(docsAndAgents, `${packageName}@${version}`) && !(contains(docsAndAgents, packageName) && contains(docsAndAgents, version))) {
      errors.push(`Missing dev dependency in .codex docs: ${packageName}@${version}`);
    }
  });

  facts.themes.forEach((theme) => {
    [
      theme.label,
      theme.uiTheme,
      theme.manifestPath,
      theme.baseThemePath,
      theme.overridesThemePath,
      theme.generatedThemePath,
      theme.generatedName,
      theme.type
    ].forEach((themeFact) => {
      requireText(allDocs, themeFact, ".codex docs", "theme fact", errors);
    });
  });

  facts.criticalFiles.forEach((filePath) => {
    requireText(structureAndSystemMap, filePath, ".codex/structure.md or .codex/system-map.md", "critical file", errors);
  });

  facts.webviewMessageTypes.forEach((messageType) => {
    requireText(documents.systemMap, messageType, ".codex/system-map.md", "webview message", errors);
  });

  facts.hostMessageTypes.forEach((messageType) => {
    requireText(documents.systemMap, messageType, ".codex/system-map.md", "host message", errors);
  });

  facts.stateKeys.forEach((stateKey) => {
    requireText(documents.systemMap, stateKey, ".codex/system-map.md", "state or setting key", errors);
  });

  requireText(documents.systemMap, facts.schemas.current, ".codex/system-map.md", "settings schema", errors);
  requireText(documents.systemMap, facts.schemas.legacy, ".codex/system-map.md", "legacy settings schema", errors);
  requireText(documents.systemMap, `schemaVersion: ${facts.schemas.version}`, ".codex/system-map.md", "settings schema version", errors);

  facts.rendererPlaceholders.forEach((placeholder) => {
    requireText(documents.systemMap, placeholder, ".codex/system-map.md", "renderer placeholder", errors);
  });

  if (facts.semanticTokenColors.dark || facts.semanticTokenColors.light) {
    requireText(documents.colorReference, "semanticTokenColors", ".codex/color_scheme_reference.md", "semanticTokenColors", errors);
    requireText(documents.systemMap, "semanticTokenColors", ".codex/system-map.md", "semanticTokenColors", errors);
  }

  if (contains(documents.colorReference, "does not define `semanticTokenColors`")) {
    errors.push("Stale semanticTokenColors statement in .codex/color_scheme_reference.md");
  }

  [
    "package.json",
    "src/settings*.ts",
    "webview messages",
    ".codex/system-map.md",
    ".codex/docs.md",
    ".codex/AGENTS.md",
    ".codex/color_scheme_reference.md",
    "test:docs"
  ].forEach((changeImpactFact) => {
    requireText(documents.changeImpact, changeImpactFact, ".codex/change-impact.md", "change-impact rule", errors);
  });

  return { errors };
}

function collectPackageFacts(packageManifest: PackageManifest, packageLock: PackageLock): PackageFacts {
  return {
    name: packageManifest.name,
    publisher: packageManifest.publisher,
    main: packageManifest.main,
    vscodeEngine: packageManifest.engines && packageManifest.engines.vscode,
    activationEvents: packageManifest.activationEvents || [],
    devDependencies: packageManifest.devDependencies || {},
    lockfileVersion: packageLock.lockfileVersion
  };
}

function collectThemeFacts(workspaceRoot: string, packageManifest: PackageManifest): ThemeFact[] {
  return ((packageManifest.contributes && packageManifest.contributes.themes) || []).map((themeContribution) => {
    const buildPaths = THEME_BUILD_PATHS[themeContribution.label] || {};
    const generatedThemePath = buildPaths.generatedThemePath || normalizeManifestPath(themeContribution.path);
    const generatedTheme = readJsonFile<ThemeJson>(path.join(workspaceRoot, generatedThemePath));

    return {
      label: themeContribution.label,
      uiTheme: themeContribution.uiTheme,
      manifestPath: themeContribution.path,
      baseThemePath: buildPaths.baseThemePath,
      overridesThemePath: buildPaths.overridesThemePath,
      generatedThemePath,
      generatedName: generatedTheme.name,
      type: generatedTheme.type,
      hasSemanticTokenColors: Object.prototype.hasOwnProperty.call(generatedTheme, "semanticTokenColors")
    };
  });
}

function collectWebviewMessageTypes(settingsSource: string): string[] {
  return collectMatches(settingsSource, /case\s+"([^"]+)":/g);
}

function collectHostMessageTypes(settingsSource: string): string[] {
  return collectMatches(settingsSource, /panel\.webview\.postMessage\(\{\s*type:\s*"([^"]+)"/g);
}

function collectKawaiiKeys(sources: readonly string[]): string[] {
  return uniqueSorted(sources.flatMap((source) => collectMatches(source, /kawaii_synthwave\.[A-Za-z0-9]+/g, 0)));
}

function collectSchemaFacts(settingsBundleSource: string): SchemaFacts {
  return {
    current: getConstString(settingsBundleSource, "SETTINGS_EXPORT_SCHEMA"),
    legacy: getConstString(settingsBundleSource, "LEGACY_SETTINGS_EXPORT_SCHEMA"),
    version: Number(getConstNumber(settingsBundleSource, "SETTINGS_EXPORT_SCHEMA_VERSION"))
  };
}

function collectRendererPlaceholders(sources: readonly string[]): string[] {
  return uniqueSorted(
    sources.flatMap((source) => collectMatches(source, /\[([A-Z][A-Z0-9_]+)\]/g))
  );
}

function collectSemanticTokenColorFacts(workspaceRoot: string): SemanticTokenColorFacts {
  return {
    dark: hasSemanticTokenColors(path.join(workspaceRoot, "src", "generated-themes", "kawaii_synthwave-generated-color-theme.json")),
    light: hasSemanticTokenColors(path.join(workspaceRoot, "src", "generated-themes", "kawaii_synthwave-generated-color-theme-light.json"))
  };
}

function readCodexDocuments(workspaceRoot: string): CodexDocuments {
  return Object.fromEntries(
    Object.entries(DOC_PATHS).map(([key, relativePath]) => [
      key,
      readTextFile(path.join(workspaceRoot, relativePath), "")
    ])
  ) as unknown as CodexDocuments;
}

function hasSemanticTokenColors(filePath: string): boolean {
  return Object.prototype.hasOwnProperty.call(readJsonFile(filePath), "semanticTokenColors");
}

function getConstString(source: string, constName: string): string {
  const match = new RegExp(`const\\s+${constName}\\s+=\\s+"([^"]+)"`).exec(source);
  return match?.[1] ?? "";
}

function getConstNumber(source: string, constName: string): string {
  const match = new RegExp(`const\\s+${constName}\\s+=\\s+(\\d+)`).exec(source);
  return match?.[1] ?? "";
}

function collectMatches(source: string, pattern: RegExp, groupIndex = 1): string[] {
  const values: string[] = [];

  for (const match of source.matchAll(pattern)) {
    const value = match[groupIndex];

    if (value) {
      values.push(value);
    }
  }

  return uniqueSorted(values);
}

function requireText(
  source: unknown,
  expectedText: unknown,
  sourceLabel: string,
  factLabel: string,
  errors: string[]
): void {
  if (!expectedText || contains(source, expectedText)) {
    return;
  }

  errors.push(`Missing ${factLabel} in ${sourceLabel}: ${expectedText}`);
}

function contains(source: unknown, expectedText: unknown): boolean {
  return String(source || "").includes(String(expectedText));
}

function normalizeManifestPath(manifestPath: unknown): string {
  return String(manifestPath || "").replace(/^\.\//, "");
}

function readJsonFile<T = Record<string, unknown>>(filePath: string): T {
  return JSON.parse(readTextFile(filePath)) as T;
}

function readTextFile(filePath: string): string;
function readTextFile(filePath: string, fallback: string): string;
function readTextFile(filePath: string, fallback?: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function main(): void {
  const result = validateCodexDocs(process.cwd());

  if (result.errors.length > 0) {
    console.error("Codex documentation drift detected:");
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log("Codex documentation is aligned with project facts.");
}

if (require.main === module) {
  main();
}

export {
  collectProjectFacts,
  main,
  validateCodexDocFacts,
  validateCodexDocs
};
