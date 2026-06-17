const assert = require("node:assert/strict");
const test = require("node:test");

const { createSettingsWebviewHtml } = require("../../src/settingsWebview");
const {
  assertNoPostedMessage,
  click,
  countActiveNavItems,
  createInitialState,
  flushTimers,
  getLastPostedMessage,
  getPostedMessagesByType,
  renderWebview,
  sendWindowMessage,
  setInputValue,
  setSelectValue
} = require("./settings-webview-helper");

function getButtonByText(document, selector, text) {
  const button = Array.from(document.querySelectorAll(selector)).find((item) =>
    item.textContent.trim().includes(text)
  );

  assert.ok(button, `Expected to find "${text}" in "${selector}"`);
  return button;
}

function getColorRowByLabel(document, label) {
  const row = Array.from(document.querySelectorAll("#content .row")).find((item) => {
    const rowLabel = item.querySelector(".label");
    return rowLabel && rowLabel.textContent.trim() === label;
  });

  assert.ok(row, `Expected to find color row "${label}"`);
  return row;
}

function setElementInputValue(window, input, value) {
  input.value = value;
  input.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
}

test("settings webview posts ready and can request Neon Effect actions", async () => {
  const { document, postedMessages } = await renderWebview();

  assert.equal(postedMessages[0].type, "ready");

  document.querySelector('[data-page="neon-effect"]').click();
  document.getElementById("enable-neon").click();
  document.getElementById("disable-neon").click();

  assert.ok(postedMessages.some((message) => message.type === "enable-neon"));
  assert.ok(postedMessages.some((message) => message.type === "disable-neon"));
});

test("settings webview exposes app-specific navigation and help links", async () => {
  const { document } = await renderWebview();
  const navLabels = Array.from(document.querySelectorAll(".nav-button")).map((button) => button.textContent.trim());

  assert.deepEqual(navLabels, [
    "Home",
    "Color Settings",
    "Neon Effect",
    "Image Customization",
    "Sync / Files",
    "Help"
  ]);

  document.querySelector('[data-page="help"]').click();

  assert.equal(document.getElementById("help-page").classList.contains("hidden"), false);
  assert.match(document.getElementById("help-page").textContent, /Repository/);
  assert.match(document.getElementById("help-page").textContent, /Issues/);
  assert.match(document.getElementById("help-page").textContent, /ITEM-PIXEL/);
});

test("settings webview toggles each app page and keeps one active nav item", async () => {
  const { document } = await renderWebview();
  const pageIds = ["home", "color-settings", "neon-effect", "image-customization", "sync-files", "help"];

  assert.equal(document.querySelector(".nav-group").textContent.trim(), "Settings");
  assert.equal(document.querySelectorAll(".nav-group.active").length, 0);

  pageIds.forEach((pageId) => {
    click(document, `[data-page="${pageId}"]`);

    pageIds.forEach((candidatePageId) => {
      assert.equal(
        document.getElementById(`${candidatePageId}-page`).classList.contains("hidden"),
        candidatePageId !== pageId,
        `${candidatePageId} visibility should match active page ${pageId}`
      );
    });

    assert.equal(countActiveNavItems(document), 1);
    assert.equal(document.querySelector(".nav-button.active").dataset.page, pageId);
  });
});

test("settings webview renders home and help metadata links", async () => {
  const { document, postedMessages } = await renderWebview();

  assert.match(document.getElementById("documentation-links").textContent, /Repository/);
  assert.match(document.getElementById("documentation-links").textContent, /VS Code Theme Color/);

  click(document, '[data-page="help"]');

  assert.match(document.getElementById("project-links").textContent, /Repository/);
  assert.match(document.getElementById("project-links").textContent, /Issues/);
  assert.match(document.getElementById("project-links").textContent, /Homepage/);
  assert.match(document.getElementById("project-links").textContent, /Publisher/);

  getButtonByText(document, "#project-links .link-button", "Repository").click();

  const message = getLastPostedMessage(postedMessages, "open-link");
  assert.equal(message.type, "open-link");
  assert.equal(message.url, "https://github.com/EmmiiChan/kawaii-vscode-color");
});

test("settings webview renders neon effect page without running real patch", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="neon-effect"]');

  assert.equal(document.getElementById("neon-effect-page").classList.contains("hidden"), false);
  assert.ok(document.getElementById("enable-neon"));
  assert.ok(document.getElementById("disable-neon"));
  assert.match(document.getElementById("neon-effect-page").textContent, /Potential side effects/);
  assert.match(document.getElementById("neon-effect-page").textContent, /modifies installed VS Code workbench files/);
  assert.equal(postedMessages.some((message) => message.type === "enable-neon"), false);
  assert.equal(postedMessages.some((message) => message.type === "disable-neon"), false);
});

