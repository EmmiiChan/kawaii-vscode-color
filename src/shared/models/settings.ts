import type { HexColor, ColorCustomizationKey } from "./color";
import type { OpacityValue, EditorBackgroundFit } from "./effects";
import type { ThemeName } from "./theme";

export interface ColorCustomization {
    readonly key: ColorCustomizationKey;
    readonly value: HexColor;
}

export interface EffectsState {
    readonly editorBackgroundOpacity: OpacityValue;
    readonly emptyEditorLogoOpacity: OpacityValue;
    readonly editorBackgroundFit: EditorBackgroundFit;
}

export interface SettingsState {
    readonly activeThemeName: ThemeName;
    readonly effects: EffectsState;
}
