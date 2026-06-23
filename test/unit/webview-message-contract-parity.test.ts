import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  isSettingsHostMessage
} = requireOut<typeof import("../../src/extensionHost/controllers/SettingsMessageController")>(
  "extensionHost",
  "controllers",
  "SettingsMessageController"
);
const {
  isWebviewToHostMessage
} = requireOut<typeof import("../../src/shared/contracts/webviewMessages")>(
  "shared",
  "contracts",
  "webviewMessages"
);

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("shared webview guard accepts real inline settings webview payloads handled by the host", () => {
  const realInlineMessages = [
    { type: "open-link", url: "https://github.com/EmmiiChan/kawaii-vscode-color" },
    { type: "change-theme-variant", themeVariantId: "light" },
    { type: "update-color", section: "workbench", id: "editor.background", value: "#fffafd", themeVariantId: "dark" },
    { type: "reset-color", section: "token", id: 0, themeVariantId: "dark" },
    {
      type: "apply-neon-customizations",
      editorBackgroundOpacity: 0.2,
      editorBackgroundFit: "left",
      emptyEditorLogoOpacity: 0.7
    }
  ];

  for (const message of realInlineMessages) {
    assert.equal(isSettingsHostMessage(message), true, `${message.type} should be accepted by the host guard`);
    assert.equal(isWebviewToHostMessage(message), true, `${message.type} should be accepted by the shared guard`);
  }
});

test("shared webview guard rejects malformed legacy settings payloads", () => {
  const malformedMessages = [
    { type: "open-link", url: 123 },
    { type: "change-theme-variant", themeVariantId: "unknown" },
    { type: "update-color", section: "workbench", id: "editor.background", themeVariantId: "dark" },
    { type: "reset-color", section: "token", id: 0 },
    {
      type: "apply-neon-customizations",
      editorBackgroundOpacity: 0.2,
      editorBackgroundFit: "bad-fit",
      emptyEditorLogoOpacity: 0.7
    }
  ];

  for (const message of malformedMessages) {
    assert.equal(isWebviewToHostMessage(message), false, `${message.type} should reject malformed payload`);
  }
});
