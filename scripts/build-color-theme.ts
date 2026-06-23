import fs = require("node:fs");
import path = require("node:path");

type PlainRecord = Record<string, any>;

interface ThemeVariant {
  readonly label: string;
  readonly baseThemePath: string;
  readonly overridesThemePath: string;
  readonly generatedThemePath: string;
}

interface TokenRuleLike {
  readonly name?: unknown;
  readonly scope?: unknown;
}

const WORKSPACE_ROOT = resolveWorkspaceRoot(__dirname);
const FILE_ENCODING = "utf8";
const THEME_VARIANTS: readonly ThemeVariant[] = [
  {
    label: "Kawaii VS Code Color",
    baseThemePath: path.join(WORKSPACE_ROOT, "themes", "kawaii_synthwave-color-theme.json"),
    overridesThemePath: path.join(WORKSPACE_ROOT, "themes", "kawaii_synthwave-color-theme-overrides.json"),
    generatedThemePath: path.join(WORKSPACE_ROOT, "themes", "kawaii_synthwave-generated-color-theme.json")
  },
  {
    label: "Kawaii VS Code Color Light",
    baseThemePath: path.join(WORKSPACE_ROOT, "themes", "kawaii_synthwave-color-theme-light.json"),
    overridesThemePath: path.join(WORKSPACE_ROOT, "themes", "kawaii_synthwave-color-theme-light-overrides.json"),
    generatedThemePath: path.join(WORKSPACE_ROOT, "themes", "kawaii_synthwave-generated-color-theme-light.json")
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
  const strictJsonSource = removeTrailingCommas(removeJsonComments(rawSource));

  try {
    return JSON.parse(strictJsonSource);
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    normalizedError.message = `Failed to parse ${path.relative(WORKSPACE_ROOT, filePath)}: ${normalizedError.message}`;
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
      expectedBehavior: "Merge base theme first, then apply override colors and merge override token rules.",
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
  const summaryLines = THEME_VARIANTS.flatMap((themeVariant) => buildThemeVariant(themeVariant));

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
  buildThemeVariant,
  main,
  readJsoncFile,
  removeJsonComments,
  removeTrailingCommas,
  runCli
};