test("settings webview posts home apply effects without running real patch", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, "#home-apply-effects");

  assert.match(document.getElementById("status").textContent, /Applying effects/);
  assert.match(document.getElementById("neon-status").textContent, /Requesting effects apply/);
  const message = getLastPostedMessage(postedMessages, "apply-neon-customizations");
  assert.equal(message.type, "apply-neon-customizations");
  assert.equal(message.editorBackgroundOpacity, "0.12");
  assert.equal(message.editorBackgroundFit, "full");
  assert.equal(message.emptyEditorLogoOpacity, "0.75");
});

test("settings webview posts sync and file action messages", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');

  click(document, "#save-vssync");
  assert.equal(getLastPostedMessage(postedMessages, "save-settings-to-vssync").type, "save-settings-to-vssync");
  assert.match(document.getElementById("status").textContent, /Saving settings to VS Code Sync state/);

  click(document, "#import-vssync");
  assert.equal(getLastPostedMessage(postedMessages, "import-settings-from-vssync").type, "import-settings-from-vssync");
  assert.match(document.getElementById("status").textContent, /Importing settings from VS Code Sync state/);

  click(document, "#export-settings");
  assert.equal(getLastPostedMessage(postedMessages, "export-settings").type, "export-settings");
  assert.match(document.getElementById("status").textContent, /Exporting settings/);

  click(document, "#import-settings");
  assert.equal(getLastPostedMessage(postedMessages, "import-settings").type, "import-settings");
  assert.match(document.getElementById("status").textContent, /Opening settings import/);
});

test("settings webview posts editor background image actions", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');

  assert.equal(document.getElementById("editor-background-remove").disabled, true);
  assert.equal(document.getElementById("editor-background-download").disabled, true);

  click(document, "#editor-background-upload");
  assert.equal(getLastPostedMessage(postedMessages, "select-editor-background-image").type, "select-editor-background-image");

  click(document, "#editor-background-random-neko");
  assert.equal(
    getLastPostedMessage(postedMessages, "select-random-neko-editor-background-image").type,
    "select-random-neko-editor-background-image"
  );
  assert.equal(document.getElementById("editor-background-random-neko").disabled, true);
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

  assert.equal(document.getElementById("editor-background-random-neko").disabled, false);
  assert.equal(document.getElementById("editor-background-preview").classList.contains("is-loading"), false);
  assert.equal(document.getElementById("editor-background-preview").classList.contains("has-image"), true);
  assert.match(document.getElementById("editor-background-preview").style.backgroundImage, /data:image\/png/);
  assert.match(document.getElementById("editor-background-file").textContent, /bg\.png \| 12 KB/);

  click(document, "#editor-background-remove");
  assert.equal(getLastPostedMessage(postedMessages, "remove-editor-background-image").type, "remove-editor-background-image");

  click(document, "#editor-background-download");
  assert.equal(getLastPostedMessage(postedMessages, "download-editor-background-image").type, "download-editor-background-image");

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

  assert.equal(document.getElementById("editor-background-remove").disabled, false);
  assert.equal(document.getElementById("editor-background-download").disabled, true);
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

  assert.equal(document.getElementById("editor-background-remove").disabled, true);
  assert.equal(document.getElementById("editor-background-download").disabled, true);
});

test("settings webview posts editor background opacity and fit updates", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#editor-background-opacity", "0.2");

  assert.equal(document.getElementById("editor-background-opacity-value").textContent, "20%");
  assertNoPostedMessage(postedMessages, "update-editor-background-opacity");

  await flushTimers();

  const opacityMessage = getLastPostedMessage(postedMessages, "update-editor-background-opacity");
  assert.equal(opacityMessage.type, "update-editor-background-opacity");
  assert.equal(opacityMessage.opacity, "0.2");

  setSelectValue(window, "#editor-background-fit", "left-half");

  const fitMessage = getLastPostedMessage(postedMessages, "update-editor-background-fit");
  assert.equal(fitMessage.type, "update-editor-background-fit");
  assert.equal(fitMessage.fit, "left-half");
});

