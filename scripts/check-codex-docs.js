const fs = require("fs");
const path = require("path");

const DOC_PATHS = {
  readme: ".codex/README.md",
  agents: ".codex/AGENTS.md",
  docs: ".codex/docs.md",
  structure: ".codex/structure.md",
  colorReference: ".codex/color_scheme_reference.md",
  systemMap: ".codex/system-map.md",
  changeImpact: ".codex/change-impact.md"
};

const THEME_BUILD_PATHS = {
  "Kawaii VS Code Color": {
    baseThemePath: "themes/kawaii_synthwave-color-theme.json",
    overridesThemePath: "themes/kawaii_synthwave-color-theme-overrides.json",
    generatedThemePath: "themes/kawaii_synthwave-generated-color-theme.json"
  },
  "Kawaii VS Code Color Light": {
    baseThemePath: "themes/kawaii_synthwave-color-theme-light.json",
    overridesThemePath: "themes/kawaii_synthwave-color-theme-light-overrides.json",
    generatedThemePath: "themes/kawaii_synthwave-generated-color-theme-light.json"
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
  "scripts/check-codex-docs.js",
  "scripts/e2e-last-run.js",
  "scripts/run-e2e.js",
  "scripts/run-test-all.js",
  "src/css/editor_chrome.css",
  "src/emptyEditorLogoStyles.js",
  "src/extension.js",
  "src/js/theme_template.js",
  "src/randomNekoImage.js",
  "src/settings.js",
  "src/settingsBundle.js",
  "src/settingsColorService.js",
  "src/settingsEffectsPersistence.js",
  "src/settingsPersistence.js",
  "src/settingsStore.js",
  "src/settingsWebview.js",
  "src/workbenchPatch.js",
  "test/dom",
  "test/e2e",
  "test/integration",
  "test/unit"
];

function validateCodexDocs(workspaceRoot = process.cwd()) {
  const facts = collectProjectFacts(workspaceRoot);
  const documents = readCodexDocuments(workspaceRoot);

  return validateCodexDocFacts(facts, documents);
}

function collectProjectFacts(workspaceRoot = process.cwd()) {
  const packageManifest = readJsonFile(path.join(workspaceRoot, "package.json"));
  const packageLock = readJsonFile(path.join(workspaceRoot, "package-lock.json"));
  const settingsSource = readTextFile(path.join(workspaceRoot, "src", "settings.js"));
  const extensionSource = readTextFile(path.join(workspaceRoot, "src", "extension.js"));
  const settingsBundleSource = readTextFile(path.join(workspaceRoot, "src", "settingsBundle.js"));
  const themeTemplateSource = readTextFile(path.join(workspaceRoot, "src", "js", "theme_template.js"));
  const editorChromeSource = readTextFile(path.join(workspaceRoot, "src", "css", "editor_chrome.css"));

  return {
    package: collectPackageFacts(packageManifest, packageLock),
    themes: collectThemeFacts(workspaceRoot, packageManifest),
    criticalFiles: CRITICAL_FILES.filter((filePath) => fs.existsSync(path.join(workspaceRoot, filePath))),
    webviewMessageTypes: collectWebviewMessageTypes(settingsSource),
    hostMessageTypes: collectHostMessageTypes(settingsSource),
    stateKeys: collectKawaiiKeys([settingsSource, extensionSource, settingsBundleSource]),
    schemas: collectSchemaFacts(settingsBundleSource),
    rendererPlaceholders: collectRendererPlaceholders([themeTemplateSource, editorChromeSource]),
    semanticTokenColors: collectSemanticTokenColorFacts(workspaceRoot)
  };
}

function validateCodexDocFacts(facts, documents) {
  const errors = [];
  const allDocs = Object.values(documents).join("\n");
  const docsAndAgents = `${documents.docs || ""}\n${documents.agents || ""}`;
  const structureAndSystemMap = `${documents.structure || ""}\n${documents.systemMap || ""}`;

  requireText(documents.readme, ".codex/system-map.md", ".codex/README.md", "system-map entry", errors);
  requireText(documents.readme, ".codex/change-impact.md", ".codex/README.md", "change-impact entry", errors);

  requireText(docsAndAgents, facts.package.name, ".codex docs", "package name", errors);
  requireText(docsAndAgents, facts.package.version, ".codex docs", "package version", errors);
  requireText(docsAndAgents, facts.package.publisher, ".codex docs", "package publisher", errors);
  requireText(documents.docs, facts.package.main, ".codex/docs.md", "package main", errors);
  requireText(docsAndAgents, facts.package.vscodeEngine, ".codex docs", "VS Code engine", errors);
  requireText(docsAndAgents, `lockfileVersion: ${facts.package.lockfileVersion}`, ".codex docs", "lockfile version", errors);
  requireText(docsAndAgents, facts.package.lockRootVersion, ".codex docs", "lock root version", errors);

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
    "src/settings*.js",
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

function collectPackageFacts(packageManifest, packageLock) {
  return {
    name: packageManifest.name,
    version: packageManifest.version,
    publisher: packageManifest.publisher,
    main: packageManifest.main,
    vscodeEngine: packageManifest.engines && packageManifest.engines.vscode,
    activationEvents: packageManifest.activationEvents || [],
    devDependencies: packageManifest.devDependencies || {},
    lockfileVersion: packageLock.lockfileVersion,
    lockRootVersion: packageLock.packages && packageLock.packages[""] && packageLock.packages[""].version
  };
}

function collectThemeFacts(workspaceRoot, packageManifest) {
  return ((packageManifest.contributes && packageManifest.contributes.themes) || []).map((themeContribution) => {
    const buildPaths = THEME_BUILD_PATHS[themeContribution.label] || {};
    const generatedThemePath = buildPaths.generatedThemePath || normalizeManifestPath(themeContribution.path);
    const generatedTheme = readJsonFile(path.join(workspaceRoot, generatedThemePath));

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

function collectWebviewMessageTypes(settingsSource) {
  return collectMatches(settingsSource, /case\s+"([^"]+)":/g);
}

function collectHostMessageTypes(settingsSource) {
  return collectMatches(settingsSource, /panel\.webview\.postMessage\(\{\s*type:\s*"([^"]+)"/g);
}

function collectKawaiiKeys(sources) {
  return uniqueSorted(sources.flatMap((source) => collectMatches(source, /kawaii_synthwave\.[A-Za-z0-9]+/g, 0)));
}

function collectSchemaFacts(settingsBundleSource) {
  return {
    current: getConstString(settingsBundleSource, "SETTINGS_EXPORT_SCHEMA"),
    legacy: getConstString(settingsBundleSource, "LEGACY_SETTINGS_EXPORT_SCHEMA"),
    version: Number(getConstNumber(settingsBundleSource, "SETTINGS_EXPORT_SCHEMA_VERSION"))
  };
}

function collectRendererPlaceholders(sources) {
  return uniqueSorted(
    sources.flatMap((source) => collectMatches(source, /\[([A-Z][A-Z0-9_]+)\]/g))
  );
}

function collectSemanticTokenColorFacts(workspaceRoot) {
  return {
    dark: hasSemanticTokenColors(path.join(workspaceRoot, "themes", "kawaii_synthwave-generated-color-theme.json")),
    light: hasSemanticTokenColors(path.join(workspaceRoot, "themes", "kawaii_synthwave-generated-color-theme-light.json"))
  };
}

function readCodexDocuments(workspaceRoot) {
  return Object.fromEntries(
    Object.entries(DOC_PATHS).map(([key, relativePath]) => [
      key,
      readTextFile(path.join(workspaceRoot, relativePath), "")
    ])
  );
}

function hasSemanticTokenColors(filePath) {
  return Object.prototype.hasOwnProperty.call(readJsonFile(filePath), "semanticTokenColors");
}

function getConstString(source, constName) {
  const match = new RegExp(`const\\s+${constName}\\s+=\\s+"([^"]+)"`).exec(source);
  return match ? match[1] : "";
}

function getConstNumber(source, constName) {
  const match = new RegExp(`const\\s+${constName}\\s+=\\s+(\\d+)`).exec(source);
  return match ? match[1] : "";
}

function collectMatches(source, pattern, groupIndex = 1) {
  return uniqueSorted(Array.from(source.matchAll(pattern), (match) => match[groupIndex]));
}

function requireText(source, expectedText, sourceLabel, factLabel, errors) {
  if (!expectedText || contains(source, expectedText)) {
    return;
  }

  errors.push(`Missing ${factLabel} in ${sourceLabel}: ${expectedText}`);
}

function contains(source, expectedText) {
  return String(source || "").includes(String(expectedText));
}

function normalizeManifestPath(manifestPath) {
  return String(manifestPath || "").replace(/^\.\//, "");
}

function readJsonFile(filePath) {
  return JSON.parse(readTextFile(filePath));
}

function readTextFile(filePath, fallback) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (arguments.length > 1) {
      return fallback;
    }

    throw error;
  }
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function main() {
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

module.exports = {
  collectProjectFacts,
  validateCodexDocFacts,
  validateCodexDocs
};
