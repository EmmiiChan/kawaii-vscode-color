const assert = require("node:assert/strict");

const {
    assertAnyWebviewTextIncludes,
    assertWebviewCssVisible,
    assertWebviewPageVisible,
    assertWebviewTextIncludes,
    clickWebviewCss,
    getWebviewE2EState,
    getWebviewInputValue,
    getWebviewText,
    takeE2EScreenshot,
    waitForWebviewE2EState,
    withSettingsWebview
} = require("./helpers/extester-app");

describe("Settings webview E2E", function () {
    this.timeout(120000);

    it("opens settings from the Command Palette", async function () {
        await withSettingsWebview(async () => {
            await assertWebviewCssVisible(".app");
            await assertWebviewTextIncludes("body", "Kawaii VS Code Color");
            await assertWebviewCssVisible("#home-apply-effects");
            await takeE2EScreenshot("settings-home");
        });
    });

    it("navigates through every settings page", async function () {
        await withSettingsWebview(async () => {
            await assertAnyWebviewTextIncludes(".nav-group", "Settings");

            const pages = [
                ["home", "home-page", "Kawaii VS Code Color"],
                ["settings", "settings-page", "Application settings"],
                ["color-settings", "color-settings-page", "THEME MODE"],
                ["neon-effect", "neon-effect-page", "Enable Effects"],
                ["image-customization", "image-customization-page", "Editor background and no-tab logo"],
                ["sync-files", "sync-files-page", "Settings Sync and JSON import/export"],
                ["help", "help-page", "Project resources"]
            ];

            for (const [navPage, pageId, expectedText] of pages) {
                await clickWebviewCss(`.nav-button[data-page="${navPage}"]`);
                await assertWebviewPageVisible(pageId);
                await assertWebviewTextIncludes(`#${pageId}`, expectedText);
                await takeE2EScreenshot(`settings-page-${navPage}`);
            }
        });
    });

    it("captures and validates application settings option combinations", async function () {
        await withSettingsWebview(async (_webview, driver) => {
            await clickWebviewCss('.nav-button[data-page="settings"]');
            await assertWebviewPageVisible("settings-page");
            await assertWebviewCssVisible("#editor-show-tabs");
            await assertWebviewCssVisible("#editor-wrap-tabs-toggle + .switch-track");
            await takeE2EScreenshot("settings-page-settings-before-defaults");

            const tabCases = [
                {
                    showTabs: "multiple",
                    wrapTabs: false,
                    dependencyText: "active",
                    screenshot: "settings-page-settings-tabs-multiple-wrap-off"
                },
                {
                    showTabs: "multiple",
                    wrapTabs: true,
                    dependencyText: "active",
                    screenshot: "settings-page-settings-tabs-multiple-wrap-on"
                },
                {
                    showTabs: "single",
                    wrapTabs: false,
                    dependencyText: "ignored unless Multiple tabs",
                    screenshot: "settings-page-settings-tabs-single-wrap-off-inactive"
                },
                {
                    showTabs: "single",
                    wrapTabs: true,
                    dependencyText: "ignored unless Multiple tabs",
                    screenshot: "settings-page-settings-tabs-single-wrap-on-inactive"
                },
                {
                    showTabs: "none",
                    wrapTabs: false,
                    dependencyText: "ignored unless Multiple tabs",
                    screenshot: "settings-page-settings-tabs-none-wrap-off-inactive"
                },
                {
                    showTabs: "none",
                    wrapTabs: true,
                    dependencyText: "ignored unless Multiple tabs",
                    screenshot: "settings-page-settings-tabs-none-wrap-on-inactive"
                }
            ];

            for (const tabCase of tabCases) {
                await setWebviewSelectValue(driver, "#editor-show-tabs", tabCase.showTabs);
                await setWebviewCheckboxChecked(driver, "#editor-wrap-tabs-toggle", tabCase.wrapTabs);
                assert.equal(await getWebviewInputValue("#editor-show-tabs"), tabCase.showTabs);
                assert.equal(await getWebviewCheckboxChecked(driver, "#editor-wrap-tabs-toggle"), tabCase.wrapTabs);
                assert.match(await getWebviewText("#editor-wrap-tabs-dependency"), new RegExp(tabCase.dependencyText));
                await takeE2EScreenshot(tabCase.screenshot);
            }

            await setWebviewCheckboxChecked(driver, "#open-folders-new-window-toggle", true);
            await setWebviewCheckboxChecked(driver, "#restore-windows-toggle", true);
            assert.equal(await getWebviewCheckboxChecked(driver, "#open-folders-new-window-toggle"), true);
            assert.equal(await getWebviewCheckboxChecked(driver, "#restore-windows-toggle"), true);
            await takeE2EScreenshot("settings-page-settings-window-switches-on");

            await setWebviewCheckboxChecked(driver, "#open-folders-new-window-toggle", false);
            await setWebviewCheckboxChecked(driver, "#restore-windows-toggle", false);
            assert.equal(await getWebviewCheckboxChecked(driver, "#open-folders-new-window-toggle"), false);
            assert.equal(await getWebviewCheckboxChecked(driver, "#restore-windows-toggle"), false);
            await takeE2EScreenshot("settings-page-settings-window-switches-off");

            await clickWebviewCss("#save-application-settings");
            await waitForWebviewE2EState((state) => {
                const applicationSettings = state.applicationSettings || {};
                const editorTabs = applicationSettings.editorTabs || {};
                const windowBehavior = applicationSettings.windowBehavior || {};

                return editorTabs.showTabs
                    && editorTabs.showTabs.value === "none"
                    && editorTabs.wrapTabs
                    && editorTabs.wrapTabs.value === true
                    && windowBehavior.openFoldersInNewWindow
                    && windowBehavior.openFoldersInNewWindow.value === "off"
                    && windowBehavior.restoreWindows
                    && windowBehavior.restoreWindows.value === "none";
            }, "Expected saved application settings state to reflect the selected UI stack");

            const savedState = await getWebviewE2EState();
            assert.equal(savedState.applicationSettings.editorTabs.showTabs.value, "none");
            assert.equal(savedState.applicationSettings.editorTabs.wrapTabs.value, true);
            assert.equal(savedState.applicationSettings.windowBehavior.openFoldersInNewWindow.value, "off");
            assert.equal(savedState.applicationSettings.windowBehavior.restoreWindows.value, "none");
            await takeE2EScreenshot("settings-page-settings-after-save");

            await setWebviewSelectValue(driver, "#editor-show-tabs", "multiple");
            await setWebviewCheckboxChecked(driver, "#editor-wrap-tabs-toggle", false);
            await clickWebviewCss("#save-application-settings");
            await waitForWebviewE2EState((state) => {
                const editorTabs = ((state.applicationSettings || {}).editorTabs || {});
                return editorTabs.showTabs
                    && editorTabs.showTabs.value === "multiple"
                    && editorTabs.wrapTabs
                    && editorTabs.wrapTabs.value === false;
            }, "Expected editor tabs to be restored for the remaining E2E suite");
        });
    });

    it("shows project help metadata", async function () {
        await withSettingsWebview(async () => {
            await clickWebviewCss('.nav-button[data-page="help"]');
            await assertWebviewPageVisible("help-page");
            await assertWebviewTextIncludes("#help-page", "Repository");
            await assertWebviewTextIncludes("#help-page", "Issues");
            await assertWebviewTextIncludes("#help-page", "README");
            await assertWebviewTextIncludes("#help-page", "ITEM-PIXEL");
        });
    });

    it("renders themed UI without obvious layout collapse", async function () {
        await withSettingsWebview(async () => {
            const sidebar = await assertWebviewCssVisible(".sidebar");
            const workspace = await assertWebviewCssVisible(".workspace");
            const homePage = await assertWebviewCssVisible("#home-page");
            const colorNavButton = await assertWebviewCssVisible('.nav-button[data-page="color-settings"]');

            for (const [name, element] of [
                ["sidebar", sidebar],
                ["workspace", workspace],
                ["home page", homePage],
                ["color nav button", colorNavButton]
            ]) {
                const rect = await element.getRect();
                assert.ok(rect.width > 0, `${name} should have width`);
                assert.ok(rect.height > 0, `${name} should have height`);
            }

            await takeE2EScreenshot("settings-layout-home");
            await clickWebviewCss('.nav-button[data-page="color-settings"]');
            await assertWebviewPageVisible("color-settings-page");

            const content = await assertWebviewCssVisible("#content");
            const contentRect = await content.getRect();
            assert.ok(contentRect.width > 0, "color content should have width");
            assert.ok(contentRect.height > 0, "color content should have height");
            await takeE2EScreenshot("settings-layout-color-settings");
        });
    });

    it("does not run real Kawaii Neon patch in safe suite", async function () {
        await withSettingsWebview(async () => {
            await clickWebviewCss('.nav-button[data-page="neon-effect"]');
            await assertWebviewPageVisible("neon-effect-page");
            await assertWebviewCssVisible("#enable-neon");
            await assertWebviewCssVisible("#disable-neon");
            await assertWebviewTextIncludes("#neon-effect-page", "Enable Effects");
        });
    });
});

async function setWebviewSelectValue(driver, css, value) {
    await assertWebviewCssVisible(css);
    const selected = await driver.executeScript(`
        const select = document.querySelector(arguments[0]);
        if (!select) {
            return null;
        }
        select.value = arguments[1];
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return select.value;
    `, css, value);

    assert.equal(selected, value, `Expected ${css} to select ${value}`);
}

async function setWebviewCheckboxChecked(driver, css, checked) {
    await assertWebviewCssVisible(`${css} + .switch-track`);
    const actual = await driver.executeScript(`
        const checkbox = document.querySelector(arguments[0]);
        if (!checkbox) {
            return null;
        }
        checkbox.checked = arguments[1];
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        return checkbox.checked;
    `, css, checked);

    assert.equal(actual, checked, `Expected ${css}.checked to be ${checked}`);
}

async function getWebviewCheckboxChecked(driver, css) {
    await assertWebviewCssVisible(`${css} + .switch-track`);
    return driver.executeScript(`
        const checkbox = document.querySelector(arguments[0]);
        return checkbox ? checkbox.checked : null;
    `, css);
}