test("settings webview posts empty editor logo actions", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');

  assert.equal(document.getElementById("empty-editor-logo-remove").disabled, true);
  assert.equal(document.getElementById("empty-editor-logo-download").disabled, true);

  click(document, "#empty-editor-logo-upload");
  assert.equal(getLastPostedMessage(postedMessages, "select-empty-editor-logo-image").type, "select-empty-editor-logo-image");

  click(document, "#empty-editor-logo-random-neko");
  assert.equal(
    getLastPostedMessage(postedMessages, "select-random-neko-empty-editor-logo-image").type,
    "select-random-neko-empty-editor-logo-image"
  );
  assert.equal(document.getElementById("empty-editor-logo-random-neko").disabled, true);
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

  assert.equal(document.getElementById("empty-editor-logo-random-neko").disabled, false);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("is-loading"), false);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("has-image"), true);
  assert.match(document.getElementById("empty-editor-logo-preview").style.backgroundImage, /data:image\/png/);
  assert.match(document.getElementById("empty-editor-logo-file").textContent, /logo\.png \| 8 KB/);

  click(document, "#empty-editor-logo-remove");
  assert.equal(getLastPostedMessage(postedMessages, "remove-empty-editor-logo-image").type, "remove-empty-editor-logo-image");

  click(document, "#empty-editor-logo-download");
  assert.equal(getLastPostedMessage(postedMessages, "download-empty-editor-logo-image").type, "download-empty-editor-logo-image");

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

  assert.equal(document.getElementById("empty-editor-logo-remove").disabled, true);
  assert.equal(document.getElementById("empty-editor-logo-download").disabled, true);
});

test("settings webview posts empty editor logo opacity updates", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#empty-editor-logo-opacity", "0.4");

  assert.equal(document.getElementById("empty-editor-logo-opacity-value").textContent, "40%");
  assertNoPostedMessage(postedMessages, "update-empty-editor-logo-opacity");

  await flushTimers();

  const message = getLastPostedMessage(postedMessages, "update-empty-editor-logo-opacity");
  assert.equal(message.type, "update-empty-editor-logo-opacity");
  assert.equal(message.opacity, "0.4");
});

test("settings webview apply effects cancels pending image timers", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#editor-background-opacity", "0.2");
  setInputValue(window, "#empty-editor-logo-opacity", "0.4");
  click(document, "#apply-effects");

  const applyMessage = getLastPostedMessage(postedMessages, "apply-neon-customizations");
  assert.equal(applyMessage.editorBackgroundOpacity, "0.2");
  assert.equal(applyMessage.editorBackgroundFit, "full");
  assert.equal(applyMessage.emptyEditorLogoOpacity, "0.4");

  await flushTimers();

  assert.equal(getPostedMessagesByType(postedMessages, "update-editor-background-opacity").length, 0);
  assert.equal(getPostedMessagesByType(postedMessages, "update-empty-editor-logo-opacity").length, 0);
});

test("settings webview filters color rows and shows empty state", async () => {
  const { document, window } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#search", "editor.background");

  assert.ok(getColorRowByLabel(document, "editor.background"));
  assert.doesNotMatch(document.getElementById("content").textContent, /activityBar\.background/);

  setInputValue(window, "#search", "not-a-real-color-entry");

  assert.match(document.getElementById("content").textContent, /No matching colors/);
});

test("settings webview switches workbench and syntax sections", async () => {
  const { document } = await renderWebview();

  click(document, '[data-page="color-settings"]');

  assert.ok(getColorRowByLabel(document, "editor.background"));
  assert.ok(getColorRowByLabel(document, "activityBar.background"));

  click(document, '[data-section="token"]');

  assert.match(document.getElementById("content").textContent, /Syntax Tokens/);
  assert.ok(getColorRowByLabel(document, "Keyword"));
  assert.ok(getColorRowByLabel(document, "String"));
});

test("settings webview validates hex input before posting color updates", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  postedMessages.length = 0;

  const row = getColorRowByLabel(document, "editor.background");
  const input = row.querySelector(".hex");

  setElementInputValue(window, input, "not-a-color");
  await flushTimers();

  assert.equal(input.classList.contains("invalid"), true);
  assert.match(document.getElementById("status").textContent, /Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA\./);
  assertNoPostedMessage(postedMessages, "update-color");

  setElementInputValue(window, input, "#123456");
  await flushTimers();

  const message = getLastPostedMessage(postedMessages, "update-color");
  assert.equal(input.classList.contains("invalid"), false);
  assert.equal(message.section, "workbench");
  assert.equal(message.id, "editor.background");
  assert.equal(message.value, "#123456");
  assert.equal(message.themeVariantId, "dark");
});

