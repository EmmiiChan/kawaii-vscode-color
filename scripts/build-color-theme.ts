import fs = require("node:fs");
import https = require("node:https");
import path = require("node:path");

type PlainRecord = Record<string, any>;

interface ThemeVariant {
  readonly label: string;
  readonly baseThemePath: string;
  readonly overridesThemePath: string;
  readonly generatedThemePath: string;
}

interface NativeThemeVariant {
  readonly colorPackId: string;
  readonly generatedThemePath: string;
  readonly label: string;
  readonly mode: ThemeMode;
}

interface ColorVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

type ThemeMode = "dark" | "light";

interface ThemeColorPack {
  readonly colors?: PlainRecord;
  readonly fileName: string;
  readonly id: string;
  readonly mode: ThemeMode;
  readonly name: string;
  readonly semanticTokenColors?: PlainRecord;
  readonly tokenColors?: unknown[];
  readonly type?: string;
  readonly version: ColorVersion;
}

interface RemoteThemeColorPack extends ThemeColorPack {
  readonly source: string;
  readonly sourceUrl: string;
}

interface TokenRuleLike {
  readonly name?: unknown;
  readonly scope?: unknown;
}

interface GitHubThemesUrlParts {
  readonly folderPath: string;
  readonly owner: string;
  readonly ref: string;
  readonly repository: string;
}

interface GitHubContentFileEntry {
  readonly downloadUrl: string;
  readonly name: string;
}

interface ThemeColorPackUpdate {
  readonly colorPack: ThemeColorPack;
  readonly currentVersion?: ColorVersion;
  readonly reason: "missing" | "newer";
  readonly remoteVersion: ColorVersion;
  readonly source: string;
  readonly sourceUrl: string;
  readonly targetPath: string;
}

interface ThemeColorPackUpdateSkip {
  readonly currentVersion: ColorVersion;
  readonly fileName: string;
  readonly id: string;
  readonly reason: "older-remote" | "same-version";
  readonly remoteVersion: ColorVersion;
}

interface ThemeColorPackUpdatePlan {
  readonly skipped: readonly ThemeColorPackUpdateSkip[];
  readonly updates: readonly ThemeColorPackUpdate[];
}

interface ThemeColorPackUpdateResult extends ThemeColorPackUpdatePlan {
  readonly remotePacks: readonly RemoteThemeColorPack[];
  readonly summaryLines: readonly string[];
}

interface UpdateThemeColorPacksOptions {
  readonly dryRun?: boolean;
  readonly fetchText?: TextFetcher;
  readonly githubThemesUrl?: string;
  readonly themesDirectory?: string;
}

type TextFetcher = (url: string) => Promise<string>;

const WORKSPACE_ROOT = resolveWorkspaceRoot(__dirname);
const FILE_ENCODING = "utf8";
const PUBLIC_THEMES_DIR = path.join(WORKSPACE_ROOT, "themes");
const DEFAULT_REMOTE_THEMES_URL = "https://github.com/EmmiiChan/kawaii-vscode-color/tree/main/themes";
const CORE_THEME_PATH_BY_MODE: Record<ThemeMode, string> = {
  dark: path.join(WORKSPACE_ROOT, "src", "core-themes", "kawaii_synthwave-color-theme.json"),
  light: path.join(WORKSPACE_ROOT, "src", "core-themes", "kawaii_synthwave-color-theme-light.json")
};
const GENERATED_THEMES_DIR = path.join(WORKSPACE_ROOT, "src", "generated-themes");
const INTERNAL_THEME_CATALOG_PATH = path.join(GENERATED_THEMES_DIR, "internal-themes.json");
const NATIVE_THEME_VARIANTS: readonly NativeThemeVariant[] = [
  {
    colorPackId: "dark-pink-kawaii",
    generatedThemePath: path.join(GENERATED_THEMES_DIR, "kawaii_synthwave-generated-color-theme.json"),
    label: "Dark Pink Kawaii",
    mode: "dark"
  },
  {
    colorPackId: "light-pink-pastel-kawaii",
    generatedThemePath: path.join(GENERATED_THEMES_DIR, "kawaii_synthwave-generated-color-theme-light.json"),
    label: "Light Pink-Pastel Kawaii",
    mode: "light"
  }
];
const THEME_VARIANTS: readonly ThemeVariant[] = [
  {
    label: "Dark Pink Kawaii",
    baseThemePath: CORE_THEME_PATH_BY_MODE.dark,
    overridesThemePath: path.join(PUBLIC_THEMES_DIR, "dark-pink-kawaii.json"),
    generatedThemePath: path.join(GENERATED_THEMES_DIR, "kawaii_synthwave-generated-color-theme.json")
  },
  {
    label: "Light Pink-Pastel Kawaii",
    baseThemePath: CORE_THEME_PATH_BY_MODE.light,
    overridesThemePath: path.join(PUBLIC_THEMES_DIR, "light-pink-pastel-kawaii.json"),
    generatedThemePath: path.join(GENERATED_THEMES_DIR, "kawaii_synthwave-generated-color-theme-light.json")
  }
];

