const assert = require("node:assert/strict");

const {
    assertAnyWebviewTextIncludes,
    assertWebviewCssVisible,
    assertWebviewPageVisible,
    assertWebviewTextIncludes,
    clickWebviewCss,
    takeE2EScreenshot,
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
