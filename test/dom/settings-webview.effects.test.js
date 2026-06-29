const assert = require("node:assert/strict");
const test = require("node:test");

const {
  click,
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
  assert.match(document.querySelector('[data-page="neon-effect"]').textContent, /Effects/);
  assert.ok(document.getElementById("enable-neon"));
  assert.ok(document.getElementById("disable-neon"));
  assert.equal(document.getElementById("effect-feature-foundation").checked, true);
  assert.equal(document.getElementById("effect-feature-editor-background").checked, true);
  assert.equal(document.getElementById("effect-feature-no-page-logo").checked, true);
  assert.equal(document.getElementById("effect-feature-glow").checked, true);
  assert.match(document.getElementById("neon-effect-page").textContent, /Potential side effects/);
  assert.match(document.getElementById("neon-effect-page").textContent, /modifies installed VS Code workbench files/);
  expectNoPostedMessage(postedMessages, "enable-neon");
  expectNoPostedMessage(postedMessages, "disable-neon");
});

test("settings webview updates effect feature switches before apply", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="neon-effect"]');
  click(document, "#effect-feature-glow");

  assert.equal(document.getElementById("effect-feature-glow").checked, false);
  expectPostedMessage(postedMessages, "update-effect-features", {
    features: {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: false
    }
  });
});

test("settings webview posts home apply effects without running real patch", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, "#home-apply-effects");

  expectStatusText(document, /Applying effects/);
  assert.match(document.getElementById("neon-status").textContent, /Requesting effects apply/);
  expectPostedMessage(postedMessages, "apply-effects", {
    editorBackgroundOpacity: "0.12",
    editorBackgroundFit: "full",
    emptyEditorLogoOpacity: "0.75",
    features: {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: true
    }
  });
});

test("settings webview posts image customization apply effects with dark image customizations", async () => {
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

  click(document, '[data-page="image-customization"]');
  expectVisiblePage(document, "image-customization");
  assert.equal(document.getElementById("image-customization-page").contains(document.getElementById("apply-effects")), true);
  assert.equal(document.getElementById("color-settings-page").contains(document.getElementById("apply-effects")), false);

  click(document, "#apply-effects");

  expectStatusText(document, /Applying effects/);
  assert.match(document.getElementById("neon-status").textContent, /Requesting effects apply/);
  expectPostedMessage(postedMessages, "apply-effects", {
    editorBackgroundOpacity: "0.21",
    editorBackgroundFit: "left",
    emptyEditorLogoOpacity: "0.62",
    features: {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: true
    }
  });
});

test("settings webview posts image customization apply effects with light missing-image state", async () => {
  const { document, postedMessages } = await renderWebview({
    themeLabel: "Light Pink-Pastel Kawaii",
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

  click(document, '[data-page="image-customization"]');
  expectVisiblePage(document, "image-customization");
  assert.match(document.getElementById("editor-background-file").textContent, /Stored image is missing/);

  click(document, "#apply-effects");

  expectPostedMessage(postedMessages, "apply-effects", {
    editorBackgroundOpacity: "0.18",
    editorBackgroundFit: "top-left",
    emptyEditorLogoOpacity: "0.5",
    features: {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: true
    }
  });
});

test("settings webview apply effects cancels pending image timers", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="image-customization"]');
  setInputValue(window, "#editor-background-opacity", "0.2");
  setInputValue(window, "#empty-editor-logo-opacity", "0.4");
  click(document, "#apply-effects");

  expectPostedMessage(postedMessages, "apply-effects", {
    editorBackgroundOpacity: "0.2",
    editorBackgroundFit: "full",
    emptyEditorLogoOpacity: "0.4",
    features: {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: true
    }
  });

  await flushTimers();

  assert.equal(getPostedMessagesByType(postedMessages, "update-editor-background-opacity").length, 0);
  assert.equal(getPostedMessagesByType(postedMessages, "update-empty-editor-logo-opacity").length, 0);
});
