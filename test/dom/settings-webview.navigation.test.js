const assert = require("node:assert/strict");
const test = require("node:test");

const {
  click,
  countActiveNavItems,
  createInitialState,
  expectPostedMessage,
  expectVisiblePage,
  getLastPostedMessage,
  getRequiredElement,
  renderWebview,
  sendWindowMessage,
  setSelectValue
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
    "Settings",
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
  const { document, postedMessages, window } = await renderWebview();
  const pageIds = ["home", "settings", "color-settings", "neon-effect", "image-customization", "sync-files", "help"];

  assert.equal(document.querySelector(".nav-group").textContent.trim(), "Settings");
  assert.equal(document.querySelectorAll(".nav-group.active").length, 0);

  pageIds.forEach((pageId) => {
    click(document, `[data-page="${pageId}"]`);

    if (pageId === "settings") {
      assert.equal(getLastPostedMessage(postedMessages, "refresh").type, "refresh");
      sendWindowMessage(window, {
        type: "state",
        state: createInitialState()
      });
    }

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

test("settings webview renders application settings and saves the combined application settings payload", async () => {
  const { document, postedMessages, window } = await renderWebview({
    applicationSettings: {
      startupEditor: {
        setting: "workbench.startupEditor",
        value: "none",
        enabledValue: "welcomePage",
        disabledValue: "none",
        openNativeWelcomePage: false
      },
      editorTabs: {
        showTabs: {
          setting: "workbench.editor.showTabs",
          value: "multiple",
          options: [
            { value: "multiple", label: "Multiple tabs" },
            { value: "single", label: "Single tab" },
            { value: "none", label: "Hidden" }
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
          value: "folders",
          restorePreviousSession: false
        }
      }
    }
  });

  click(document, '[data-page="settings"]');
  assert.equal(getLastPostedMessage(postedMessages, "refresh").type, "refresh");
  assert.equal(
    document.getElementById("settings-page").classList.contains("hidden"),
    true,
    "Expected Settings to wait for a fresh VS Code state before becoming visible"
  );
  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      applicationSettings: {
        startupEditor: {
          setting: "workbench.startupEditor",
          value: "welcomePageInEmptyWorkbench",
          openNativeWelcomePage: true
        },
        editorTabs: {
          showTabs: {
            setting: "workbench.editor.showTabs",
            value: "single",
            options: [
              { value: "multiple", label: "Multiple tabs" },
              { value: "single", label: "Single tab" },
              { value: "none", label: "Hidden" }
            ]
          },
          wrapTabs: {
            setting: "workbench.editor.wrapTabs",
            value: true,
            effective: false
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
            value: "folders",
            restorePreviousSession: false
          }
        }
      }
    })
  });
  expectVisiblePage(document, "settings");

  const toggle = getRequiredElement(document, "#startup-editor-toggle");
  assert.equal(toggle.checked, true);
  assert.match(document.getElementById("startup-editor-setting-info").textContent, /workbench\.startupEditor/);
  assert.match(document.getElementById("startup-editor-setting-info").textContent, /welcomePage/);
  assert.match(document.getElementById("startup-editor-setting-meta").textContent, /welcomePageInEmptyWorkbench/);
  assert.equal(getRequiredElement(document, "#editor-show-tabs").value, "single");
  assert.equal(getRequiredElement(document, "#editor-wrap-tabs-toggle").checked, true);
  assert.match(document.getElementById("editor-wrap-tabs-dependency").textContent, /ignored unless Multiple tabs/);
  assert.match(document.getElementById("open-folders-new-window-meta").textContent, /default/);
  assert.match(document.getElementById("restore-windows-meta").textContent, /folders/);
  assert.ok(document.querySelector(".settings-save-bar"), "Expected a persistent Settings save bar");

  toggle.click();
  setSelectValue(window, "#editor-show-tabs", "multiple");
  assert.equal(getRequiredElement(document, "#editor-wrap-tabs-toggle").checked, true);
  assert.match(document.getElementById("editor-wrap-tabs-dependency").textContent, /active/);
  getRequiredElement(document, "#open-folders-new-window-toggle").click();
  getRequiredElement(document, "#restore-windows-toggle").click();
  click(document, "#save-application-settings");

  expectPostedMessage(postedMessages, "update-application-settings", {
    openNativeWelcomePage: false,
    showEditorTabs: "multiple",
    wrapEditorTabs: true,
    openFoldersInNewWindow: true,
    restoreWindows: true
  });

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      applicationSettings: {
        startupEditor: {
          setting: "workbench.startupEditor",
          value: "welcomePage",
          openNativeWelcomePage: true
        },
        editorTabs: {
          showTabs: {
            setting: "workbench.editor.showTabs",
            value: "none",
            options: [
              { value: "multiple", label: "Multiple tabs" },
              { value: "single", label: "Single tab" },
              { value: "none", label: "Hidden" }
            ]
          },
          wrapTabs: {
            setting: "workbench.editor.wrapTabs",
            value: false,
            effective: false
          }
        },
        windowBehavior: {
          openFoldersInNewWindow: {
            setting: "window.openFoldersInNewWindow",
            value: "off",
            openInNewWindow: false
          },
          restoreWindows: {
            setting: "window.restoreWindows",
            value: "none",
            restorePreviousSession: false
          }
        }
      }
    })
  });

  assert.equal(toggle.checked, true, "Expected incoming VS Code state to overwrite temporary switch state");
  assert.equal(getRequiredElement(document, "#editor-show-tabs").value, "none");
  assert.equal(getRequiredElement(document, "#editor-wrap-tabs-toggle").checked, false);
  assert.equal(getRequiredElement(document, "#open-folders-new-window-toggle").checked, false);
  assert.equal(getRequiredElement(document, "#restore-windows-toggle").checked, false);
  assert.match(document.getElementById("status").textContent, /Saved/);
});

