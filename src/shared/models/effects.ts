export type OpacityValue = number & { readonly __brand: "OpacityValue" };

export const EDITOR_BACKGROUND_FITS = [
    "full",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
] as const;

export type EditorBackgroundFit = typeof EDITOR_BACKGROUND_FITS[number];

export function normalizeOpacityValue(value: unknown): OpacityValue {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 1 as OpacityValue;
    }

    return Math.min(1, Math.max(0, value)) as OpacityValue;
}

export function isEditorBackgroundFit(value: unknown): value is EditorBackgroundFit {
    return typeof value === "string" && EDITOR_BACKGROUND_FITS.includes(value as EditorBackgroundFit);
}
