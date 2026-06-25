const assert = require("node:assert/strict");
const test = require("node:test");

const {
  click,
  countActiveNavItems,
  expectPostedMessage,
  expectVisiblePage,
  getLastPostedMessage,
  renderWebview
} = require("./settings-webview-helper");

function getButtonByText(document, selector, text) {
  const button = Array.from(document.querySelectorAll(selector)).find((item) =>
    item.textContent.trim().includes(text)
  );

  assert.ok(button, `Expected to find "${text}" in "${selector}"`);
  return button;
}

test("settings webview posts ready and can request effect actions", async () => {
  const { document, postedMessages } = await renderWebview();

  assert.equal(postedMessages[0].type, "ready");

  click(document, '[data-page="neon-effect"]');
  click(document, "#enable-neon");
  click(document, "#disable-neon");

  expectPostedMessage(postedMessages, "disable-neon");
  assert.ok(postedMessages.some((message) => message.type === "enable-neon"));
});

test("settings webview exposes app-specific navigation and help links", async () => {
  const { document } = await renderWebview();
  const navLabels = Array.from(document.querySelectorAll(".nav-button")).map((button) => button.textContent.trim());

  assert.deepEqual(navLabels, [
    "Home",
    "Color Settings",
    "Effects",
    "Image Customization",
    "Sync / Files",
    "Help"
  ]);

  click(document, '[data-page="help"]');

  expectVisiblePage(document, "help");
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

test("settings webview owns image controls on image customization page", async () => {
  const { document } = await renderWebview();
  const imagePage = document.getElementById("image-customization-page");
  const colorPage = document.getElementById("color-settings-page");

  for (const selector of [
    "#apply-effects",
    "#editor-background-preview",
    "#editor-background-upload",
    "#editor-background-random-neko",
    "#editor-background-remove",
    "#editor-background-download",
    "#editor-background-opacity",
    "#editor-background-fit",
    "#empty-editor-logo-preview",
    "#empty-editor-logo-upload",
    "#empty-editor-logo-random-neko",
    "#empty-editor-logo-remove",
    "#empty-editor-logo-download",
    "#empty-editor-logo-opacity"
  ]) {
    const element = document.querySelector(selector);

    assert.ok(element, `Expected ${selector} to exist`);
    assert.equal(imagePage.contains(element), true, `Expected ${selector} to be owned by Image Customization`);
    assert.equal(colorPage.contains(element), false, `Expected ${selector} to be outside Color Settings`);
  }
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