function resolveWorkspaceRoot(scriptDirectory: string): string {
  const candidateRoots = [
    path.resolve(scriptDirectory, ".."),
    path.resolve(scriptDirectory, "..", "..")
  ];
  const workspaceRoot = candidateRoots.find((candidateRoot) => (
    fs.existsSync(path.join(candidateRoot, "package.json"))
    && fs.existsSync(path.join(candidateRoot, "themes"))
  ));

  return workspaceRoot || path.resolve(scriptDirectory, "..");
}

/**
 * Removes JSONC comments while preserving comment-like text inside strings.
 *
 * @param {string} source - Raw JSONC source.
 * @returns {string} Source without line or block comments.
 */
function removeJsonComments(source: string): string {
  let output = "";
  let isInsideString = false;
  let isEscaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const currentCharacter = source[index] ?? "";
    const nextCharacter = source[index + 1] ?? "";

    if (isInsideString) {
      output += currentCharacter;

      if (isEscaped) {
        isEscaped = false;
      } else if (currentCharacter === "\\") {
        isEscaped = true;
      } else if (currentCharacter === "\"") {
        isInsideString = false;
      }

      continue;
    }

    if (currentCharacter === "\"") {
      isInsideString = true;
      output += currentCharacter;
      continue;
    }

    if (currentCharacter === "/" && nextCharacter === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }

      output += "\n";
      continue;
    }

    if (currentCharacter === "/" && nextCharacter === "*") {
      index += 2;

      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        output += source[index] === "\n" ? "\n" : "";
        index += 1;
      }

      index += 1;
      continue;
    }

    output += currentCharacter;
  }

  return output;
}

/**
 * Removes trailing commas before object and array endings while preserving strings.
 *
 * @param {string} source - JSON-like source without comments.
 * @returns {string} Strict JSON-compatible source.
 */
function removeTrailingCommas(source: string): string {
  let output = "";
  let isInsideString = false;
  let isEscaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const currentCharacter = source[index] ?? "";

    if (isInsideString) {
      output += currentCharacter;

      if (isEscaped) {
        isEscaped = false;
      } else if (currentCharacter === "\\") {
        isEscaped = true;
      } else if (currentCharacter === "\"") {
        isInsideString = false;
      }

      continue;
    }

    if (currentCharacter === "\"") {
      isInsideString = true;
      output += currentCharacter;
      continue;
    }

    if (currentCharacter === ",") {
      let lookaheadIndex = index + 1;

      while (lookaheadIndex < source.length && /\s/.test(source[lookaheadIndex] ?? "")) {
        lookaheadIndex += 1;
      }

      if (source[lookaheadIndex] === "}" || source[lookaheadIndex] === "]") {
        continue;
      }
    }

    output += currentCharacter;
  }

  return output;
}

/**
 * Parses a JSONC file with contextual error reporting.
 *
 * @param {string} filePath - Absolute path to the JSONC file.
 * @returns {Record<string, unknown>} Parsed object.
 */
