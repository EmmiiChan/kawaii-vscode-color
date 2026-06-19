const EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES = [
  {
    id: "legacy-editor-group-watermark",
    selector: ".monaco-workbench .part.editor > .content .editor-group-container > .editor-group-watermark .letterpress"
  },
  {
    id: "wrapped-editor-group-watermark",
    selector: ".monaco-workbench .part.editor > .content .editor-group-container > .editor-group-watermark-wrapper .editor-group-watermark .letterpress"
  }
];
const EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS = EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES.map((fallbackCase) => fallbackCase.selector);

/**
 * Builds CSS rules for replacing the empty editor watermark logo.
 *
 * @param {string} dataUri - Image data URI.
 * @param {number | string} opacity - CSS opacity value.
 * @returns {string} CSS rule block.
 */
function createEmptyEditorLogoStyles(dataUri, opacity) {
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

module.exports = {
  EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES,
  EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS,
  createEmptyEditorLogoStyles
};
