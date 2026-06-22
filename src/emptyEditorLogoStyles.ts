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

/**
 * Builds CSS rules for replacing the empty editor watermark logo.
 *
 * @param dataUri Image data URI.
 * @param opacity CSS opacity value.
 * @returns CSS rule block.
 */
export function createEmptyEditorLogoStyles(dataUri: string, opacity: number | string): string {
  const escapedDataUri = String(dataUri).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `
${EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS.join(",\n")} {
\tbackground-image: url("${escapedDataUri}") !important;
\tbackground-position: center !important;
\tbackground-size: contain !important;
\tbackground-repeat: no-repeat !important;
\topacity: ${opacity};
\tfilter: none !important;
}
`;
}
