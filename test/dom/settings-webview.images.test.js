const assert = require("node:assert/strict");
const test = require("node:test");

const {
  click,
  createInitialState,
  expectElementDisabled,
  expectNoPostedMessage,
  expectPostedMessage,
  flushTimers,
  renderWebview,
  sendWindowMessage,
  setInputValue,
  setSelectValue
} = require("./settings-webview-helper");

test("settings webview posts editor background image actions", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');

  expectElementDisabled(document, "#editor-background-remove", true);
  expectElementDisabled(document, "#editor-background-download", true);

  click(document, "#editor-background-upload");
  expectPostedMessage(postedMessages, "select-editor-background-image");

  click(document, "#editor-background-random-neko");
  expectPostedMessage(postedMessages, "select-random-neko-editor-background-image");
  expectElementDisabled(document, "#editor-background-random-neko", true);
  assert.equal(document.getElementById("editor-background-preview").classList.contains("is-loading"), true);
  assert.match(document.querySelector("#editor-background-preview .image-preview-loading").textContent, /Fetching random neko image/);

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      editorBackground: {
        hasImage: true,
        originalName: "bg.png",
        sizeLabel: "12 KB",
        previewUri: "data:image/png;base64,AA=="
      }
    })
  });

  expectElementDisabled(document, "#editor-background-random-neko", false);
  assert.equal(document.getElementById("editor-background-preview").classList.contains("is-loading"), false);
  assert.equal(document.getElementById("editor-background-preview").classList.contains("has-image"), true);
  assert.match(document.getElementById("editor-background-preview").style.backgroundImage, /data:image\/png/);
  assert.match(document.getElementById("editor-background-file").textContent, /bg\.png \| 12 KB/);

  click(document, "#editor-background-remove");
  expectPostedMessage(postedMessages, "remove-editor-background-image");

  click(document, "#editor-background-download");
  expectPostedMessage(postedMessages, "download-editor-background-image");

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      editorBackground: {
        hasImage: false,
        missingImage: true,
        previewUri: ""
      }
    })
  });

  expectElementDisabled(document, "#editor-background-remove", false);
  expectElementDisabled(document, "#editor-background-download", true);
  assert.match(document.getElementById("editor-background-file").textContent, /Stored image is missing/);

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      editorBackground: {
        hasImage: false,
        missingImage: false,
        previewUri: ""
      }
    })
  });

  expectElementDisabled(document, "#editor-background-remove", true);
  expectElementDisabled(document, "#editor-background-download", true);
});

test("settings webview posts editor background opacity and fit updates", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#editor-background-opacity", "0.2");

  assert.equal(document.getElementById("editor-background-opacity-value").textContent, "20%");
  expectNoPostedMessage(postedMessages, "update-editor-background-opacity");

  await flushTimers();

  expectPostedMessage(postedMessages, "update-editor-background-opacity", {
    opacity: "0.2"
  });

  setSelectValue(window, "#editor-background-fit", "left");

  expectPostedMessage(postedMessages, "update-editor-background-fit", {
    fit: "left"
  });
});

test("settings webview posts empty editor logo actions", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');

  expectElementDisabled(document, "#empty-editor-logo-remove", true);
  expectElementDisabled(document, "#empty-editor-logo-download", true);

  click(document, "#empty-editor-logo-upload");
  expectPostedMessage(postedMessages, "select-empty-editor-logo-image");

  click(document, "#empty-editor-logo-random-neko");
  expectPostedMessage(postedMessages, "select-random-neko-empty-editor-logo-image");
  expectElementDisabled(document, "#empty-editor-logo-random-neko", true);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("is-loading"), true);
  assert.match(document.querySelector("#empty-editor-logo-preview .image-preview-loading").textContent, /Fetching random neko logo/);

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      emptyEditorLogo: {
        hasImage: true,
        originalName: "logo.png",
        sizeLabel: "8 KB",
        previewUri: "data:image/png;base64,BB=="
      }
    })
  });

  expectElementDisabled(document, "#empty-editor-logo-random-neko", false);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("is-loading"), false);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("has-image"), true);
  assert.match(document.getElementById("empty-editor-logo-preview").style.backgroundImage, /data:image\/png/);
  assert.match(document.getElementById("empty-editor-logo-file").textContent, /logo\.png \| 8 KB/);

  click(document, "#empty-editor-logo-remove");
  expectPostedMessage(postedMessages, "remove-empty-editor-logo-image");

  click(document, "#empty-editor-logo-download");
  expectPostedMessage(postedMessages, "download-empty-editor-logo-image");

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      emptyEditorLogo: {
        hasImage: false,
        missingImage: false,
        previewUri: ""
      }
    })
  });

  expectElementDisabled(document, "#empty-editor-logo-remove", true);
  expectElementDisabled(document, "#empty-editor-logo-download", true);
});

test("settings webview posts empty editor logo opacity updates", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#empty-editor-logo-opacity", "0.4");

  assert.equal(document.getElementById("empty-editor-logo-opacity-value").textContent, "40%");
  expectNoPostedMessage(postedMessages, "update-empty-editor-logo-opacity");

  await flushTimers();

  expectPostedMessage(postedMessages, "update-empty-editor-logo-opacity", {
    opacity: "0.4"
  });
});

test("settings webview applies state messages and clears loading indicators", async () => {
  const { document, window } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  click(document, "#editor-background-random-neko");
  click(document, "#empty-editor-logo-random-neko");

  assert.equal(document.getElementById("editor-background-preview").classList.contains("is-loading"), true);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("is-loading"), true);

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      editorBackground: {
        hasImage: true,
        originalName: "new-bg.png",
        sizeLabel: "14 KB",
        previewUri: "data:image/png;base64,CC=="
      },
      emptyEditorLogo: {
        hasImage: true,
        originalName: "new-logo.png",
        sizeLabel: "9 KB",
        previewUri: "data:image/png;base64,DD=="
      }
    })
  });

  assert.equal(document.getElementById("editor-background-preview").classList.contains("is-loading"), false);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("is-loading"), false);
  assert.match(document.getElementById("editor-background-file").textContent, /new-bg\.png \| 14 KB/);
  assert.match(document.getElementById("empty-editor-logo-file").textContent, /new-logo\.png \| 9 KB/);
});
