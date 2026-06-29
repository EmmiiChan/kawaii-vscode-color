export type ThemeName = string & { readonly __brand: "ThemeName" };

export const KAWAII_UI_ROOT_CLASS = "kawaii-vscode-colors-ui";

export const KAWAII_DARK_THEME_NAME = "Dark Pink Kawaii" as ThemeName;
export const KAWAII_LIGHT_THEME_NAME = "Light Pink-Pastel Kawaii" as ThemeName;
export const KAWAII_LEGACY_DARK_THEME_NAME = "Kawaii VS Code Color" as ThemeName;
export const KAWAII_LEGACY_LIGHT_THEME_NAME = "Kawaii VS Code Color Light" as ThemeName;

export const KAWAII_CANONICAL_THEME_NAMES = [
    KAWAII_DARK_THEME_NAME,
    KAWAII_LIGHT_THEME_NAME
] as const;

export const KAWAII_THEME_NAMES = [
    ...KAWAII_CANONICAL_THEME_NAMES,
    KAWAII_LEGACY_DARK_THEME_NAME,
    KAWAII_LEGACY_LIGHT_THEME_NAME
] as const;

export type ThemeVariantId = "dark" | "light";

export interface ThemeVariant {
    readonly id: ThemeVariantId;
    readonly label: ThemeName;
    readonly legacyLabels: readonly ThemeName[];
    readonly modeLabel: string;
    readonly wrapperClass: string;
    readonly generatedThemePath: string;
}

export const KAWAII_THEME_VARIANTS: readonly ThemeVariant[] = [
    {
        id: "dark",
        label: KAWAII_DARK_THEME_NAME,
        legacyLabels: [KAWAII_LEGACY_DARK_THEME_NAME],
        modeLabel: "Dark",
        wrapperClass: sanitizeThemeWrapperClass(KAWAII_DARK_THEME_NAME),
        generatedThemePath: "src/generated-themes/kawaii_synthwave-generated-color-theme.json"
    },
    {
        id: "light",
        label: KAWAII_LIGHT_THEME_NAME,
        legacyLabels: [KAWAII_LEGACY_LIGHT_THEME_NAME],
        modeLabel: "Light",
        wrapperClass: sanitizeThemeWrapperClass(KAWAII_LIGHT_THEME_NAME),
        generatedThemePath: "src/generated-themes/kawaii_synthwave-generated-color-theme-light.json"
    }
] as const;

export function sanitizeThemeWrapperClass(label: string): string {
    return label
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function isThemeName(value: unknown): value is ThemeName {
    return typeof value === "string" && KAWAII_THEME_NAMES.includes(value as ThemeName);
}

export function isThemeVariantLabel(value: unknown): value is ThemeName {
    return Boolean(getThemeVariantByLabel(value));
}

export function getThemeVariantById(value: unknown): ThemeVariant | undefined {
    return KAWAII_THEME_VARIANTS.find((themeVariant) => themeVariant.id === value);
}

export function getThemeVariantByLabel(value: unknown): ThemeVariant | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    return KAWAII_THEME_VARIANTS.find((themeVariant) => (
        themeVariant.label === value
        || themeVariant.legacyLabels.includes(value as ThemeName)
    ));
}