function readJsoncFile(filePath: string): PlainRecord {
  const rawSource = fs.readFileSync(filePath, FILE_ENCODING);

  return parseJsoncSource(rawSource, formatRelativePath(filePath));
}

function parseJsoncSource(source: string, sourceLabel: string): PlainRecord {
  const strictJsonSource = removeTrailingCommas(removeJsonComments(source));

  try {
    return JSON.parse(strictJsonSource);
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    normalizedError.message = `Failed to parse ${sourceLabel}: ${normalizedError.message}`;
    throw normalizedError;
  }
}

/**
 * Ensures a parsed JSON value is an object and not an array.
 *
 * @param {unknown} value - Parsed JSON value.
 * @param {string} propertyName - Property name used in error messages.
 * @returns {Record<string, unknown>} Validated object.
 */
function ensureObject(value: unknown, propertyName: string): PlainRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${propertyName} must be an object.`);
  }

  return value as PlainRecord;
}

function normalizeThemeMode(value: unknown, propertyName: string): ThemeMode {
  if (value === "dark" || value === "light") {
    return value;
  }

  throw new TypeError(`${propertyName} must be "dark" or "light".`);
}

function normalizeColorVersion(value: unknown, propertyName: string): ColorVersion {
  const version = ensureObject(value, propertyName);
  const major = normalizeColorVersionPart(version.major, `${propertyName}.major`);
  const minor = normalizeColorVersionPart(version.minor, `${propertyName}.minor`);
  const patch = normalizeColorVersionPart(version.patch, `${propertyName}.patch`);

  return { major, minor, patch };
}

function normalizeColorVersionPart(value: unknown, propertyName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 999) {
    throw new TypeError(`${propertyName} must be an integer from 0 to 999.`);
  }

  return value;
}

function getColorVersionLabel(version: ColorVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function normalizeThemeColorPack(filePath: string, value: PlainRecord): ThemeColorPack {
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";

  if (!id) {
    throw new TypeError(`${formatRelativePath(filePath)} must define a non-empty id.`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new TypeError(`${formatRelativePath(filePath)} id must use lowercase kebab-case.`);
  }

  if (!name) {
    throw new TypeError(`${formatRelativePath(filePath)} must define a non-empty name.`);
  }

  const mode = normalizeThemeMode(value.mode, `${formatRelativePath(filePath)}.mode`);
  const version = normalizeColorVersion(value.version, `${formatRelativePath(filePath)}.version`);
  const colors = value.colors === undefined ? undefined : ensureObject(value.colors, `${formatRelativePath(filePath)}.colors`);
  const semanticTokenColors = value.semanticTokenColors === undefined
    ? undefined
    : ensureObject(value.semanticTokenColors, `${formatRelativePath(filePath)}.semanticTokenColors`);

  if (value.tokenColors !== undefined && !Array.isArray(value.tokenColors)) {
    throw new TypeError(`${formatRelativePath(filePath)}.tokenColors must be an array.`);
  }

  return {
    ...(colors ? { colors } : {}),
    fileName: path.basename(filePath),
    id,
    mode,
    name,
    ...(semanticTokenColors ? { semanticTokenColors } : {}),
    ...(value.tokenColors ? { tokenColors: value.tokenColors } : {}),
    ...(typeof value.type === "string" ? { type: value.type } : {}),
    version
  };
}

function getThemeColorPackThemeData(colorPack: ThemeColorPack): PlainRecord {
  return {
    name: colorPack.name,
    type: colorPack.type || colorPack.mode,
    colors: colorPack.colors || {},
    tokenColors: colorPack.tokenColors || [],
    ...(colorPack.semanticTokenColors ? { semanticTokenColors: colorPack.semanticTokenColors } : {})
  };
}

function readThemeColorPacks(themesDirectory = PUBLIC_THEMES_DIR): ThemeColorPack[] {
  return fs.readdirSync(themesDirectory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const filePath = path.join(themesDirectory, fileName);
      return normalizeThemeColorPack(filePath, readJsoncFile(filePath));
    });
}

function parseGitHubThemesUrl(githubThemesUrl: string): GitHubThemesUrlParts {
  const parsedUrl = new URL(githubThemesUrl);
  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const [owner, repository, treeSegment, ref, ...folderPathParts] = pathParts;

  if (
    parsedUrl.hostname !== "github.com"
    || !owner
    || !repository
    || treeSegment !== "tree"
    || !ref
    || folderPathParts.length === 0
  ) {
    throw new Error(`Expected a GitHub tree URL like https://github.com/<owner>/<repo>/tree/<ref>/themes, received: ${githubThemesUrl}`);
  }

  return {
    folderPath: folderPathParts.join("/"),
    owner,
    ref,
    repository
  };
}

