const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { VSBrowser } = require("vscode-extension-tester");

const { createInitialState } = require("../dom/settings-webview-helper");
const {
    E2E_RESULTS_DIR,
    assertWebviewPageVisible,
    clickWebviewCss,
    getWebviewInputValue,
    setWebviewInputValue,
    takeE2EScreenshot,
    takeWebviewElementScreenshot,
    waitForWebviewTextIncludes,
    withSettingsWebview
} = require("./helpers/extester-app");
const {
    assertPngHasContrast,
    assertPngPixelRatio,
    assertPngVisualChange
} = require("./helpers/png-analysis");

const VISUAL_ANALYSIS_OUTPUT = path.join(E2E_RESULTS_DIR, "settings-visual-state-analysis.json");
const visualAnalyses = [];

const FIT_OPTIONS = [
    { id: "full", label: "Full", description: "100% x 100%" },
    { id: "top", label: "Top", description: "100% x 50%" },
    { id: "bottom", label: "Bottom", description: "100% x 50%" },
    { id: "left", label: "Left", description: "50% x 100%" },
    { id: "right", label: "Right", description: "50% x 100%" },
    { id: "top-left", label: "Top Left", description: "50% x 50%" },
    { id: "top-right", label: "Top Right", description: "50% x 50%" },
    { id: "bottom-left", label: "Bottom Left", description: "50% x 50%" },
    { id: "bottom-right", label: "Bottom Right", description: "50% x 50%" }
];

const EDITOR_BACKGROUND_PREVIEW_URI = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#ff0000"/>
  <rect x="200" width="200" height="300" fill="#00ff00"/>
  <rect width="400" height="54" fill="#003cff"/>
</svg>`);

const EMPTY_EDITOR_LOGO_PREVIEW_URI = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#0028ff"/>
  <circle cx="200" cy="150" r="92" fill="#ffff00"/>
  <rect x="168" y="118" width="64" height="64" fill="#ff00ff"/>
</svg>`);

