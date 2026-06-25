import { KAWAII_THEME_VARIANTS, KAWAII_UI_ROOT_CLASS } from "./shared/models/theme";
import { EFFECT_ROOT_CLASS_BY_FEATURE } from "./shared/models/effects";

export interface EmptyEditorLogoFallbackVersionCase {
  readonly id: string;
  readonly selector: string;
}

export const EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES: readonly EmptyEditorLogoFallbackVersionCase[] = [
  {
    id: "legacy-editor-group-watermark",
    selector: ".monaco-workbench .part.editor > .content .editor-group-container > .editor-group-watermark .letterpress"
  },
  {
    id: "wrapped-editor-group-watermark",
    selector: ".monaco-workbench .part.editor > .content .editor-group-container > .editor-group-watermark-wrapper .editor-group-watermark .letterpress"
  }
];
export const EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS: readonly string[] = EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES.map((fallbackCase) => fallbackCase.selector);
export const EMPTY_EDITOR_LOGO_WRAPPER_SELECTORS: readonly string[] = KAWAII_THEME_VARIANTS.map((themeVariant) => (
  `.${KAWAII_UI_ROOT_CLASS}.${EFFECT_ROOT_CLASS_BY_FEATURE.noPageLogo}.${themeVariant.wrapperClass}`
));

/**
 * Builds CSS rules for replacing the empty editor watermark logo.
 *
 * @param imageSource CSS image URL or data URI.
 * @param opacity CSS opacity value.
 * @returns CSS rule block.
 */
export function createEmptyEditorLogoStyles(imageSource: string, opacity: number | string): string {
  const escapedImageSource = String(imageSource).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const scopedSelectors = EMPTY_EDITOR_LOGO_WRAPPER_SELECTORS.flatMap((wrapperSelector) => (
    EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS.map((selector) => `${wrapperSelector} ${selector}`)
  ));

  return `
${scopedSelectors.join(",\n")} {
\tbackground-image: url("${escapedImageSource}") !important;
\tbackground-position: center !important;
\tbackground-size: contain !important;
\tbackground-repeat: no-repeat !important;
\topacity: ${opacity};
\tfilter: none !important;
}
`;
}