function createGitHubContentsApiUrl(githubThemesUrl: string): string {
  const parts = parseGitHubThemesUrl(githubThemesUrl);

  return [
    "https://api.github.com/repos",
    encodeURIComponent(parts.owner),
    encodeURIComponent(parts.repository),
    "contents",
    encodeGitHubPath(parts.folderPath)
  ].join("/") + `?ref=${encodeURIComponent(parts.ref)}`;
}

function encodeGitHubPath(folderPath: string): string {
  return folderPath.split("/").map((part) => encodeURIComponent(part)).join("/");
}

async function fetchTextFromUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "kawaii-vscode-color-theme-updater"
      }
    }, (response) => {
      const statusCode = response.statusCode || 0;

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        response.resume();
        fetchTextFromUrl(new URL(response.headers.location, url).toString()).then(resolve, reject);
        return;
      }

      if (statusCode >= 400) {
        response.resume();
        reject(new Error(`Failed to fetch ${url}: HTTP ${statusCode}`));
        return;
      }

      let responseBody = "";
      response.setEncoding(FILE_ENCODING);
      response.on("data", (chunk: string) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        resolve(responseBody);
      });
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error(`Timed out fetching ${url}`));
    });
    request.on("error", reject);
  });
}

async function readRemoteThemeColorPacks(
  githubThemesUrl = DEFAULT_REMOTE_THEMES_URL,
  fetchText: TextFetcher = fetchTextFromUrl
): Promise<RemoteThemeColorPack[]> {
  const apiUrl = createGitHubContentsApiUrl(githubThemesUrl);
  const listingSource = await fetchText(apiUrl);
  const listingValue = parseGitHubContentsListing(listingSource, apiUrl);
  const files = normalizeGitHubContentsFiles(listingValue, apiUrl);
  const colorPacks: RemoteThemeColorPack[] = [];

  for (const file of files) {
    const source = await fetchText(file.downloadUrl);
    const value = parseJsoncSource(source, file.downloadUrl);
    const colorPack = normalizeThemeColorPack(path.join(PUBLIC_THEMES_DIR, file.name), value);

    colorPacks.push({
      ...colorPack,
      source,
      sourceUrl: file.downloadUrl
    });
  }

  return colorPacks.sort((left, right) => left.id.localeCompare(right.id));
}

function parseGitHubContentsListing(source: string, apiUrl: string): unknown {
  try {
    return JSON.parse(source);
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    normalizedError.message = `Failed to parse GitHub contents listing ${apiUrl}: ${normalizedError.message}`;
    throw normalizedError;
  }
}

function normalizeGitHubContentsFiles(value: unknown, apiUrl: string): GitHubContentFileEntry[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`GitHub contents listing must be an array: ${apiUrl}`);
  }

  return value
    .map((entry) => normalizeGitHubContentsFile(entry, apiUrl))
    .filter((entry): entry is GitHubContentFileEntry => entry !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeGitHubContentsFile(entry: unknown, apiUrl: string): GitHubContentFileEntry | undefined {
  const record = ensureObject(entry, `GitHub contents entry from ${apiUrl}`);
  const type = typeof record.type === "string" ? record.type : "";
  const name = typeof record.name === "string" ? record.name : "";

  if (type !== "file" || !name.endsWith(".json")) {
    return undefined;
  }

  const downloadUrl = typeof record.download_url === "string" ? record.download_url : "";

  if (!downloadUrl) {
    throw new TypeError(`GitHub JSON file ${name} from ${apiUrl} must define download_url.`);
  }

  return { downloadUrl, name };
}

function compareColorVersions(left: ColorVersion, right: ColorVersion): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  return left.patch - right.patch;
}