test("settings webview renders the editor tabs and window behavior hypothesis matrix", async () => {
  const { document, window } = await renderWebview();
  const tabCombinations = [
    { showTabs: "multiple", wrapTabs: false, dependency: /active/ },
    { showTabs: "multiple", wrapTabs: true, dependency: /active/ },
    { showTabs: "single", wrapTabs: false, dependency: /ignored unless Multiple tabs/ },
    { showTabs: "single", wrapTabs: true, dependency: /ignored unless Multiple tabs/ },
    { showTabs: "none", wrapTabs: false, dependency: /ignored unless Multiple tabs/ },
    { showTabs: "none", wrapTabs: true, dependency: /ignored unless Multiple tabs/ }
  ];

  click(document, '[data-page="settings"]');

  for (const combination of tabCombinations) {
    sendWindowMessage(window, {
      type: "state",
      state: createInitialState({
        applicationSettings: {
          editorTabs: {
            showTabs: {
              setting: "workbench.editor.showTabs",
              value: combination.showTabs,
              options: [
                { value: "multiple", label: "Multiple tabs" },
                { value: "single", label: "Single tab" },
                { value: "none", label: "Hidden" }
              ]
            },
            wrapTabs: {
              setting: "workbench.editor.wrapTabs",
              value: combination.wrapTabs,
              effective: combination.showTabs === "multiple"
            }
          }
        }
      })
    });

    expectVisiblePage(document, "settings");
    assert.equal(getRequiredElement(document, "#editor-show-tabs").value, combination.showTabs);
    assert.equal(getRequiredElement(document, "#editor-wrap-tabs-toggle").checked, combination.wrapTabs);
    assert.match(document.getElementById("editor-wrap-tabs-dependency").textContent, combination.dependency);
  }

  sendWindowMessage(window, {
    type: "state",
    state: createInitialState({
      applicationSettings: {
        windowBehavior: {
          openFoldersInNewWindow: {
            setting: "window.openFoldersInNewWindow",
            value: "on",
            openInNewWindow: true
          },
          restoreWindows: {
            setting: "window.restoreWindows",
            value: "all",
            restorePreviousSession: true
          }
        }
      }
    })
  });

  assert.equal(getRequiredElement(document, "#open-folders-new-window-toggle").checked, true);
  assert.equal(getRequiredElement(document, "#restore-windows-toggle").checked, true);
  assert.match(document.getElementById("open-folders-new-window-meta").textContent, /on/);
  assert.match(document.getElementById("restore-windows-meta").textContent, /all/);
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
