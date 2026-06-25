import { isRecord } from "../validation/guards";

export type OpacityValue = number & { readonly __brand: "OpacityValue" };

export const EFFECT_FEATURE_IDS = [
    "foundation",
    "editorBackground",
    "noPageLogo",
    "glow"
] as const;

export type EffectFeatureId = typeof EFFECT_FEATURE_IDS[number];

export interface EffectFeatureSettings {
    readonly foundation: boolean;
    readonly editorBackground: boolean;
    readonly noPageLogo: boolean;
    readonly glow: boolean;
}

export interface EffectFeatureCombination {
    readonly id: string;
    readonly features: EffectFeatureSettings;
}

export const DEFAULT_EFFECT_FEATURE_SETTINGS: EffectFeatureSettings = {
    foundation: true,
    editorBackground: true,
    noPageLogo: true,
    glow: true
};

export const EFFECT_ROOT_CLASS_BY_FEATURE: Record<EffectFeatureId, string> = {
    foundation: "kawaii-effect-foundation",
    editorBackground: "kawaii-effect-editor-background",
    noPageLogo: "kawaii-effect-no-page-logo",
    glow: "kawaii-effect-glow"
} as const;

export const EFFECT_FEATURE_ID_LABELS: Record<EffectFeatureId, string> = {
    foundation: "foundation",
    editorBackground: "editor-background",
    noPageLogo: "no-page-logo",
    glow: "glow"
} as const;

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

export function isEffectFeatureId(value: unknown): value is EffectFeatureId {
    return typeof value === "string" && EFFECT_FEATURE_IDS.includes(value as EffectFeatureId);
}

export function isEffectFeatureSettings(value: unknown): value is EffectFeatureSettings {
    return isRecord(value)
        && typeof value.foundation === "boolean"
        && typeof value.editorBackground === "boolean"
        && typeof value.noPageLogo === "boolean"
        && typeof value.glow === "boolean";
}

export function normalizeEffectFeatureSettings(value: unknown): EffectFeatureSettings {
    const candidate = isRecord(value) ? value : {};

    return {
        foundation: candidate.foundation !== false,
        editorBackground: candidate.editorBackground !== false,
        noPageLogo: candidate.noPageLogo !== false,
        glow: candidate.glow !== false
    };
}

export function getEnabledEffectFeatureIds(value: unknown): EffectFeatureId[] {
    const settings = normalizeEffectFeatureSettings(value);

    return EFFECT_FEATURE_IDS.filter((featureId) => settings[featureId]);
}

export function getEnabledEffectRootClasses(value: unknown): string[] {
    const settings = normalizeEffectFeatureSettings(value);

    if (!settings.foundation) {
        return [];
    }

    return EFFECT_FEATURE_IDS
        .filter((featureId) => settings[featureId])
        .map((featureId) => EFFECT_ROOT_CLASS_BY_FEATURE[featureId]);
}

export function getEffectFeatureCombinationId(value: unknown): string {
    const settings = normalizeEffectFeatureSettings(value);

    return EFFECT_FEATURE_IDS
        .map((featureId) => `${EFFECT_FEATURE_ID_LABELS[featureId]}-${settings[featureId] ? "on" : "off"}`)
        .join("__");
}

export function getEffectFeatureCombinationMatrix(): EffectFeatureCombination[] {
    const combinationCount = 2 ** EFFECT_FEATURE_IDS.length;

    return Array.from({ length: combinationCount }, (_value, combinationIndex) => {
        const features = EFFECT_FEATURE_IDS.reduce<Partial<Record<EffectFeatureId, boolean>>>(
            (settings, featureId, featureIndex) => ({
                ...settings,
                [featureId]: Boolean(combinationIndex & (1 << featureIndex))
            }),
            {}
        ) as EffectFeatureSettings;

        return {
            id: getEffectFeatureCombinationId(features),
            features
        };
    });
}