function createThemeColorPackUpdatePlan(
  localPacks: readonly ThemeColorPack[],
  remotePacks: readonly RemoteThemeColorPack[],
  themesDirectory = PUBLIC_THEMES_DIR
): ThemeColorPackUpdatePlan {
  const localPackById = new Map(localPacks.map((colorPack) => [colorPack.id, colorPack]));
  const remoteIds = new Set<string>();
  const updates: ThemeColorPackUpdate[] = [];
  const skipped: ThemeColorPackUpdateSkip[] = [];

  for (const remotePack of remotePacks) {
    if (remoteIds.has(remotePack.id)) {
      throw new Error(`Duplicate remote color pack id: ${remotePack.id}`);
    }

    remoteIds.add(remotePack.id);
    const localPack = localPackById.get(remotePack.id);

    if (!localPack) {
      updates.push(createThemeColorPackUpdate(remotePack, "missing", undefined, themesDirectory));
      continue;
    }

    const versionComparison = compareColorVersions(remotePack.version, localPack.version);

    if (versionComparison > 0) {
      updates.push(createThemeColorPackUpdate(remotePack, "newer", localPack.version, themesDirectory));
      continue;
    }

    skipped.push({
      currentVersion: localPack.version,
      fileName: remotePack.fileName,
      id: remotePack.id,
      reason: versionComparison < 0 ? "older-remote" : "same-version",
      remoteVersion: remotePack.version
    });
  }

  return { skipped, updates };
}

function createThemeColorPackUpdate(
  remotePack: RemoteThemeColorPack,
  reason: ThemeColorPackUpdate["reason"],
  currentVersion: ColorVersion | undefined,
  themesDirectory: string
): ThemeColorPackUpdate {
  const targetPath = path.join(themesDirectory, getSafeRemoteThemeFileName(remotePack.fileName));
  const update = {
    colorPack: remotePack,
    reason,
    remoteVersion: remotePack.version,
    source: remotePack.source,
    sourceUrl: remotePack.sourceUrl,
    targetPath
  };

  return currentVersion === undefined ? update : {
    ...update,
    currentVersion
  };
}

function getSafeRemoteThemeFileName(fileName: string): string {
  if (path.basename(fileName) !== fileName || !fileName.endsWith(".json")) {
    throw new Error(`Remote color pack file name is not safe: ${fileName}`);
  }

  return fileName;
}

async function updateThemeColorPacksFromGitHub(options: UpdateThemeColorPacksOptions = {}): Promise<ThemeColorPackUpdateResult> {
  const themesDirectory = options.themesDirectory || PUBLIC_THEMES_DIR;
  const githubThemesUrl = options.githubThemesUrl || DEFAULT_REMOTE_THEMES_URL;
  const dryRun = options.dryRun === true;
  const remotePacks = await readRemoteThemeColorPacks(githubThemesUrl, options.fetchText || fetchTextFromUrl);
  const localPacks = fs.existsSync(themesDirectory) ? readThemeColorPacks(themesDirectory) : [];
  const plan = createThemeColorPackUpdatePlan(localPacks, remotePacks, themesDirectory);

  if (!dryRun) {
    fs.mkdirSync(themesDirectory, { recursive: true });

    for (const update of plan.updates) {
      fs.writeFileSync(update.targetPath, ensureTrailingNewline(update.source), FILE_ENCODING);
    }
  }

  return {
    remotePacks,
    skipped: plan.skipped,
    summaryLines: getThemeColorPackUpdateSummaryLines(remotePacks, plan, dryRun),
    updates: plan.updates
  };
}

function ensureTrailingNewline(source: string): string {
  return source.endsWith("\n") ? source : `${source}\n`;
}

