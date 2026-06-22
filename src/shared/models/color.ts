export type HexColor = string & { readonly __brand: "HexColor" };
export type ColorCustomizationKey = string & { readonly __brand: "ColorCustomizationKey" };

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isHexColor(value: unknown): value is HexColor {
    return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export function isColorCustomizationKey(value: unknown): value is ColorCustomizationKey {
    return typeof value === "string" && value.trim().length > 0;
}
