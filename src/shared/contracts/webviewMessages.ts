import { isColorCustomizationKey, isHexColor, type ColorCustomizationKey, type HexColor } from "../models/color";
import {
    isEditorBackgroundFit,
    isEffectFeatureSettings,
    type EditorBackgroundFit,
    type EffectFeatureSettings,
    type OpacityValue
} from "../models/effects";
import { isThemeName, type ThemeName, type ThemeVariantId } from "../models/theme";
import { isRecord } from "../validation/guards";

type LegacyColorSection = "workbench" | "token";
type LegacyColorId = string | number;
export type EffectsStatusTone = "info" | "success" | "warning" | "error" | "busy";

export type WebviewToHostMessage =
    | { readonly type: "ready" }
    | { readonly type: "refresh" }
    | { readonly type: "enable-neon" }
    | { readonly type: "disable-neon" }
    | {
        readonly type: "apply-effects";
        readonly features: EffectFeatureSettings;
        readonly editorBackgroundFit: EditorBackgroundFit;
        readonly editorBackgroundOpacity: OpacityValue;
        readonly emptyEditorLogoOpacity: OpacityValue;
    }
    | {
        readonly type: "apply-neon-customizations";
        readonly editorBackgroundFit: EditorBackgroundFit;
        readonly editorBackgroundOpacity: OpacityValue;
        readonly emptyEditorLogoOpacity: OpacityValue;
    }
    | { readonly type: "change-theme-variant"; readonly themeName: ThemeName }
    | { readonly type: "change-theme-variant"; readonly themeVariantId: ThemeVariantId }
    | { readonly type: "update-color"; readonly key: ColorCustomizationKey; readonly value: HexColor }
    | {
        readonly type: "update-color";
        readonly section: LegacyColorSection;
        readonly id: LegacyColorId;
        readonly value: HexColor;
        readonly themeVariantId: ThemeVariantId;
    }
    | { readonly type: "reset-color"; readonly key: ColorCustomizationKey }
    | {
        readonly type: "reset-color";
        readonly section: LegacyColorSection;
        readonly id: LegacyColorId;
        readonly themeVariantId: ThemeVariantId;
    }
    | { readonly type: "reset-all"; readonly themeVariantId?: ThemeVariantId }
    | { readonly type: "export-settings" }
    | { readonly type: "import-settings"; readonly payload: unknown }
    | { readonly type: "save-settings-to-vssync" }
    | { readonly type: "import-settings-from-vssync" }
    | { readonly type: "select-editor-background-image" }
    | { readonly type: "remove-editor-background-image" }
    | { readonly type: "download-editor-background-image" }
    | { readonly type: "select-empty-editor-logo-image" }
    | { readonly type: "remove-empty-editor-logo-image" }
    | { readonly type: "download-empty-editor-logo-image" }
    | { readonly type: "select-random-neko-editor-background-image" }
    | { readonly type: "select-random-neko-empty-editor-logo-image" }
    | { readonly type: "update-editor-background-opacity"; readonly opacity: OpacityValue }
    | { readonly type: "update-empty-editor-logo-opacity"; readonly opacity: OpacityValue }
    | { readonly type: "update-editor-background-fit"; readonly fit: EditorBackgroundFit }
    | { readonly type: "update-effect-features"; readonly features: EffectFeatureSettings }
    | { readonly type: "update-application-settings"; readonly openNativeWelcomePage: boolean }
    | { readonly type: "open-link"; readonly href: string }
    | { readonly type: "open-link"; readonly url: string }
    | { readonly type: "e2e-set-test-fixtures"; readonly fixtures: unknown }
    | { readonly type: "e2e-apply-settings-bundle"; readonly bundle: unknown };

export type HostToWebviewMessage =
    | {
        readonly type: "effects-status";
        readonly tone: EffectsStatusTone;
        readonly title: string;
        readonly message: string;
        readonly dedupeKey?: string;
    }
    | { readonly type: "effects-pending"; readonly message?: string }
    | { readonly type: "error"; readonly message: string }
    | { readonly type: "neon-status"; readonly enabled?: boolean; readonly message?: string }
    | { readonly type: "state"; readonly state: unknown };

