const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
    assertWebviewCssVisible,
    assertWebviewPageVisible,
    closeAllEditors,
    clickWebviewCss,
    getWebviewElementCount,
    getWebviewInputValue,
    getWebviewText,
    postWebviewE2EMessage,
    selectWebviewOptionByText,
    setWebviewInputValue,
    takeE2EScreenshot,
    waitForWebviewInputValue,
    waitForWebviewTextIncludes,
    withSettingsWebview
} = require("./helpers/extester-app");

const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..");
const E2E_RESULTS_DIR = path.join(WORKSPACE_ROOT, "test-results", "e2e");
const SETTINGS_FIXTURES_DIR = path.join(WORKSPACE_ROOT, "test", "fixtures", "settings");
const EDITOR_BACKGROUND_FIXTURE = path.join(SETTINGS_FIXTURES_DIR, "editor-background.png");
const EMPTY_EDITOR_LOGO_FIXTURE = path.join(SETTINGS_FIXTURES_DIR, "empty-editor-logo.png");

async function openColorSettingsPage() {
    await clickWebviewCss('.nav-button[data-page="color-settings"]');
    await assertWebviewPageVisible("color-settings-page");
    await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");
    await selectWebviewOptionByText("#theme-variant", "Dark - Dark Pink Kawaii");
    await waitForWebviewInputValue("#theme-variant", "dark", 20000);
    await clickWebviewCss('.tab[data-section="workbench"]');
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
            await takeE2EScreenshot("settings-color-filter-editor-background");
        });
    });

    it("switches workbench and syntax tabs", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();

            await clickWebviewCss('.tab[data-section="workbench"]');
            await waitForWebviewTextIncludes("#content", "editor.background");
            assert.ok(await getWebviewElementCount("#content .row") > 0, "Expected workbench rows");
            await takeE2EScreenshot("settings-color-workbench-tab");

            await clickWebviewCss('.tab[data-section="token"]');
            await waitForWebviewTextIncludes("#content", "SYNTAX TOKENS");
            assert.ok(await getWebviewElementCount("#content .row") > 0, "Expected syntax token rows");
            await takeE2EScreenshot("settings-color-token-tab");
        });
    });

    it("switches theme variant selector in isolated profile", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();
            const selectedValue = await selectWebviewOptionByText("#theme-variant", "Light Pink-Pastel Kawaii");

            assert.equal(selectedValue, "light");
            await assertWebviewCssVisible("#theme-variant");
            await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");
            await takeE2EScreenshot("settings-theme-variant-light");
        });
    });

    it("updates editor.background color in the isolated profile and refreshes the UI", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();
            await setWebviewInputValue("#search", "editor.background");
            await waitForWebviewTextIncludes("#content", "editor.background");

            await setWebviewInputValue("#content .row .hex", "#123456");
            await waitForWebviewTextIncludes("#status", "Saved", 20000);

            assert.equal(await getWebviewInputValue("#content .row .hex"), "#123456");
            await takeE2EScreenshot("settings-color-update-editor-background");
        });
    });

    it("updates editor.background through the color picker and preserves existing alpha", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();
            await setWebviewInputValue("#search", "editor.background");
            await waitForWebviewTextIncludes("#content", "editor.background");

            await setWebviewInputValue("#content .row .hex", "#11223399");
            await waitForWebviewInputValue("#content .row .hex", "#11223399", 20000);

            await setWebviewInputValue("#content .row .picker", "#445566");
            await waitForWebviewInputValue("#content .row .hex", "#44556699", 20000);
            await waitForWebviewTextIncludes("#status", "Saved", 20000);

            await clickWebviewCss("#refresh");
            await waitForWebviewInputValue("#content .row .hex", "#44556699", 20000);
            await takeE2EScreenshot("settings-color-picker-alpha-persistence");
        });
    });

    it("uses controlled E2E fixtures for dialogs and Random Neko without native UI or network", async function () {
        fs.mkdirSync(E2E_RESULTS_DIR, { recursive: true });

        const exportPath = path.join(E2E_RESULTS_DIR, "settings-controlled-export.json");
        const editorBackgroundDownloadPath = path.join(E2E_RESULTS_DIR, "settings-controlled-editor-background-download.png");
        const emptyEditorLogoDownloadPath = path.join(E2E_RESULTS_DIR, "settings-controlled-empty-editor-logo-download.png");

        for (const filePath of [exportPath, editorBackgroundDownloadPath, emptyEditorLogoDownloadPath]) {
            fs.rmSync(filePath, { force: true });
        }

        try {
            await withSettingsWebview(async () => {
                await openColorSettingsPage();
                await postWebviewE2EMessage({
                    type: "e2e-set-test-fixtures",
                    fixtures: {
                        settingsExportPath: exportPath,
                        settingsImportPath: exportPath,
                        editorBackgroundImagePath: EDITOR_BACKGROUND_FIXTURE,
                        emptyEditorLogoImagePath: EMPTY_EDITOR_LOGO_FIXTURE,
                        editorBackgroundDownloadPath,
                        emptyEditorLogoDownloadPath,
                        randomNekoImagePath: EDITOR_BACKGROUND_FIXTURE
                    }
                });

                await clickWebviewCss("#editor-background-upload");
                await waitForWebviewTextIncludes("#editor-background-file", "editor-background.png", 30000);
                await clickWebviewCss("#empty-editor-logo-upload");
                await waitForWebviewTextIncludes("#empty-editor-logo-file", "empty-editor-logo.png", 30000);

                await setWebviewInputValue("#search", "editor.background");
                await waitForWebviewTextIncludes("#content", "editor.background");
                await setWebviewInputValue("#content .row .hex", "#135724");
                await waitForWebviewInputValue("#content .row .hex", "#135724", 20000);

                await clickWebviewCss("#editor-background-download");
                await clickWebviewCss("#empty-editor-logo-download");
                await clickWebviewCss("#export-settings");
                await waitForFile(exportPath, 20000);

                const exportedBundle = JSON.parse(fs.readFileSync(exportPath, "utf8"));
                assert.equal(exportedBundle.colorCustomizations.workbench.dark["editor.background"], "#135724");
                assert.equal(exportedBundle.effects.editorBackground.image.originalName, "editor-background.png");
                assert.equal(exportedBundle.effects.emptyEditorLogo.image.originalName, "empty-editor-logo.png");
                assert.deepEqual(fs.readFileSync(editorBackgroundDownloadPath), fs.readFileSync(EDITOR_BACKGROUND_FIXTURE));
                assert.deepEqual(fs.readFileSync(emptyEditorLogoDownloadPath), fs.readFileSync(EMPTY_EDITOR_LOGO_FIXTURE));

                await clickWebviewCss("#editor-background-random-neko");
                await waitForWebviewTextIncludes("#editor-background-file", "e2e-random-neko-editor-background.png", 30000);
                await clickWebviewCss("#empty-editor-logo-random-neko");
                await waitForWebviewTextIncludes("#empty-editor-logo-file", "e2e-random-neko-editor-background.png", 30000);

                await setWebviewInputValue("#content .row .hex", "#246813");
                await waitForWebviewInputValue("#content .row .hex", "#246813", 20000);
                await clickWebviewCss("#import-settings");
                await waitForWebviewInputValue("#content .row .hex", "#135724", 30000);
                await waitForWebviewTextIncludes("#editor-background-file", "editor-background.png", 30000);
                await waitForWebviewTextIncludes("#empty-editor-logo-file", "empty-editor-logo.png", 30000);
                await takeE2EScreenshot("settings-controlled-dialog-random-flows");
            });
        } finally {
            await closeAllEditors().catch(() => undefined);
        }
    });

    it("shows safe action controls without invoking native dialogs", async function () {
        await withSettingsWebview(async () => {
            await assertWebviewCssVisible("#home-apply-effects");

            await openColorSettingsPage();

            for (const css of [
                "#apply-effects",
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
            await takeE2EScreenshot("settings-safe-action-controls-color-settings");

            await clickWebviewCss('.nav-button[data-page="neon-effect"]');
            await assertWebviewPageVisible("neon-effect-page");
            await assertWebviewCssVisible("#enable-neon");
            await assertWebviewCssVisible("#disable-neon");
            await takeE2EScreenshot("settings-safe-action-controls-neon-effect");
        });
    });
});

async function waitForFile(filePath, timeoutMs) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (fs.existsSync(filePath)) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    assert.fail(`Expected file to exist: ${filePath}`);
}