describe("Settings visual state image validation E2E", function () {
    this.timeout(120000);

    after(function () {
        fs.mkdirSync(E2E_RESULTS_DIR, { recursive: true });
        fs.writeFileSync(VISUAL_ANALYSIS_OUTPUT, `${JSON.stringify(visualAnalyses, null, 2)}\n`);
    });

    it("captures and validates image preview, warning, and missing-image states", async function () {
        await withSettingsWebview(async () => {
            await openImageCustomizationPage();

            const beforeFull = await takeE2EScreenshot("settings-visual-image-preview-before-empty");
            const beforeEditorPreview = await takeWebviewElementScreenshot(
                "#editor-background-preview",
                "settings-visual-image-preview-before-editor-background-element"
            );
            const beforeLogoPreview = await takeWebviewElementScreenshot(
                "#empty-editor-logo-preview",
                "settings-visual-image-preview-before-no-tab-logo-element"
            );
            const beforeEditorFile = await takeWebviewElementScreenshot(
                "#editor-background-file",
                "settings-visual-image-preview-before-editor-file-element"
            );
            const beforeLogoFile = await takeWebviewElementScreenshot(
                "#empty-editor-logo-file",
                "settings-visual-image-preview-before-logo-file-element"
            );

            await dispatchWebviewMessage({
                type: "state",
                state: createSelectedImageState()
            });
            await waitForWebviewTextIncludes("#editor-background-file", "visual-editor-background.svg");
            await waitForWebviewTextIncludes("#empty-editor-logo-file", "visual-no-tab-logo.svg");
            await waitForWebviewTextIncludes("#editor-background-data-url-warning", "Visual validation editor warning");
            await waitForWebviewTextIncludes("#empty-editor-logo-data-url-warning", "Visual validation logo warning");

            const selectedFull = await takeE2EScreenshot("settings-visual-image-preview-after-selected");
            const selectedEditorPreview = await takeWebviewElementScreenshot(
                "#editor-background-preview",
                "settings-visual-image-preview-after-editor-background-element"
            );
            const selectedLogoPreview = await takeWebviewElementScreenshot(
                "#empty-editor-logo-preview",
                "settings-visual-image-preview-after-no-tab-logo-element"
            );
            const selectedEditorFile = await takeWebviewElementScreenshot(
                "#editor-background-file",
                "settings-visual-image-preview-after-editor-file-element"
            );
            const selectedLogoFile = await takeWebviewElementScreenshot(
                "#empty-editor-logo-file",
                "settings-visual-image-preview-after-logo-file-element"
            );

            recordVisualAnalysis(
                "selected full settings image preview state",
                assertPngVisualChange("selected full settings image preview state", beforeFull, selectedFull)
            );
            recordVisualAnalysis(
                "selected editor background preview",
                assertPngVisualChange("selected editor background preview", beforeEditorPreview, selectedEditorPreview)
            );
            recordVisualAnalysis(
                "selected no-tab logo preview",
                assertPngVisualChange("selected no-tab logo preview", beforeLogoPreview, selectedLogoPreview)
            );
            recordVisualAnalysis(
                "selected editor background file metadata",
                assertPngVisualChange("selected editor background file metadata", beforeEditorFile, selectedEditorFile)
            );
            recordVisualAnalysis(
                "selected no-tab logo file metadata",
                assertPngVisualChange("selected no-tab logo file metadata", beforeLogoFile, selectedLogoFile)
            );
            recordVisualAnalysis(
                "selected editor preview red test-image pixels",
                assertPngPixelRatio("selected editor preview red test-image pixels", selectedEditorPreview, isStrongRed, 0.18)
            );
            recordVisualAnalysis(
                "selected editor preview green test-image pixels",
                assertPngPixelRatio("selected editor preview green test-image pixels", selectedEditorPreview, isStrongGreen, 0.18)
            );
            recordVisualAnalysis(
                "selected logo preview yellow test-image pixels",
                assertPngPixelRatio("selected logo preview yellow test-image pixels", selectedLogoPreview, isStrongYellow, 0.1)
            );

            assert.equal(await isWebviewElementDisabled("#editor-background-remove"), false);
            assert.equal(await isWebviewElementDisabled("#editor-background-download"), false);
            assert.equal(await isWebviewElementDisabled("#empty-editor-logo-remove"), false);
            assert.equal(await isWebviewElementDisabled("#empty-editor-logo-download"), false);

            await dispatchWebviewMessage({
                type: "state",
                state: createMissingImageState()
            });
            await waitForWebviewTextIncludes("#editor-background-file", "Stored image is missing");
            await waitForWebviewTextIncludes("#empty-editor-logo-file", "Stored logo is missing");

            const missingFull = await takeE2EScreenshot("settings-visual-image-preview-after-missing-images");
            const missingEditorPreview = await takeWebviewElementScreenshot(
                "#editor-background-preview",
                "settings-visual-image-preview-after-missing-editor-background-element"
            );
            const missingLogoPreview = await takeWebviewElementScreenshot(
                "#empty-editor-logo-preview",
                "settings-visual-image-preview-after-missing-no-tab-logo-element"
            );

            recordVisualAnalysis(
                "missing image warning full settings state",
                assertPngVisualChange("missing image warning full settings state", selectedFull, missingFull)
            );
            recordVisualAnalysis(
                "missing editor background preview",
                assertPngVisualChange("missing editor background preview", selectedEditorPreview, missingEditorPreview)
            );
            recordVisualAnalysis(
                "missing no-tab logo preview",
                assertPngVisualChange("missing no-tab logo preview", selectedLogoPreview, missingLogoPreview)
            );

            assert.equal(await isWebviewElementDisabled("#editor-background-remove"), false);
            assert.equal(await isWebviewElementDisabled("#editor-background-download"), true);
            assert.equal(await isWebviewElementDisabled("#empty-editor-logo-remove"), false);
            assert.equal(await isWebviewElementDisabled("#empty-editor-logo-download"), true);
        });
    });

    it("captures and validates random loading, effects warning, neon status, and error states", async function () {
        await withSettingsWebview(async () => {
            await openImageCustomizationPage();

            const beforeLoadingFull = await takeE2EScreenshot("settings-visual-loading-before-empty-previews");
            const beforeLoadingEditorPreview = await takeWebviewElementScreenshot(
                "#editor-background-preview",
                "settings-visual-loading-before-editor-background-element"
            );
            const beforeLoadingLogoPreview = await takeWebviewElementScreenshot(
                "#empty-editor-logo-preview",
                "settings-visual-loading-before-no-tab-logo-element"
            );

            await forceImagePreviewLoading();
            await waitForWebviewTextIncludes("#editor-background-preview", "Fetching random neko image");
            await waitForWebviewTextIncludes("#empty-editor-logo-preview", "Fetching random neko logo");

            const loadingFull = await takeE2EScreenshot("settings-visual-loading-after-random-loading");
            const loadingEditorPreview = await takeWebviewElementScreenshot(
                "#editor-background-preview",
                "settings-visual-loading-after-editor-background-element"
            );
            const loadingLogoPreview = await takeWebviewElementScreenshot(
                "#empty-editor-logo-preview",
                "settings-visual-loading-after-no-tab-logo-element"
            );

            recordVisualAnalysis(
                "random loading full state",
                assertPngVisualChange("random loading full state", beforeLoadingFull, loadingFull, {
                    minMeanDifference: 0.05,
                    minChangedRatio: 0.0002
                })
            );
            recordVisualAnalysis(
                "random loading editor background preview",
                assertPngVisualChange("random loading editor background preview", beforeLoadingEditorPreview, loadingEditorPreview)
            );
            recordVisualAnalysis(
                "random loading no-tab logo preview",
                assertPngVisualChange("random loading no-tab logo preview", beforeLoadingLogoPreview, loadingLogoPreview)
            );

            await dispatchWebviewMessage({ type: "error", message: "Visual validation failure state" });
            await waitForWebviewTextIncludes("#status", "Visual validation failure state");
            const errorFull = await takeE2EScreenshot("settings-visual-status-after-error");
            const errorStatus = await takeWebviewElementScreenshot("#status", "settings-visual-status-after-error-element");
            const errorEditorPreview = await takeWebviewElementScreenshot(
                "#editor-background-preview",
                "settings-visual-status-after-error-editor-background-element"
            );
            const errorLogoPreview = await takeWebviewElementScreenshot(
                "#empty-editor-logo-preview",
                "settings-visual-status-after-error-no-tab-logo-element"
            );

            recordVisualAnalysis(
                "error clears loading and updates visible status",
                assertPngVisualChange("error clears loading and updates visible status", loadingFull, errorFull, {
                    minMeanDifference: 0.05,
                    minChangedRatio: 0.0002
                })
            );
            recordVisualAnalysis(
                "error clears editor background loading overlay",
                assertPngVisualChange("error clears editor background loading overlay", loadingEditorPreview, errorEditorPreview)
            );
            recordVisualAnalysis(
                "error clears no-tab logo loading overlay",
                assertPngVisualChange("error clears no-tab logo loading overlay", loadingLogoPreview, errorLogoPreview)
            );
            recordVisualAnalysis(
                "error status text element contrast",
                assertPngHasContrast("error status text element", errorStatus, 20)
            );

            const beforeEffectsWarning = await takeE2EScreenshot("settings-visual-effects-warning-before-hidden");
            await dispatchWebviewMessage({ type: "effects-pending", message: "Visual validation pending effects warning" });
            await waitForWebviewTextIncludes("#effects-warning", "Visual validation pending effects warning");
            const effectsWarningFull = await takeE2EScreenshot("settings-visual-effects-warning-after-visible");
            const effectsWarningElement = await takeWebviewElementScreenshot(
                "#effects-warning",
                "settings-visual-effects-warning-after-visible-element"
            );

            recordVisualAnalysis(
                "effects warning visible state",
                assertPngVisualChange("effects warning visible state", beforeEffectsWarning, effectsWarningFull)
            );
            recordVisualAnalysis(
                "effects warning element contrast",
                assertPngHasContrast("effects warning element", effectsWarningElement, 20)
            );

            await clickWebviewCss('.nav-button[data-page="neon-effect"]');
            await assertWebviewPageVisible("neon-effect-page");
            const beforeNeonStatus = await takeE2EScreenshot("settings-visual-neon-status-before-empty");
            await dispatchWebviewMessage({ type: "neon-status", message: "Visual validation neon status complete" });
            await waitForWebviewTextIncludes("#neon-status", "Visual validation neon status complete");
            const neonStatusFull = await takeE2EScreenshot("settings-visual-neon-status-after-message");
            const neonStatusElement = await takeWebviewElementScreenshot(
                "#neon-status",
                "settings-visual-neon-status-after-message-element"
            );

            recordVisualAnalysis(
                "neon status message visible state",
                assertPngVisualChange("neon status message visible state", beforeNeonStatus, neonStatusFull, {
                    minMeanDifference: 0.005,
                    minChangedRatio: 0.0002
                })
            );
            recordVisualAnalysis(
                "neon status element contrast",
                assertPngHasContrast("neon status element", neonStatusElement, 20)
            );
        });
    });

    it("captures and validates color empty, invalid input, opacity, and fit selector states", async function () {
        await withSettingsWebview(async () => {
            await openColorSettingsPage();

            const beforeControlsFull = await takeE2EScreenshot("settings-visual-color-controls-before-default");
            const beforeContent = await takeWebviewElementScreenshot(
                "#content",
                "settings-visual-color-controls-before-content-element"
            );
            const beforeFirstRow = await takeWebviewElementScreenshot(
                "#content .row",
                "settings-visual-color-controls-before-first-row-element"
            );

            await setWebviewInputValue("#content .row .hex", "not-a-color");
            await waitForWebviewTextIncludes("#status", "Use #RGB");
            const invalidInputFull = await takeE2EScreenshot("settings-visual-color-controls-after-invalid-input");
            const invalidFirstRow = await takeWebviewElementScreenshot(
                "#content .row",
                "settings-visual-color-controls-after-invalid-first-row-element"
            );

            recordVisualAnalysis(
                "invalid color input full state",
                assertPngVisualChange("invalid color input full state", beforeControlsFull, invalidInputFull, {
                    minMeanDifference: 0.2
                })
            );
            recordVisualAnalysis(
                "invalid color input row",
                assertPngVisualChange("invalid color input row", beforeFirstRow, invalidFirstRow)
            );

            await setWebviewInputValue("#search", "not-a-real-color-entry");
            await waitForWebviewTextIncludes("#content", "No matching colors");
            const emptyFilterFull = await takeE2EScreenshot("settings-visual-color-controls-after-empty-filter");
            const emptyContent = await takeWebviewElementScreenshot(
                "#content",
                "settings-visual-color-controls-after-empty-content-element"
            );

            recordVisualAnalysis(
                "empty color filter full state",
                assertPngVisualChange("empty color filter full state", invalidInputFull, emptyFilterFull)
            );
            recordVisualAnalysis(
                "empty color filter content",
                assertPngVisualChange("empty color filter content", beforeContent, emptyContent)
            );

            await openImageCustomizationPage();
            const beforeImageControlsFull = await takeE2EScreenshot("settings-visual-image-controls-before-default");
            const beforeEditorOpacityValue = await takeWebviewElementScreenshot(
                "#editor-background-opacity-value",
                "settings-visual-image-controls-before-editor-opacity-value-element"
            );
            const beforeLogoOpacityValue = await takeWebviewElementScreenshot(
                "#empty-editor-logo-opacity-value",
                "settings-visual-image-controls-before-logo-opacity-value-element"
            );
            const beforeFitDescription = await takeWebviewElementScreenshot(
                "#editor-background-fit-description",
                "settings-visual-image-controls-before-fit-description-element"
            );

            await dispatchWebviewMessage({
                type: "state",
                state: createChangedControlsState()
            });
            await waitForWebviewTextIncludes("#editor-background-opacity-value", "20%");
            await waitForWebviewTextIncludes("#empty-editor-logo-opacity-value", "40%");
            await waitForWebviewTextIncludes("#editor-background-fit-description", "Left area");

            const changedControlsFull = await takeE2EScreenshot("settings-visual-image-controls-after-opacity-and-fit");
            const changedEditorOpacityValue = await takeWebviewElementScreenshot(
                "#editor-background-opacity-value",
                "settings-visual-image-controls-after-editor-opacity-value-element"
            );
            const changedLogoOpacityValue = await takeWebviewElementScreenshot(
                "#empty-editor-logo-opacity-value",
                "settings-visual-image-controls-after-logo-opacity-value-element"
            );
            const changedFitDescription = await takeWebviewElementScreenshot(
                "#editor-background-fit-description",
                "settings-visual-image-controls-after-fit-description-element"
            );

            recordVisualAnalysis(
                "opacity and fit controls full state",
                assertPngVisualChange("opacity and fit controls full state", beforeImageControlsFull, changedControlsFull)
            );
            recordVisualAnalysis(
                "editor background opacity value",
                assertPngVisualChange("editor background opacity value", beforeEditorOpacityValue, changedEditorOpacityValue)
            );
            recordVisualAnalysis(
                "no-tab logo opacity value",
                assertPngVisualChange("no-tab logo opacity value", beforeLogoOpacityValue, changedLogoOpacityValue)
            );
            recordVisualAnalysis(
                "editor background fit selector description",
                assertPngVisualChange("editor background fit selector description", beforeFitDescription, changedFitDescription)
            );

            assert.equal(await getWebviewInputValue("#editor-background-opacity"), "0.2");
            assert.equal(await getWebviewInputValue("#empty-editor-logo-opacity"), "0.4");
            assert.equal(await getWebviewInputValue("#editor-background-fit"), "left");
        });
    });
});

