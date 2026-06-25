const assert = require("node:assert/strict");
const test = require("node:test");

const { createSettingsWebviewHtml } = require("../../out/src/settingsWebview");
const {
  click,
  createInitialState,
  renderWebview,
  sendWindowMessage
} = require("./settings-webview-helper");

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

test("settings webview handles structured effects status messages with dedupe keys", async () => {
  const { document, window } = await renderWebview();

  click(document, '[data-page="neon-effect"]');
  sendWindowMessage(window, {
    type: "effects-status",
    tone: "busy",
    title: "Applying Effects",
    message: "Cleaning previous modifications",
    dedupeKey: "effects:apply"
  });
  sendWindowMessage(window, {
    type: "effects-status",
    tone: "busy",
    title: "Applying Effects",
    message: "Cleaning previous modifications",
    dedupeKey: "effects:apply"
  });

  assert.equal(document.getElementById("neon-status").textContent, "Applying Effects: Cleaning previous modifications");
  assert.equal(document.getElementById("neon-status").dataset.tone, "busy");
  assert.equal(document.getElementById("status").textContent, "Cleaning previous modifications");
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

test("settings webview exposes E2E postMessage hook only when explicitly enabled", async () => {
  const defaultRendered = await renderWebview();
  const enabledRendered = await renderWebview({ e2eTestApiEnabled: true });

  assert.equal(defaultRendered.window.kawaiiVsCodeColorE2EPostMessage, undefined);
  assert.equal(typeof enabledRendered.window.kawaiiVsCodeColorE2EPostMessage, "function");
});