function getThemeColorPackUpdateSummaryLines(
  remotePacks: readonly RemoteThemeColorPack[],
  plan: ThemeColorPackUpdatePlan,
  dryRun: boolean
): string[] {
  const actionLabel = dryRun ? "Planned updates" : "Applied updates";
  const writeLabel = dryRun ? "Would write" : "Wrote";
  const summaryLines = [
    `Remote color packs: ${remotePacks.length}`,
    `${actionLabel}: ${plan.updates.length}`,
    `Skipped color packs: ${plan.skipped.length}`
  ];

  plan.updates.forEach((update) => {
    const currentVersionPrefix = update.currentVersion ? `${getColorVersionLabel(update.currentVersion)} -> ` : "";
    summaryLines.push(
      `${writeLabel} ${formatRelativePath(update.targetPath)} (${update.reason}, ${currentVersionPrefix}${getColorVersionLabel(update.remoteVersion)})`
    );
  });

  plan.skipped.forEach((skip) => {
    summaryLines.push(
      `Skipped ${skip.fileName} (${skip.reason}, local ${getColorVersionLabel(skip.currentVersion)}, remote ${getColorVersionLabel(skip.remoteVersion)})`
    );
  });

  return summaryLines;
}

/**
 * Merges theme object properties where override values replace base values by key.
 *
 * @param {Record<string, unknown> | undefined} baseValue - Base object.
 * @param {Record<string, unknown> | undefined} overrideValue - Override object.
 * @param {string} propertyName - Property name used in error messages.
 * @returns {Record<string, unknown> | undefined} Merged object or undefined.
 */
function mergeObjectProperty(baseValue: unknown, overrideValue: unknown, propertyName: string): PlainRecord | undefined {
  const normalizedBaseValue = baseValue === undefined ? undefined : ensureObject(baseValue, `base.${propertyName}`);
  const normalizedOverrideValue = overrideValue === undefined ? undefined : ensureObject(overrideValue, `overrides.${propertyName}`);

  if (normalizedBaseValue === undefined && normalizedOverrideValue === undefined) {
    return undefined;
  }

  return {
    ...(normalizedBaseValue || {}),
    ...(normalizedOverrideValue || {})
  };
}

/**
 * Builds stable keys for matching token color rules.
 *
 * @param {unknown} tokenRule - Token color rule from the theme.
 * @returns {string[]} Stable keys for replacement matching.
 */
function getTokenRuleMatchKeys(tokenRule: unknown): string[] {
  if (!tokenRule || typeof tokenRule !== "object" || Array.isArray(tokenRule)) {
    return [];
  }

  const tokenRuleRecord = tokenRule as TokenRuleLike;
  const matchKeys: string[] = [];

  if (typeof tokenRuleRecord.name === "string" && tokenRuleRecord.name.length > 0) {
    matchKeys.push(`name:${tokenRuleRecord.name}`);
  }

  if (typeof tokenRuleRecord.scope === "string" && tokenRuleRecord.scope.length > 0) {
    matchKeys.push(`scope:${tokenRuleRecord.scope}`);
  }

  if (Array.isArray(tokenRuleRecord.scope)) {
    matchKeys.push(`scope:${tokenRuleRecord.scope.join("\u0000")}`);
  }

  return matchKeys;
}

/**
 * Merges override token rules into the base rules.
 *
 * Matching override rules replace base rules by `name` first, then by `scope`.
 * Non-matching override rules are appended after the base rules.
 *
 * @param {unknown[] | undefined} baseValue - Base token color rules.
 * @param {unknown[] | undefined} overrideValue - Override token color rules.
 * @returns {unknown[]} Merged token color rules.
 */
