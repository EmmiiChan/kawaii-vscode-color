const COLOR_HEX_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function getThemeCustomizationKey(themeVariant) {
  return `[${themeVariant.label}]`;
}

function writeThemeCustomizationBlock(customizations, themeCustomizations, themeVariant) {
  const themeCustomizationKey = getThemeCustomizationKey(themeVariant);

  if (Object.keys(themeCustomizations).length > 0) {
    customizations[themeCustomizationKey] = themeCustomizations;
    return;
  }

  delete customizations[themeCustomizationKey];
}

function clonePlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  try {
    const clone = JSON.parse(JSON.stringify(value));
    return clone && typeof clone === "object" && !Array.isArray(clone) ? clone : {};
  } catch (error) {
    return {};
  }
}

function ensurePlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? clonePlainObject(value) : {};
}

function getTextMateRules(themeCustomizations) {
  return Array.isArray(themeCustomizations.textMateRules)
    ? themeCustomizations.textMateRules.filter(function filterRule(rule) {
        return rule && typeof rule === "object" && !Array.isArray(rule);
      })
    : [];
}

function findMatchingTokenRuleIndex(textMateRules, tokenRule) {
  return textMateRules.findIndex(function matchTokenRule(customRule) {
    return areScopesEqual(customRule.scope, tokenRule.scope);
  });
}

function areScopesEqual(leftScope, rightScope) {
  return stringifyScope(leftScope) === stringifyScope(rightScope);
}

function stringifyScope(scope) {
  if (Array.isArray(scope)) {
    return scope.join(", ");
  }

  return typeof scope === "string" ? scope : "";
}

function normalizeHexColor(value) {
  if (typeof value !== "string") {
    throw new Error("Color value must be a hex string.");
  }

  const trimmedValue = value.trim();

  if (!COLOR_HEX_PATTERN.test(trimmedValue)) {
    throw new Error("Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.");
  }

  return trimmedValue;
}

function updateWorkbenchColorBlock(customizations, colorId, colorValue, themeVariant) {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = ensurePlainObject(nextCustomizations[getThemeCustomizationKey(themeVariant)]);

  themeCustomizations[colorId] = colorValue;
  writeThemeCustomizationBlock(nextCustomizations, themeCustomizations, themeVariant);

  return nextCustomizations;
}

function resetWorkbenchColorBlock(customizations, colorId, themeVariant) {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = ensurePlainObject(nextCustomizations[getThemeCustomizationKey(themeVariant)]);

  delete themeCustomizations[colorId];
  writeThemeCustomizationBlock(nextCustomizations, themeCustomizations, themeVariant);

  return nextCustomizations;
}

function updateTokenColorBlock(customizations, tokenRule, colorValue, themeVariant) {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = ensurePlainObject(nextCustomizations[getThemeCustomizationKey(themeVariant)]);
  const textMateRules = getTextMateRules(themeCustomizations);
  const customRule = {
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

function resetTokenColorBlock(customizations, tokenRule, themeVariant) {
  const nextCustomizations = ensurePlainObject(customizations);
  const themeCustomizations = ensurePlainObject(nextCustomizations[getThemeCustomizationKey(themeVariant)]);
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

function removeThemeCustomizationBlockFromObject(customizations, themeVariant) {
  const nextCustomizations = ensurePlainObject(customizations);

  delete nextCustomizations[getThemeCustomizationKey(themeVariant)];

  return nextCustomizations;
}

function getThemeCustomizationBlocksExportFromObject(customizations, themeVariants) {
  const safeCustomizations = ensurePlainObject(customizations);

  return themeVariants.reduce(function reduceThemeBlocks(blocks, themeVariant) {
    blocks[themeVariant.id] = ensurePlainObject(safeCustomizations[getThemeCustomizationKey(themeVariant)]);
    return blocks;
  }, {});
}

module.exports = {
  areScopesEqual,
  clonePlainObject,
  ensurePlainObject,
  findMatchingTokenRuleIndex,
  getTextMateRules,
  getThemeCustomizationBlocksExportFromObject,
  getThemeCustomizationKey,
  normalizeHexColor,
  removeThemeCustomizationBlockFromObject,
  resetTokenColorBlock,
  resetWorkbenchColorBlock,
  stringifyScope,
  updateTokenColorBlock,
  updateWorkbenchColorBlock,
  writeThemeCustomizationBlock
};