async function openColorSettingsPage() {
    await clickWebviewCss('.nav-button[data-page="color-settings"]');
    await assertWebviewPageVisible("color-settings-page");
    await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");
    await clickWebviewCss('.tab[data-section="workbench"]');
    await setWebviewInputValue("#search", "");
}

async function openImageCustomizationPage() {
    await clickWebviewCss('.nav-button[data-page="image-customization"]');
    await assertWebviewPageVisible("image-customization-page");
    await waitForWebviewTextIncludes("#image-customization-page", "EDITOR BACKGROUND IMAGE");
}

async function dispatchWebviewMessage(message) {
    await VSBrowser.instance.driver.executeScript(
        "window.dispatchEvent(new MessageEvent('message', { data: arguments[0] }));",
        message
    );
}

async function forceImagePreviewLoading() {
    await VSBrowser.instance.driver.executeScript(`
        const states = [
            ['#editor-background-preview', 'Fetching random neko image...'],
            ['#empty-editor-logo-preview', 'Fetching random neko logo...']
        ];

        for (const [selector, message] of states) {
            const preview = document.querySelector(selector);
            let overlay = preview.querySelector('.image-preview-loading');
            preview.classList.add('is-loading');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'image-preview-loading';
                preview.appendChild(overlay);
            }
            overlay.textContent = message;
        }
    `);
}