function mergeTokenColors(baseValue: unknown, overrideValue: unknown): unknown[] {
  if (baseValue !== undefined && !Array.isArray(baseValue)) {
    throw new TypeError("base.tokenColors must be an array.");
  }

  if (overrideValue !== undefined && !Array.isArray(overrideValue)) {
    throw new TypeError("overrides.tokenColors must be an array.");
  }

  const mergedTokenColors = [...(baseValue || [])];
  const tokenRuleIndexByKey = new Map<string, number>();

  mergedTokenColors.forEach((tokenRule, index) => {
    for (const key of getTokenRuleMatchKeys(tokenRule)) {
      tokenRuleIndexByKey.set(key, index);
    }
  });

  for (const overrideTokenRule of overrideValue || []) {
    const matchKeys = getTokenRuleMatchKeys(overrideTokenRule);
    const existingIndex = matchKeys
      .map((key) => tokenRuleIndexByKey.get(key))
      .find((index) => index !== undefined);

    if (existingIndex === undefined) {
      mergedTokenColors.push(overrideTokenRule);

      for (const key of matchKeys) {
        tokenRuleIndexByKey.set(key, mergedTokenColors.length - 1);
      }

      continue;
    }

    mergedTokenColors[existingIndex] = overrideTokenRule;

    for (const key of matchKeys) {
      tokenRuleIndexByKey.set(key, existingIndex);
    }
  }

  return mergedTokenColors;
}

/**
 * Builds the generated VS Code theme from the protected base theme and editable overrides.
 *
 * @param {Record<string, unknown>} baseTheme - Protected base theme.
 * @param {Record<string, unknown>} overridesTheme - Editable override theme.
 * @returns {Record<string, unknown>} Generated theme data.
 */
function buildGeneratedTheme(baseTheme: PlainRecord, overridesTheme: PlainRecord): PlainRecord {
  const {
    colors: overrideColors,
    tokenColors: overrideTokenColors,
    semanticTokenColors: overrideSemanticTokenColors,
    ...topLevelOverrides
  } = overridesTheme;

  const generatedTheme: PlainRecord = {
    ...baseTheme,
    ...topLevelOverrides,
    colors: mergeObjectProperty(baseTheme.colors, overrideColors, "colors") || {},
    tokenColors: mergeTokenColors(baseTheme.tokenColors, overrideTokenColors)
  };

  const mergedSemanticTokenColors = mergeObjectProperty(
    baseTheme.semanticTokenColors,
    overrideSemanticTokenColors,
    "semanticTokenColors"
  );

  if (mergedSemanticTokenColors !== undefined) {
    generatedTheme.semanticTokenColors = mergedSemanticTokenColors;
  }

  return generatedTheme;
}

/**
 * Writes generated theme data as strict formatted JSON.
 *
 * @param {string} filePath - Output file path.
 * @param {Record<string, unknown>} themeData - Generated theme data.
 * @returns {void}
 */
