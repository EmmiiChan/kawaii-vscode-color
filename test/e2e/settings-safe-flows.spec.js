const assert = require("node:assert/strict");

const {
    assertWebviewCssVisible,
    assertWebviewPageVisible,
    clickWebviewCss,
    getWebviewElementCount,
    getWebviewText,
    selectWebviewOptionByText,
    setWebviewInputValue,
    waitForWebviewTextIncludes,
    withSettingsWebview
} = require("./helpers/extester-app");

async function openColorSettingsPage() {
    await clickWebviewCss('.nav-button[data-page="color-settings"]');
    await assertWebviewPageVisible("color-settings-page");
    await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");
    await setWebviewInputValue("#search", "");
}

describe("Settings safe flows E2E", function () {
    this.timeout(120000);

    it("filters color settings", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();
            await setWebviewInputValue("#search", "editor.background");
            await waitForWebviewTextIncludes("#content", "editor.background");

            const contentText = await getWebviewText("#content");
            assert.ok(contentText.includes("editor.background"), "Expected filtered row for editor.background");
            assert.ok(!contentText.includes("No matching colors"), "Expected matching color rows");
        });
    });

    it("switches workbench and syntax tabs", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();

            await clickWebviewCss('.tab[data-section="workbench"]');
            await waitForWebviewTextIncludes("#content", "editor.background");
            assert.ok(await getWebviewElementCount("#content .row") > 0, "Expected workbench rows");

            await clickWebviewCss('.tab[data-section="token"]');
            await waitForWebviewTextIncludes("#content", "SYNTAX TOKENS");
            assert.ok(await getWebviewElementCount("#content .row") > 0, "Expected syntax token rows");
        });
    });

    it("switches theme variant selector in isolated profile", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();
            const selectedValue = await selectWebviewOptionByText("#theme-variant", "Kawaii VS Code Color Light");

            assert.equal(selectedValue, "light");
            await assertWebviewCssVisible("#theme-variant");
            await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");
        });
    });

    it("shows safe action controls without invoking native dialogs", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();

            for (const css of [
                "#save-vssync",
                "#import-vssync",
                "#export-settings",
                "#import-settings",
                "#editor-background-upload",
                "#editor-background-random-neko",
                "#editor-background-remove",
                "#editor-background-download",
                "#empty-editor-logo-upload",
                "#empty-editor-logo-random-neko",
                "#empty-editor-logo-remove",
                "#empty-editor-logo-download"
            ]) {
                await assertWebviewCssVisible(css);
            }
        });
    });
});
