const assert = require("node:assert/strict");
const vscode = require("vscode");

suite("Kawaii VS Code Color extension", () => {
  test("loads manifest contributions and registers the settings command", async () => {
    const extension = vscode.extensions.getExtension("ITEM-PIXEL.kawaii-vscode-color");

    assert.ok(extension, "Expected extension to be registered in the extension host.");
    assert.equal(extension.packageJSON.main, "./out/src/extension.js");
    assert.ok(
      extension.packageJSON.contributes.commands.some(
        (command) => command.command === "kawaii_synthwave.openSettings"
      ),
      "Expected the settings command contribution to exist."
    );
    assert.ok(
      extension.packageJSON.contributes.themes.some(
        (theme) => theme.label === "Dark Pink Kawaii"
      ),
      "Expected the dark theme contribution to exist."
    );

    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("kawaii_synthwave.openSettings"),
      "Expected the settings command to be registered after activation."
    );
  });

  test("opens the settings command without throwing", async () => {
    const extension = vscode.extensions.getExtension("ITEM-PIXEL.kawaii-vscode-color");

    assert.ok(extension, "Expected extension to be registered in the extension host.");
    await extension.activate();

    await assert.doesNotReject(() =>
      vscode.commands.executeCommand("kawaii_synthwave.openSettings")
    );
  });
});
