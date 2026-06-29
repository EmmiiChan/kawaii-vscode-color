const test = require("node:test");
const assert = require("node:assert/strict");

const {
  click,
  expectPostedMessage,
  expectStatusText,
  expectVisiblePage,
  renderWebview
} = require("./settings-webview-helper");

test("settings webview posts sync and file action messages", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="sync-files"]');
  expectVisiblePage(document, "sync-files");

  click(document, "#save-vssync");
  expectPostedMessage(postedMessages, "save-settings-to-vssync");
  expectStatusText(document, /Saving settings to VS Code Sync state/);

  click(document, "#import-vssync");
  expectPostedMessage(postedMessages, "import-settings-from-vssync");
  expectStatusText(document, /Importing settings from VS Code Sync state/);

  click(document, "#export-settings");
  expectPostedMessage(postedMessages, "export-settings");
  expectStatusText(document, /Exporting settings/);

  click(document, "#import-settings");
  expectPostedMessage(postedMessages, "import-settings");
  expectStatusText(document, /Opening settings import/);
});

test("settings webview owns sync and file controls on Sync Files page", async () => {
  const { document } = await renderWebview();
  const syncFilesPage = document.getElementById("sync-files-page");
  const colorSettingsPage = document.getElementById("color-settings-page");

  for (const selector of [
    "#save-vssync",
    "#import-vssync",
    "#export-settings",
    "#import-settings"
  ]) {
    const element = document.querySelector(selector);

    assert.ok(element, `Expected ${selector} to exist`);
    assert.equal(syncFilesPage.contains(element), true, `Expected ${selector} to be owned by Sync / Files`);
    assert.equal(colorSettingsPage.contains(element), false, `Expected ${selector} to be outside Color Settings`);
  }
});