test("settings webview posts color picker updates and preserves alpha", async () => {
  const { document, window, postedMessages } = await renderWebview({
    workbenchColors: [
      {
        id: "editor.background",
        label: "editor.background",
        group: "Editor",
        defaultValue: "#112233",
        value: "#112233cc",
        description: "Editor background",
        customized: true
      }
    ]
  });

  click(document, '[data-page="color-settings"]');
  postedMessages.length = 0;

  const row = getColorRowByLabel(document, "editor.background");
  const picker = row.querySelector(".picker");
  const input = row.querySelector(".hex");

  picker.value = "#445566";
  picker.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: "insertText", data: "#445566" }));

  assert.equal(input.value, "#445566cc");

  await flushTimers();

  const message = getLastPostedMessage(postedMessages, "update-color");
  assert.equal(message.value, "#445566cc");
  assert.equal(message.id, "editor.background");
});

test("settings webview posts reset color, refresh, and reset all", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  postedMessages.length = 0;

  const row = getColorRowByLabel(document, "activityBar.background");
  const reset = row.querySelector(".reset");

  assert.equal(reset.disabled, false);
  reset.click();

  const resetColorMessage = getLastPostedMessage(postedMessages, "reset-color");
  assert.equal(resetColorMessage.section, "workbench");
  assert.equal(resetColorMessage.id, "activityBar.background");
  assert.equal(resetColorMessage.themeVariantId, "dark");

  click(document, "#refresh");
  assert.equal(getLastPostedMessage(postedMessages, "refresh").type, "refresh");
  assert.match(document.getElementById("status").textContent, /Refreshing/);

  click(document, "#reset-all");

  const resetAllMessage = getLastPostedMessage(postedMessages, "reset-all");
  assert.equal(resetAllMessage.type, "reset-all");
  assert.equal(resetAllMessage.themeVariantId, "dark");
});

test("settings webview posts theme variant changes", async () => {
  const { window, postedMessages } = await renderWebview();

  setSelectValue(window, "#theme-variant", "light");

  const message = getLastPostedMessage(postedMessages, "change-theme-variant");
  assert.equal(message.type, "change-theme-variant");
  assert.equal(message.themeVariantId, "light");
});

test("settings webview clears pending color updates before sync", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  postedMessages.length = 0;

  const row = getColorRowByLabel(document, "editor.background");
  setElementInputValue(window, row.querySelector(".hex"), "#654321");
  click(document, "#save-vssync");

  await flushTimers();

  assert.equal(getLastPostedMessage(postedMessages, "save-settings-to-vssync").type, "save-settings-to-vssync");
  assertNoPostedMessage(postedMessages, "update-color");
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

test("settings webview shows effects pending warnings", async () => {
  const { document, window } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  sendWindowMessage(window, { type: "effects-pending", message: "Pending test message" });

  assert.equal(document.getElementById("effects-warning").classList.contains("hidden"), false);
  assert.equal(document.getElementById("effects-warning").textContent, "Pending test message");
  assert.equal(document.getElementById("status").textContent, "Pending test message");
});

test("settings webview handles neon status messages", async () => {
  const { document, window } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  sendWindowMessage(window, { type: "effects-pending", message: "Pending test message" });
  sendWindowMessage(window, { type: "neon-status", message: "Neon complete" });

  assert.equal(document.getElementById("effects-warning").classList.contains("hidden"), true);
  assert.equal(document.getElementById("effects-warning").textContent, "");
  assert.equal(document.getElementById("neon-status").textContent, "Neon complete");
});

test("settings webview handles error messages and clears loading", async () => {
  const { document, window } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  click(document, "#editor-background-random-neko");
  click(document, "#empty-editor-logo-random-neko");

  sendWindowMessage(window, { type: "error", message: "Failure test" });

  assert.equal(document.getElementById("status").textContent, "Failure test");
  assert.equal(document.getElementById("neon-status").textContent, "Failure test");
  assert.equal(document.getElementById("editor-background-preview").classList.contains("is-loading"), false);
  assert.equal(document.getElementById("empty-editor-logo-preview").classList.contains("is-loading"), false);
  assert.equal(document.getElementById("editor-background-random-neko").disabled, false);
  assert.equal(document.getElementById("empty-editor-logo-random-neko").disabled, false);
});

test("settings webview styles consume editor-provided vscode tokens instead of a standalone palette", () => {
  const html = createSettingsWebviewHtml(
    {
      cspSource: "vscode-resource:"
    },
    createInitialState(),
    "fixed-nonce"
  );

  assert.match(html, /var\(--vscode-editor-background\)/);
  assert.match(html, /var\(--vscode-foreground\)/);
  assert.match(html, /var\(--vscode-editorWidget-border\)/);
  assert.doesNotMatch(html, /--kawaii-ui-/);
});
