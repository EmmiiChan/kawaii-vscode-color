import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};

const {
  EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES,
  EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS,
  EMPTY_EDITOR_LOGO_WRAPPER_SELECTORS,
  createEmptyEditorLogoStyles
} = requireOut<typeof import("../../src/emptyEditorLogoStyles")>("emptyEditorLogoStyles");

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("createEmptyEditorLogoStyles includes old and wrapper watermark selectors", () => {
  const css = createEmptyEditorLogoStyles("data:image/png;base64,abc123", 0.42);

  for (const wrapperSelector of EMPTY_EDITOR_LOGO_WRAPPER_SELECTORS) {
    for (const selector of EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS) {
      assert.match(css, new RegExp(escapeRegExp(`${wrapperSelector} ${selector}`)));
    }
  }

  assert.doesNotMatch(css, /\.kawaii-vscode-colors-ui\s+\.monaco-workbench/);
});

test("empty editor logo selectors match old and wrapper VS Code watermark markup", () => {
  const dom = new JSDOM(`
    <div class="monaco-workbench">
      <div class="part editor">
        <div class="content">
          <div class="editor-group-container">
            <div class="editor-group-watermark">
              <div class="letterpress" id="old-watermark"></div>
            </div>
          </div>
          <div class="editor-group-container">
            <div class="editor-group-watermark-wrapper">
              <div class="editor-group-watermark">
                <div class="letterpress" id="wrapped-watermark"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
  const selector = EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS.join(", ");
  const matches = Array.from(dom.window.document.querySelectorAll(selector)).map((node) => node.id);

  assert.deepEqual(matches, ["old-watermark", "wrapped-watermark"]);
});

test("empty editor logo version fallbacks remain individually active", () => {
  const dom = new JSDOM(`
    <div class="monaco-workbench">
      <div class="part editor">
        <div class="content">
          <div class="editor-group-container">
            <div class="editor-group-watermark">
              <div class="letterpress" data-fallback-id="legacy-editor-group-watermark"></div>
            </div>
          </div>
          <div class="editor-group-container">
            <div class="editor-group-watermark-wrapper">
              <div class="editor-group-watermark">
                <div class="letterpress" data-fallback-id="wrapped-editor-group-watermark"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  for (const fallbackCase of EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES) {
    const match = dom.window.document.querySelector(fallbackCase.selector);

    assert.ok(match, `Expected fallback selector to match: ${fallbackCase.id}`);
    assert.equal(match.getAttribute("data-fallback-id"), fallbackCase.id);
  }
});

test("createEmptyEditorLogoStyles applies data URI and opacity", () => {
  const dataUri = "data:image/png;base64,abc123";
  const css = createEmptyEditorLogoStyles(dataUri, 0.75);

  assert.match(css, /background-image: url\("data:image\/png;base64,abc123"\) !important;/);
  assert.match(css, /opacity: 0\.75;/);
  assert.match(css, /filter: none !important;/);
});

test("empty editor logo styles accept relative workbench asset URLs", () => {
  const css = createEmptyEditorLogoStyles("kawaii-vscode-colors-empty-editor-logo-image.svg?v=fixed", 0.5);

  assert.match(css, /background-image: url\("kawaii-vscode-colors-empty-editor-logo-image\.svg\?v=fixed"\) !important;/);
  assert.match(css, /opacity: 0\.5;/);
});

function escapeRegExp(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
