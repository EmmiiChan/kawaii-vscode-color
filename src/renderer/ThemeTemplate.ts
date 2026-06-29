export type RendererTokenReplacementMap = Readonly<Record<string, string>>;

export const DARK_RENDERER_TOKEN_REPLACEMENTS = {
  fe4450: "color: #fffafd; text-shadow: 0 0 2px #000, 0 0 10px #fc1f2c[NEON_BRIGHTNESS], 0 0 5px #fc1f2c[NEON_BRIGHTNESS], 0 0 25px #fc1f2c[NEON_BRIGHTNESS]; backface-visibility: hidden;",
  ff7edb: "color: #f92aad; text-shadow: 0 0 2px #100c0f, 0 0 5px #dc078e33, 0 0 10px #fffafd33; backface-visibility: hidden;",
  fede5d: "color: #f4eee4; text-shadow: 0 0 2px #393a33, 0 0 8px #f39f05[NEON_BRIGHTNESS], 0 0 2px #f39f05[NEON_BRIGHTNESS]; backface-visibility: hidden;",
  "72f1b8": "color: #72f1b8; text-shadow: 0 0 2px #100c0f, 0 0 10px #257c55[NEON_BRIGHTNESS], 0 0 35px #212724[NEON_BRIGHTNESS]; backface-visibility: hidden;",
  "36f9f6": "color: #fdfdfd; text-shadow: 0 0 2px #001716, 0 0 3px #03edf9[NEON_BRIGHTNESS], 0 0 5px #03edf9[NEON_BRIGHTNESS], 0 0 8px #03edf9[NEON_BRIGHTNESS]; backface-visibility: hidden;"
} as const satisfies RendererTokenReplacementMap;

export const LIGHT_RENDERER_TOKEN_REPLACEMENTS = {
  "0000ff": "color: #244fd8; text-shadow: 0 0 2px #fffafd, 0 0 4px #59a4f9[NEON_BRIGHTNESS], 0 0 8px #59a4f966; backface-visibility: hidden;",
  "008000": "color: #1f7d56; text-shadow: 0 0 2px #fffafd, 0 0 4px #72f1b8[NEON_BRIGHTNESS], 0 0 7px #72f1b866; backface-visibility: hidden;",
  "098658": "color: #1f7d56; text-shadow: 0 0 2px #fffafd, 0 0 4px #72f1b8[NEON_BRIGHTNESS], 0 0 7px #72f1b866; backface-visibility: hidden;",
  a31515: "color: #a83c47; text-shadow: 0 0 2px #fffafd, 0 0 4px #f98784[NEON_BRIGHTNESS], 0 0 8px #f9878466; backface-visibility: hidden;",
  cd3131: "color: #c43455; text-shadow: 0 0 2px #fffafd, 0 0 4px #fe4450[NEON_BRIGHTNESS], 0 0 8px #fe445066; backface-visibility: hidden;",
  "811f3f": "color: #a9235d; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb[NEON_BRIGHTNESS], 0 0 8px #ff7edb66; backface-visibility: hidden;",
  "800000": "color: #a83c47; text-shadow: 0 0 2px #fffafd, 0 0 4px #f98784[NEON_BRIGHTNESS], 0 0 8px #f9878466; backface-visibility: hidden;",
  ff0000: "color: #d6336c; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb[NEON_BRIGHTNESS], 0 0 8px #ff7edb66; backface-visibility: hidden;",
  "0451a5": "color: #0f5fa8; text-shadow: 0 0 2px #fffafd, 0 0 4px #59a4f9[NEON_BRIGHTNESS], 0 0 8px #59a4f966; backface-visibility: hidden;",
  "000080": "color: #3e3f9e; text-shadow: 0 0 2px #fffafd, 0 0 4px #745ca0[NEON_BRIGHTNESS], 0 0 8px #745ca066; backface-visibility: hidden;",
  "000000": "color: #2b1d29; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb33, 0 0 8px #ff7edb22; backface-visibility: hidden;",
  "2b1d29": "color: #2b1d29; text-shadow: 0 0 2px #fffafd, 0 0 4px #ff7edb33, 0 0 8px #ff7edb22; backface-visibility: hidden;"
} as const satisfies RendererTokenReplacementMap;

export const RENDERER_TOKEN_REPLACEMENT_SETS: readonly RendererTokenReplacementMap[] = [
  DARK_RENDERER_TOKEN_REPLACEMENTS,
  LIGHT_RENDERER_TOKEN_REPLACEMENTS
];

export interface RendererInnerThemeConfig {
  readonly id: "dark" | "light";
  readonly wrapperClass: string;
  readonly selectors: readonly string[];
}

export const RENDERER_INNER_THEME_CONFIGS: readonly RendererInnerThemeConfig[] = [
  {
    id: "dark",
    wrapperClass: "dark-pink-kawaii",
    selectors: [
      '[class~="vs-dark"][class*="kawaii_synthwave-generated-color-theme-json"]',
      '[class~="vs-dark"][class*="kawaii-synthwave-generated-color-theme-json"]',
      '[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"]'
    ]
  },
  {
    id: "light",
    wrapperClass: "light-pink-pastel-kawaii",
    selectors: [
      '[class~="vs"][class*="kawaii_synthwave-generated-color-theme-light-json"]',
      '[class~="vs"][class*="kawaii-synthwave-generated-color-theme-light-json"]',
      '[class~="vs"][class*="kawaii-vscode-color-generated-color-theme-light-json"]'
    ]
  }
];

