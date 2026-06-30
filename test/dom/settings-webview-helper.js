const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const { createSettingsWebviewHtml } = require("../../out/src/settingsWebview");

const baseState = {
  themeLabel: "Dark Pink Kawaii",
  activeThemeVariantId: "dark",
  themeVariants: [
    {
      id: "dark",
      modeLabel: "Dark",
      label: "Dark Pink Kawaii"
    },
    {
      id: "light",
      modeLabel: "Light",
      label: "Light Pink-Pastel Kawaii"
    }
  ],
  documentationLinks: [
    {
      label: "Repository",
      url: "https://github.com/EmmiiChan/kawaii-vscode-color",
      description: "Project source"
    },
    {
      label: "VS Code Theme Color",
      url: "https://code.visualstudio.com/api/references/theme-color",
      description: "VS Code theme color reference"
    }
  ],
  corruptionWarningLinks: [
    {
      label: "VS Code FAQ",
      url: "https://code.visualstudio.com/docs/supporting/faq#_installation-appears-to-be-corrupt-unsupported",
      description: "VS Code corrupt installation warning"
    }
  ],
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
    minOpacity: 0,
    maxOpacity: 0.35,
    opacityStep: 0.01,
    hasImage: false,
    missingImage: false,
    fileName: "",
    originalName: "",
    sizeLabel: "",
    previewUri: "",
    dataUrlWarning: "",
    fit: "full",
    supportedFormats: "PNG, JPG/JPEG, WEBP, SVG",
    maxImageSizeLabel: "2 MB",
    fitOptions: [
      {
        id: "full",
        label: "Full",
        description: "100% x 100%"
      },
      {
        id: "left",
        label: "Left",
        description: "50% x 100%"
      },
      {
        id: "top-left",
        label: "Top Left",
        description: "50% x 50%"
      }
    ]
  },
  emptyEditorLogo: {
    opacity: 0.75,
    minOpacity: 0,
    maxOpacity: 1,
    opacityStep: 0.01,
    hasImage: false,
    missingImage: false,
    fileName: "",
    originalName: "",
    sizeLabel: "",
    previewUri: "",
    dataUrlWarning: "",
    supportedFormats: "PNG, JPG/JPEG, WEBP, SVG",
    maxImageSizeLabel: "2 MB"
  },
  effects: {
    features: {
      foundation: true,
      editorBackground: true,
      noPageLogo: true,
      glow: true
    }
  },
  applicationSettings: {
    startupEditor: {
      setting: "workbench.startupEditor",
      value: "welcomePage",
      enabledValue: "welcomePage",
      disabledValue: "none",
      openNativeWelcomePage: true
    },
    editorTabs: {
      showTabs: {
        setting: "workbench.editor.showTabs",
        value: "multiple",
        options: [
          {
            value: "multiple",
            label: "Multiple tabs"
          },
          {
            value: "single",
            label: "Single tab"
          },
          {
            value: "none",
            label: "Hidden"
          }
        ]
      },
      wrapTabs: {
        setting: "workbench.editor.wrapTabs",
        value: false,
        effective: true
      }
    },
    windowBehavior: {
      openFoldersInNewWindow: {
        setting: "window.openFoldersInNewWindow",
        value: "default",
        openInNewWindow: false
      },
      restoreWindows: {
        setting: "window.restoreWindows",
        value: "all",
        restorePreviousSession: true
      }
    }
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
    },
    {
      id: "activityBar.background",
      label: "activityBar.background",
      group: "Activity Bar",
      defaultValue: "#231d2b",
      value: "#1f1a28",
      description: "Activity bar background",
      customized: true
    }
  ],
  tokenColors: [
    {
      id: "keyword",
      label: "Keyword",
      scope: "keyword",
      defaultValue: "#ff7edb",
      value: "#ff7edb",
      description: "Keyword tokens",
      customized: false
    },
    {
      id: "string",
      label: "String",
      scope: "string",
      defaultValue: "#99f9c8",
      value: "#88e8b8",
      description: "String tokens",
      customized: true
    }
  ],
  updatedAt: "2026-06-16T00:00:00.000Z"
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }

  return value;
}

