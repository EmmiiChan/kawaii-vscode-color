const test = require("node:test");

const {
  click,
  expectPostedMessage,
  expectStatusText,
  renderWebview
} = require("./settings-webview-helper");

test("settings webview posts sync and file action messages", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');

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
