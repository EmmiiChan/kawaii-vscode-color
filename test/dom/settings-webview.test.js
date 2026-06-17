const assert = require("node:assert/strict");
const test = require("node:test");
const { JSDOM } = require("jsdom");

const { createSettingsWebviewHtml } = require("../../src/settingsWebview");

function createInitialState() {
  return {
    themeLabel: "Kawaii VS Code Color",
    activeThemeVariantId: "dark",
    themeVariants: [
      {
        id: "dark",
        label: "Kawaii VS Code Color"
      },
      {
        id: "light",
        label: "Kawaii VS Code Color Light"
      }
    ],
    documentationLinks: [
      {
        label: "Repository",
        url: "https://github.com/EmmiiChan/kawaii-vscode-color",
        description: "Project source"
      }
    ],
    corruptionWarningLinks: [],
    checksumFixLink: {
      label: "Checksum Help",
      url: "https://code.visualstudio.com/docs/supporting/faq#_installation-appears-to-be-corrupt-unsupported",
      description: "VS Code FAQ"
    },
    projectLinks: [
      {
        label: "Repository",
        url: "https://github.com/EmmiiChan/kawaii-vscode-color",
        description: "Project source"
      },
      {
        label: "Issues",
        url: "https://github.com/EmmiiChan/kawaii-vscode-color/issues",
        description: "Issue tracker"
      },
      {
        label: "Homepage",
        url: "https://github.com/EmmiiChan/kawaii-vscode-color#readme",
        description: "README"
      },
      {
        label: "Publisher",
        url: "ITEM-PIXEL",
        description: "Marketplace publisher"
      }
    ],
    editorBackground: {
      opacity: 0.12,
      opacityMin: 0,
      opacityMax: 0.35,
      opacityStep: 0.01,
      fileName: "",
      previewUri: "",
      dataUrlWarning: "",
      fit: "full",
      fitOptions: [
        {
          id: "full",
          label: "Full",
          description: "Full editor"
        }
      ]
    },
    emptyEditorLogo: {
      opacity: 0.75,
      opacityMin: 0,
      opacityMax: 1,
      opacityStep: 0.01,
      fileName: "",
      previewUri: "",
      dataUrlWarning: ""
    },
    workbenchColors: [
      {
        id: "editor.background",
        label: "editor.background",
        group: "Editor",
        defaultValue: "#31202b",
        value: "#31202b",
        description: "Editor background",
        customized: false
      }
    ],
    tokenColors: [
      {
        id: 0,
        label: "Keyword",
        scope: "keyword",
        defaultValue: "#ff7edb",
        value: "#ff7edb",
        description: "Keyword tokens",
        customized: false
      }
    ],
    updatedAt: "2026-06-16T00:00:00.000Z"
  };
}

async function renderWebview() {
  const postedMessages = [];
  const html = createSettingsWebviewHtml(
    {
      cspSource: "vscode-resource:"
    },
    createInitialState(),
    "fixed-nonce"
  );

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    beforeParse(window) {
      window.acquireVsCodeApi = function acquireVsCodeApi() {
        return {
          postMessage(message) {
            postedMessages.push(message);
          }
        };
      };
    }
  });

  await new Promise((resolve) => {
    setImmediate(resolve);
  });

  return {
    dom,
    html,
    postedMessages
  };
}

test("settings webview posts ready and can request Neon Effect actions", async () => {
  const { dom, postedMessages } = await renderWebview();
  const document = dom.window.document;

  assert.equal(postedMessages[0].type, "ready");

  document.querySelector('[data-page="neon-effect"]').click();
  document.getElementById("enable-neon").click();
  document.getElementById("disable-neon").click();

  assert.ok(postedMessages.some((message) => message.type === "enable-neon"));
  assert.ok(postedMessages.some((message) => message.type === "disable-neon"));
});

test("settings webview exposes app-specific navigation and help links", async () => {
  const { dom } = await renderWebview();
  const document = dom.window.document;
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