function deepMerge(baseValue, overrideValue) {
  if (overrideValue === undefined) {
    return cloneValue(baseValue);
  }

  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return cloneValue(overrideValue);
  }

  if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
    const merged = {};
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(overrideValue)]);

    keys.forEach((key) => {
      merged[key] = deepMerge(baseValue[key], overrideValue[key]);
    });

    return merged;
  }

  return cloneValue(overrideValue);
}

function createInitialState(overrides = {}) {
  return deepMerge(baseState, overrides);
}

async function renderWebview(initialStateOverrides = {}) {
  const postedMessages = [];
  const html = createSettingsWebviewHtml(
    {
      cspSource: "vscode-resource:"
    },
    createInitialState(initialStateOverrides),
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
    window: dom.window,
    document: dom.window.document,
    html,
    postedMessages
  };
}

function getRequiredElement(document, selector) {
  const element = document.querySelector(selector);
  assert.ok(element, `Expected to find element "${selector}"`);
  return element;
}

function click(document, selector) {
  getRequiredElement(document, selector).click();
}

function setInputValue(window, selector, value) {
  const input = getRequiredElement(window.document, selector);
  input.value = value;
  input.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function setSelectValue(window, selector, value) {
  const select = getRequiredElement(window.document, selector);
  select.value = value;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function sendWindowMessage(window, message) {
  window.dispatchEvent(new window.MessageEvent("message", { data: message }));
}

function flushTimers(ms = 250) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getPostedMessagesByType(postedMessages, type) {
  return postedMessages.filter((message) => message.type === type);
}

function getLastPostedMessage(postedMessages, type) {
  const messages = getPostedMessagesByType(postedMessages, type);
  return messages[messages.length - 1];
}

function expectPostedMessage(postedMessages, type, expectedPayload = {}) {
  const message = getLastPostedMessage(postedMessages, type);
  assert.ok(message, `Expected a "${type}" message`);
  assert.equal(message.type, type);

  Object.entries(expectedPayload).forEach(([key, expectedValue]) => {
    assert.deepEqual(toAssertableValue(message[key]), expectedValue, `Expected "${type}.${key}" to match`);
  });

  return message;
}

function toAssertableValue(value) {
  if (value && typeof value === "object") {
    return JSON.parse(JSON.stringify(value));
  }

  return value;
}

function assertNoPostedMessage(postedMessages, type) {
  assert.equal(getPostedMessagesByType(postedMessages, type).length, 0, `Expected no "${type}" messages`);
}

function expectNoPostedMessage(postedMessages, type) {
  assertNoPostedMessage(postedMessages, type);
}

function clearPostedMessages(postedMessages) {
  postedMessages.length = 0;
}

function countActiveNavItems(document) {
  return document.querySelectorAll(".nav-button.active").length;
}

function expectVisiblePage(document, pageId) {
  const resolvedPageId = pageId.endsWith("-page") ? pageId : `${pageId}-page`;
  const page = getRequiredElement(document, `#${resolvedPageId}`);
  assert.equal(page.classList.contains("hidden"), false, `Expected #${resolvedPageId} to be visible`);
  return page;
}

function expectStatusText(document, pattern) {
  const statusText = getRequiredElement(document, "#status").textContent;

  if (pattern instanceof RegExp) {
    assert.match(statusText, pattern);
    return;
  }

  assert.equal(statusText, pattern);
}

function expectElementDisabled(document, selector, expected) {
  assert.equal(getRequiredElement(document, selector).disabled, expected, `Expected ${selector}.disabled to be ${expected}`);
}

function expectInputValue(document, selector, expected) {
  assert.equal(getRequiredElement(document, selector).value, expected, `Expected ${selector}.value to match`);
}

function closeRenderedWebview(rendered) {
  if (rendered && rendered.dom && rendered.dom.window) {
    rendered.dom.window.close();
  }
}

module.exports = {
  assertNoPostedMessage,
  click,
  clearPostedMessages,
  closeRenderedWebview,
  countActiveNavItems,
  createInitialState,
  expectElementDisabled,
  expectInputValue,
  expectNoPostedMessage,
  expectPostedMessage,
  expectStatusText,
  expectVisiblePage,
  flushTimers,
  getRequiredElement,
  getLastPostedMessage,
  getPostedMessagesByType,
  renderWebview,
  sendWindowMessage,
  setInputValue,
  setSelectValue
};