async function isWebviewElementDisabled(css) {
    return VSBrowser.instance.driver.executeScript(
        "return document.querySelector(arguments[0]).disabled;",
        css
    );
}

function createSelectedImageState() {
    return createInitialState({
        editorBackground: {
            opacity: 0.2,
            fit: "top-left",
            fitOptions: FIT_OPTIONS,
            hasImage: true,
            missingImage: false,
            originalName: "visual-editor-background.svg",
            sizeLabel: "1 KB",
            previewUri: EDITOR_BACKGROUND_PREVIEW_URI,
            dataUrlWarning: "Visual validation editor warning: image previews use data URLs."
        },
        emptyEditorLogo: {
            opacity: 0.4,
            hasImage: true,
            missingImage: false,
            originalName: "visual-no-tab-logo.svg",
            sizeLabel: "1 KB",
            previewUri: EMPTY_EDITOR_LOGO_PREVIEW_URI,
            dataUrlWarning: "Visual validation logo warning: image previews use data URLs."
        }
    });
}

function createMissingImageState() {
    return createInitialState({
        editorBackground: {
            opacity: 0.2,
            fit: "top-left",
            fitOptions: FIT_OPTIONS,
            hasImage: false,
            missingImage: true,
            originalName: "",
            sizeLabel: "",
            previewUri: "",
            dataUrlWarning: ""
        },
        emptyEditorLogo: {
            opacity: 0.4,
            hasImage: false,
            missingImage: true,
            originalName: "",
            sizeLabel: "",
            previewUri: "",
            dataUrlWarning: ""
        }
    });
}

function createChangedControlsState() {
    return createInitialState({
        editorBackground: {
            opacity: 0.2,
            fit: "left",
            fitOptions: FIT_OPTIONS
        },
        emptyEditorLogo: {
            opacity: 0.4
        }
    });
}

function createSvgDataUri(svg) {
    return `data:image/svg+xml;base64,${Buffer.from(svg.trim(), "utf8").toString("base64")}`;
}

function recordVisualAnalysis(name, analysis) {
    visualAnalyses.push({
        name,
        ...analysis
    });
}

function isStrongRed(pixel) {
    return pixel.red > 210 && pixel.green < 60 && pixel.blue < 80;
}

function isStrongGreen(pixel) {
    return pixel.green > 200 && pixel.red < 80 && pixel.blue < 90;
}

function isStrongYellow(pixel) {
    return pixel.red > 210 && pixel.green > 210 && pixel.blue < 80;
}