const PAYLOADLESS_MESSAGE_TYPES = new Set([
    "ready",
    "refresh",
    "enable-neon",
    "disable-neon",
    "reset-all",
    "export-settings",
    "save-settings-to-vssync",
    "import-settings-from-vssync",
    "select-editor-background-image",
    "remove-editor-background-image",
    "download-editor-background-image",
    "select-empty-editor-logo-image",
    "remove-empty-editor-logo-image",
    "download-empty-editor-logo-image",
    "select-random-neko-editor-background-image",
    "select-random-neko-empty-editor-logo-image"
]);

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
    if (!isRecord(value) || typeof value.type !== "string") {
        return false;
    }

    if (PAYLOADLESS_MESSAGE_TYPES.has(value.type)) {
        return true;
    }

    switch (value.type) {
        case "apply-effects":
            return hasFiniteNumber(value.editorBackgroundOpacity)
                && isEditorBackgroundFit(value.editorBackgroundFit)
                && hasFiniteNumber(value.emptyEditorLogoOpacity)
                && isEffectFeatureSettings(value.features);
        case "apply-neon-customizations":
            return hasFiniteNumber(value.editorBackgroundOpacity)
                && isEditorBackgroundFit(value.editorBackgroundFit)
                && hasFiniteNumber(value.emptyEditorLogoOpacity);
        case "change-theme-variant":
            return isThemeName(value.themeName) || isThemeVariantId(value.themeVariantId);
        case "update-color":
            return (
                isColorCustomizationKey(value.key)
                && isHexColor(value.value)
            ) || (
                isLegacyColorSection(value.section)
                && isLegacyColorId(value.id)
                && isHexColor(value.value)
                && isThemeVariantId(value.themeVariantId)
            );
        case "reset-color":
            return isColorCustomizationKey(value.key) || (
                isLegacyColorSection(value.section)
                && isLegacyColorId(value.id)
                && isThemeVariantId(value.themeVariantId)
            );
        case "import-settings":
            return Object.prototype.hasOwnProperty.call(value, "payload");
        case "update-editor-background-opacity":
        case "update-empty-editor-logo-opacity":
            return typeof value.opacity === "number" && Number.isFinite(value.opacity);
        case "update-editor-background-fit":
            return isEditorBackgroundFit(value.fit);
        case "update-effect-features":
            return isEffectFeatureSettings(value.features);
        case "update-application-settings":
            return typeof value.openNativeWelcomePage === "boolean";
        case "open-link":
            return typeof value.href === "string" || typeof value.url === "string";
        case "e2e-set-test-fixtures":
            return Object.prototype.hasOwnProperty.call(value, "fixtures");
        case "e2e-apply-settings-bundle":
            return Object.prototype.hasOwnProperty.call(value, "bundle");
        default:
            return false;
    }
}

export function isHostToWebviewMessage(value: unknown): value is HostToWebviewMessage {
    if (!isRecord(value) || typeof value.type !== "string") {
        return false;
    }

    switch (value.type) {
        case "effects-status":
            return isEffectsStatusTone(value.tone)
                && typeof value.title === "string"
                && typeof value.message === "string"
                && (
                    value.dedupeKey === undefined
                    || typeof value.dedupeKey === "string"
                );
        case "effects-pending":
            return value.message === undefined || typeof value.message === "string";
        case "error":
            return typeof value.message === "string";
        case "neon-status":
            return (
                value.enabled === undefined
                || typeof value.enabled === "boolean"
            ) && (
                value.message === undefined
                || typeof value.message === "string"
            );
        case "state":
            return Object.prototype.hasOwnProperty.call(value, "state");
        default:
            return false;
    }
}

function isEffectsStatusTone(value: unknown): value is EffectsStatusTone {
    return value === "info"
        || value === "success"
        || value === "warning"
        || value === "error"
        || value === "busy";
}

function isThemeVariantId(value: unknown): value is ThemeVariantId {
    return value === "dark" || value === "light";
}

function isLegacyColorSection(value: unknown): value is LegacyColorSection {
    return value === "workbench" || value === "token";
}

function isLegacyColorId(value: unknown): value is LegacyColorId {
    return typeof value === "string" || typeof value === "number";
}

function hasFiniteNumber(value: unknown): value is OpacityValue {
    return typeof value === "number" && Number.isFinite(value);
}
