const assert = require("node:assert/strict");
const test = require("node:test");

const {
  click,
  expectInputValue,
  expectNoPostedMessage,
  expectPostedMessage,
  expectStatusText,
  expectVisiblePage,
  flushTimers,
  getPostedMessagesByType,
  renderWebview,
  setInputValue
} = require("./settings-webview-helper");

test("settings webview renders neon effect page without running real patch", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="neon-effect"]');

  expectVisiblePage(document, "neon-effect");
  assert.ok(document.getElementById("enable-neon"));
  assert.ok(document.getElementById("disable-neon"));
  assert.match(document.getElementById("neon-effect-page").textContent, /Potential side effects/);
  assert.match(document.getElementById("neon-effect-page").textContent, /modifies installed VS Code workbench files/);
  expectNoPostedMessage(postedMessages, "enable-neon");
  expectNoPostedMessage(postedMessages, "disable-neon");
});

test("settings webview posts home apply effects without running real patch", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, "#home-apply-effects");

  expectStatusText(document, /Applying effects/);
  assert.match(document.getElementById("neon-status").textContent, /Requesting effects apply/);
  expectPostedMessage(postedMessages, "apply-neon-customizations", {
    editorBackgroundOpacity: "0.12",
    editorBackgroundFit: "full",
    emptyEditorLogoOpacity: "0.75"
  });
});

test("settings webview posts color settings apply effects with dark image customizations", async () => {
  const { document, postedMessages } = await renderWebview({
    editorBackground: {
      opacity: 0.21,
      fit: "left",
      hasImage: true,
      originalName: "editor-background.png",
      sizeLabel: "1 KB",
      previewUri: "data:image/png;base64,AA=="
    },
    emptyEditorLogo: {
      opacity: 0.62,
      hasImage: true,
      originalName: "empty-editor-logo.png",
      sizeLabel: "1 KB",
      previewUri: "data:image/png;base64,BB=="
    }
  });

  click(document, '[data-page="color-settings"]');
  expectVisiblePage(document, "color-settings");
  expectInputValue(document, "#theme-variant", "dark");

  click(document, "#apply-effects");

  expectStatusText(document, /Applying effects/);
  assert.match(document.getElementById("neon-status").textContent, /Requesting effects apply/);
  expectPostedMessage(postedMessages, "apply-neon-customizations", {
    editorBackgroundOpacity: "0.21",
    editorBackgroundFit: "left",
    emptyEditorLogoOpacity: "0.62"
  });
});

test("settings webview posts color settings apply effects with light missing-image state", async () => {
  const { document, postedMessages } = await renderWebview({
    themeLabel: "Kawaii VS Code Color Light",
    activeThemeVariantId: "light",
    editorBackground: {
      opacity: 0.18,
      fit: "top-left",
      hasImage: false,
      missingImage: true,
      previewUri: ""
    },
    emptyEditorLogo: {
      opacity: 0.5,
      hasImage: false,
      missingImage: true,
      previewUri: ""
    }
  });

  click(document, '[data-page="color-settings"]');
  expectVisiblePage(document, "color-settings");
  expectInputValue(document, "#theme-variant", "light");
  assert.match(document.getElementById("editor-background-file").textContent, /Stored image is missing/);

  click(document, "#apply-effects");

  expectPostedMessage(postedMessages, "apply-neon-customizations", {
    editorBackgroundOpacity: "0.18",
    editorBackgroundFit: "top-left",
    emptyEditorLogoOpacity: "0.5"
  });
});

test("settings webview apply effects cancels pending image timers", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#editor-background-opacity", "0.2");
  setInputValue(window, "#empty-editor-logo-opacity", "0.4");
  click(document, "#apply-effects");

  expectPostedMessage(postedMessages, "apply-neon-customizations", {
    editorBackgroundOpacity: "0.2",
    editorBackgroundFit: "full",
    emptyEditorLogoOpacity: "0.4"
  });

  await flushTimers();

  assert.equal(getPostedMessagesByType(postedMessages, "update-editor-background-opacity").length, 0);
  assert.equal(getPostedMessagesByType(postedMessages, "update-empty-editor-logo-opacity").length, 0);
});