export const RENDERER_INNER_THEME_WRAPPER_CLASSES: readonly string[] = RENDERER_INNER_THEME_CONFIGS.map((innerTheme) => innerTheme.wrapperClass);
export const KAWAII_THEME_WRAPPER_SELECTORS: readonly string[] = RENDERER_INNER_THEME_CONFIGS.flatMap((innerTheme) => innerTheme.selectors);

export const RENDERER_UI_ROOT_CLASS = "kawaii-vscode-colors-ui";
export const RENDERER_STYLESHEET_HREF = "kawaii-vscode-colors-ui.min.css?v=[KAWAII_UI_STYLE_VERSION]";
export const RENDERER_EFFECT_ROOT_CLASSES = {
  foundation: "kawaii-effect-foundation",
  editorBackground: "kawaii-effect-editor-background",
  noPageLogo: "kawaii-effect-no-page-logo",
  glow: "kawaii-effect-glow"
} as const;

export const RENDERER_STYLE_IDS = {
  stylesheet: "kawaii-vscode-colors-ui-stylesheet",
  token: "kawaii-vscode-colors-ui-token-styles"
} as const;

export const RENDERER_OBSERVER_RUNTIME_LIMITS = {
  bootstrapTimeoutMs: 15000,
  mutationDebounceMs: 50
} as const;

export function normalizeRendererTokenColor(color: string): string {
  const normalizedColor = color.trim().replace(/^#/, "").toLowerCase();
  return normalizedColor.length === 8 && normalizedColor.endsWith("ff")
    ? normalizedColor.slice(0, 6)
    : normalizedColor;
}

export function createRendererTokenColorRegex(color: string): RegExp {
  return new RegExp(`color\\s*:\\s*#${escapeRegExp(normalizeRendererTokenColor(color))}(?:ff)?\\s*;`, "i");
}

export function countRendererTokenColorMatches(
  tokenStyles: string,
  replacements: RendererTokenReplacementMap
): number {
  const normalizedStyles = tokenStyles.toLowerCase();

  return Object.keys(replacements).filter((color) =>
    createRendererTokenColorRegex(color).test(normalizedStyles)
  ).length;
}

export function getBestRendererTokenReplacements(
  tokenStyles: string,
  replacementSets: readonly RendererTokenReplacementMap[] = RENDERER_TOKEN_REPLACEMENT_SETS
): RendererTokenReplacementMap {
  const rankedSets = replacementSets.map((replacements) => ({
    matchCount: countRendererTokenColorMatches(tokenStyles, replacements),
    replacements
  }));
  const firstSet = rankedSets[0];

  if (!firstSet) {
    return DARK_RENDERER_TOKEN_REPLACEMENTS;
  }

  const bestMatch = rankedSets.reduce((best, current) =>
    current.matchCount > best.matchCount ? current : best
  , firstSet);

  return bestMatch.matchCount > 0 ? bestMatch.replacements : DARK_RENDERER_TOKEN_REPLACEMENTS;
}

export function orderRendererTokenReplacementSets(
  tokenStyles: string,
  replacementSets: readonly RendererTokenReplacementMap[] = RENDERER_TOKEN_REPLACEMENT_SETS
): readonly RendererTokenReplacementMap[] {
  const bestTokenReplacements = getBestRendererTokenReplacements(tokenStyles, replacementSets);
  return [
    bestTokenReplacements,
    ...replacementSets.filter((replacements) => replacements !== bestTokenReplacements)
  ];
}

export function getRendererTokenColorReplacement(
  color: string,
  replacementSets: readonly RendererTokenReplacementMap[]
): string | null {
  const tokenColor = normalizeRendererTokenColor(color);

  for (const replacements of replacementSets) {
    if (Object.prototype.hasOwnProperty.call(replacements, tokenColor)) {
      return replacements[tokenColor] || null;
    }
  }

  return null;
}

export function replaceRendererTokenColors(
  styles: string,
  replacementSets: readonly RendererTokenReplacementMap[]
): string {
  return styles.replace(
    /color\s*:\s*#([0-9a-f]{6}(?:[0-9a-f]{2})?)\s*;/gi,
    (match, color: string) => getRendererTokenColorReplacement(color, replacementSets) || match
  );
}

export function createScopedRendererTokenRule(
  selector: string,
  replacement: string,
  innerTheme: RendererInnerThemeConfig
): string {
  return `.${RENDERER_UI_ROOT_CLASS}.${RENDERER_EFFECT_ROOT_CLASSES.glow}.${innerTheme.wrapperClass} ${selector.trim()} {${replacement}}`;
}

export function createScopedRendererTokenRules(
  styles: string,
  replacementSets: readonly RendererTokenReplacementMap[],
  innerTheme: RendererInnerThemeConfig
): string {
  const scopedRules: string[] = [];

  styles.replace(
    /([^{}]+)\{[^{}]*?color\s*:\s*#([0-9a-f]{6}(?:[0-9a-f]{2})?)\s*;[^{}]*\}/gi,
    (match, selectorList: string, color: string) => {
      const replacement = getRendererTokenColorReplacement(color, replacementSets);

      if (!replacement) {
        return match;
      }

      selectorList
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean)
        .forEach((selector) => scopedRules.push(createScopedRendererTokenRule(selector, replacement, innerTheme)));

      return match;
    }
  );

  return scopedRules.join("");
}

export function getRendererTokenStylesSignature(
  styles: string,
  disableGlow: boolean,
  innerTheme?: RendererInnerThemeConfig | string,
  glowEnabled = true
): string {
  const wrapperClass = typeof innerTheme === "string" ? innerTheme : innerTheme?.wrapperClass;
  return wrapperClass ? `${wrapperClass}:${disableGlow}:${glowEnabled}:${styles}` : `${disableGlow}:${glowEnabled}:${styles}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
