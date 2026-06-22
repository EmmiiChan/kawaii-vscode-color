export type ThemeName = string & { readonly __brand: "ThemeName" };

export const KAWAII_DARK_THEME_NAME = "Kawaii VS Code Color" as ThemeName;
export const KAWAII_LIGHT_THEME_NAME = "Kawaii VS Code Color Light" as ThemeName;

export const KAWAII_THEME_NAMES = [
    KAWAII_DARK_THEME_NAME,
    KAWAII_LIGHT_THEME_NAME
] as const;

export type ThemeVariantId = "dark" | "light";

export interface ThemeVariant {
    readonly id: ThemeVariantId;
    readonly name: ThemeName;
    readonly generatedThemePath: string;
}

export function isThemeName(value: unknown): value is ThemeName {
    return typeof value === "string" && KAWAII_THEME_NAMES.includes(value as ThemeName);
}