function writeThemeFile(filePath: string, themeData: PlainRecord): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(themeData, null, 2)}\n`, FILE_ENCODING);
}

/**
 * Formats a workspace-relative path for build output.
 *
 * @param {string} filePath - Absolute file path.
 * @returns {string} Workspace-relative path.
 */
function formatRelativePath(filePath: string): string {
  return path.relative(WORKSPACE_ROOT, filePath);
}

/**
 * Builds one generated theme variant from its base and overrides.
 *
 * @param {Record<string, string>} themeVariant - Theme variant path configuration.
 * @returns {string[]} Build summary lines.
 */
function buildThemeVariant(themeVariant: ThemeVariant): string[] {
  const baseTheme = readJsoncFile(themeVariant.baseThemePath);
  const overridesTheme = readJsoncFile(themeVariant.overridesThemePath);
  const generatedTheme = buildGeneratedTheme(baseTheme, overridesTheme);

  writeThemeFile(themeVariant.generatedThemePath, generatedTheme);

  return [
    `Generated ${formatRelativePath(themeVariant.generatedThemePath)}`,
    `Base: ${formatRelativePath(themeVariant.baseThemePath)}`,
    `Overrides: ${formatRelativePath(themeVariant.overridesThemePath)}`,
    `Override colors: ${Object.keys(ensureObject(overridesTheme.colors || {}, "overrides.colors")).length}`,
    `Override token rules: ${Array.isArray(overridesTheme.tokenColors) ? overridesTheme.tokenColors.length : 0}`
  ];
}

function buildGeneratedThemeFromColorPack(colorPack: ThemeColorPack): PlainRecord {
  const baseTheme = readJsoncFile(CORE_THEME_PATH_BY_MODE[colorPack.mode]);

  return buildGeneratedTheme(baseTheme, getThemeColorPackThemeData(colorPack));
}

function createInternalThemeCatalog(colorPacks: readonly ThemeColorPack[]): PlainRecord {
  return {
    schemaVersion: 1,
    themes: colorPacks.map((colorPack) => ({
      id: colorPack.id,
      name: colorPack.name,
      mode: colorPack.mode,
      type: colorPack.type || colorPack.mode,
      fileName: colorPack.fileName,
      version: colorPack.version,
      versionLabel: getColorVersionLabel(colorPack.version),
      theme: buildGeneratedThemeFromColorPack(colorPack)
    }))
  };
}

function buildInternalThemeOutputs(colorPacks = readThemeColorPacks()): string[] {
  const summaryLines: string[] = [];
  const colorPackById = new Map(colorPacks.map((colorPack) => [colorPack.id, colorPack]));
  const catalog = createInternalThemeCatalog(colorPacks);

  writeThemeFile(INTERNAL_THEME_CATALOG_PATH, catalog);
  summaryLines.push(`Generated ${formatRelativePath(INTERNAL_THEME_CATALOG_PATH)}`);
  summaryLines.push(`Internal color packs: ${colorPacks.length}`);

  for (const nativeThemeVariant of NATIVE_THEME_VARIANTS) {
    const colorPack = colorPackById.get(nativeThemeVariant.colorPackId);

    if (!colorPack) {
      throw new Error(`Missing native color pack: ${nativeThemeVariant.colorPackId}`);
    }

    if (colorPack.mode !== nativeThemeVariant.mode) {
      throw new Error(`Native color pack ${colorPack.id} must use mode ${nativeThemeVariant.mode}.`);
    }

    const generatedTheme = buildGeneratedThemeFromColorPack(colorPack);

    writeThemeFile(nativeThemeVariant.generatedThemePath, generatedTheme);
    summaryLines.push(`Generated ${formatRelativePath(nativeThemeVariant.generatedThemePath)}`);
    summaryLines.push(`Color pack: ${formatRelativePath(path.join(PUBLIC_THEMES_DIR, colorPack.fileName))}`);
  }

  return summaryLines;
}

/**
 * Logs contextual build failures.
 *
 * @param {unknown} error - Caught error.
 * @returns {void}
 */
function logBuildError(error: unknown): void {
  const timestamp = new Date().toISOString();
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  console.error(JSON.stringify({
    timestamp,
    methodName: "build-color-theme",
    context: {
      variants: THEME_VARIANTS.map(function mapThemeVariant(themeVariant) {
        return {
          label: themeVariant.label,
          baseThemePath: formatRelativePath(themeVariant.baseThemePath),
          overridesThemePath: formatRelativePath(themeVariant.overridesThemePath),
          generatedThemePath: formatRelativePath(themeVariant.generatedThemePath)
        };
      }),
      expectedBehavior: "Read public themes/*.json color packs, merge each over the matching core base theme, then generate native themes and the internal catalog.",
      actualBehavior: normalizedError.message
    },
    stack: normalizedError.stack
  }, null, 2));
}

/**
 * Runs the color theme build.
 *
 * @returns {void}
 */
function main(): void {
  const summaryLines = buildInternalThemeOutputs();

  console.log(summaryLines.join("\n"));
}

function runCli(): void {
  try {
    main();
  } catch (error) {
    logBuildError(error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

export {
  buildGeneratedTheme,
  buildGeneratedThemeFromColorPack,
  buildInternalThemeOutputs,
  buildThemeVariant,
  compareColorVersions,
  createGitHubContentsApiUrl,
  createInternalThemeCatalog,
  createThemeColorPackUpdatePlan,
  DEFAULT_REMOTE_THEMES_URL,
  getColorVersionLabel,
  normalizeColorVersion,
  normalizeThemeColorPack,
  main,
  parseGitHubThemesUrl,
  readJsoncFile,
  readRemoteThemeColorPacks,
  readThemeColorPacks,
  removeJsonComments,
  removeTrailingCommas,
  runCli,
  updateThemeColorPacksFromGitHub
};
