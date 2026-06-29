const COLOR_HEX_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export interface ThemeVariant {
  readonly id?: string;
  readonly label: string;
  readonly legacyLabels?: readonly string[];
}

export type PlainRecord = Record<string, unknown>;

export interface TextMateRule extends PlainRecord {
  scope?: unknown;
  settings?: PlainRecord;
}

export interface TokenRule extends PlainRecord {
  scope?: unknown;
  settings?: PlainRecord;
}

export function getThemeCustomizationKey(themeVariant: ThemeVariant): string {
  return `[${themeVariant.label}]`;
}

export function getThemeCustomizationKeys(themeVariant: ThemeVariant): string[] {
  return [
    getThemeCustomizationKey(themeVariant),
    ...(themeVariant.legacyLabels || []).map((themeLabel) => `[${themeLabel}]`)
  ];
}

export function writeThemeCustomizationBlock(
  customizations: PlainRecord,
  themeCustomizations: PlainRecord,
  themeVariant: ThemeVariant
): void {
  const themeCustomizationKey = getThemeCustomizationKey(themeVariant);
  getThemeCustomizationKeys(themeVariant).forEach((customizationKey) => {
    delete customizations[customizationKey];
  });

  if (Object.keys(themeCustomizations).length > 0) {
    customizations[themeCustomizationKey] = themeCustomizations;
  }
}

export function clonePlainObject(value: unknown): PlainRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  try {
    const clone = JSON.parse(JSON.stringify(value)) as unknown;
    return clone && typeof clone === "object" && !Array.isArray(clone) ? clone as PlainRecord : {};
  } catch (error) {
    return {};
  }
}

export function ensurePlainObject(value: unknown): PlainRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? clonePlainObject(value) : {};
}

export function getThemeCustomizationBlockFromObject(
  customizations: unknown,
  themeVariant: ThemeVariant
): PlainRecord {
  const safeCustomizations = ensurePlainObject(customizations);

  for (const themeCustomizationKey of getThemeCustomizationKeys(themeVariant)) {
    const themeCustomizations = ensurePlainObject(safeCustomizations[themeCustomizationKey]);

    if (Object.keys(themeCustomizations).length > 0) {
      return themeCustomizations;
    }
  }

  return {};
}

export function getTextMateRules(themeCustomizations: PlainRecord): TextMateRule[] {
  return Array.isArray(themeCustomizations.textMateRules)
    ? themeCustomizations.textMateRules.filter(isTextMateRule)
    : [];
}

export function findMatchingTokenRuleIndex(textMateRules: readonly TextMateRule[], tokenRule: TokenRule): number {
  return textMateRules.findIndex((customRule) => areScopesEqual(customRule.scope, tokenRule.scope));
}

export function areScopesEqual(leftScope: unknown, rightScope: unknown): boolean {
  return stringifyScope(leftScope) === stringifyScope(rightScope);
}

export function stringifyScope(scope: unknown): string {
  if (Array.isArray(scope)) {
    return scope.join(", ");
  }

  return typeof scope === "string" ? scope : "";
}

export function normalizeHexColor(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Color value must be a hex string.");
  }

  const trimmedValue = value.trim();

  if (!COLOR_HEX_PATTERN.test(trimmedValue)) {
    throw new Error("Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.");
  }

  return trimmedValue;
}

export function updateWorkbenchColorBlock(
  customizations: unknown,
  colorId: string,
  colorValue: string,
  themeVariant: ThemeVariant
): PlainRecord {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = getThemeCustomizationBlockFromObject(nextCustomizations, themeVariant);

  themeCustomizations[colorId] = colorValue;
  writeThemeCustomizationBlock(nextCustomizations, themeCustomizations, themeVariant);

  return nextCustomizations;
}

export function resetWorkbenchColorBlock(
  customizations: unknown,
  colorId: string,
  themeVariant: ThemeVariant
): PlainRecord {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = getThemeCustomizationBlockFromObject(nextCustomizations, themeVariant);

  delete themeCustomizations[colorId];
  writeThemeCustomizationBlock(nextCustomizations, themeCustomizations, themeVariant);

  return nextCustomizations;
}

export function updateTokenColorBlock(
  customizations: unknown,
  tokenRule: TokenRule,
  colorValue: string,
  themeVariant: ThemeVariant
): PlainRecord {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = getThemeCustomizationBlockFromObject(nextCustomizations, themeVariant);
  const textMateRules = getTextMateRules(themeCustomizations);
  const customRule: TextMateRule = {
    scope: tokenRule.scope,
    settings: {
      foreground: colorValue
    }
  };
  const existingIndex = findMatchingTokenRuleIndex(textMateRules, tokenRule);

  if (existingIndex >= 0) {
    textMateRules[existingIndex] = customRule;
  } else {
    textMateRules.push(customRule);
  }

  themeCustomizations.textMateRules = textMateRules;
  writeThemeCustomizationBlock(nextCustomizations, themeCustomizations, themeVariant);

  return nextCustomizations;
}

export function resetTokenColorBlock(
  customizations: unknown,
  tokenRule: TokenRule,
  themeVariant: ThemeVariant
): PlainRecord {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = getThemeCustomizationBlockFromObject(nextCustomizations, themeVariant);
  const textMateRules = getTextMateRules(themeCustomizations);
  const existingIndex = findMatchingTokenRuleIndex(textMateRules, tokenRule);

  if (existingIndex >= 0) {
    textMateRules.splice(existingIndex, 1);
  }

  if (textMateRules.length > 0) {
    themeCustomizations.textMateRules = textMateRules;
  } else {
    delete themeCustomizations.textMateRules;
  }

  writeThemeCustomizationBlock(nextCustomizations, themeCustomizations, themeVariant);

  return nextCustomizations;
}

export function removeThemeCustomizationBlockFromObject(
  customizations: unknown,
  themeVariant: ThemeVariant
): PlainRecord {
  const nextCustomizations = ensurePlainObject(customizations);

  getThemeCustomizationKeys(themeVariant).forEach((themeCustomizationKey) => {
    delete nextCustomizations[themeCustomizationKey];
  });

  return nextCustomizations;
}

export function getThemeCustomizationBlocksExportFromObject(
  customizations: unknown,
  themeVariants: readonly ThemeVariant[]
): Record<string, PlainRecord> {
  const safeCustomizations = ensurePlainObject(customizations);

  return themeVariants.reduce<Record<string, PlainRecord>>((blocks, themeVariant) => {
    if (!themeVariant.id) {
      return blocks;
    }

    blocks[themeVariant.id] = getThemeCustomizationBlockFromObject(safeCustomizations, themeVariant);
    return blocks;
  }, {});
}

function isTextMateRule(rule: unknown): rule is TextMateRule {
  return Boolean(rule && typeof rule === "object" && !Array.isArray(rule));
}
