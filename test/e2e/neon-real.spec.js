const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { VSBrowser, Workbench } = require("vscode-extension-tester");

const {
    assertWebviewPageVisible,
    clearTransientWorkbenchNotifications,
    clickWebviewCss,
    getWebviewInputValue,
    postWebviewE2EMessage,
    runCommand,
    setWebviewInputValue,
    takeE2EScreenshot,
    waitForWebviewInputValue,
    waitForWebviewTextIncludes,
    withSettingsWebview
} = require("./helpers/extester-app");
const {
    isWorkbenchPatchEnabled,
    removeWorkbenchPatchScriptTag,
    resolveWorkbenchPatchPaths
} = require("../../out/src/workbenchPatch");
const {
    EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES,
    EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS
} = require("../../out/src/emptyEditorLogoStyles");

const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..");
const DISPOSABLE_TEST_ROOT = path.join(WORKSPACE_ROOT, ".vscode-test");
const E2E_RESULTS_DIR = path.join(WORKSPACE_ROOT, "test-results", "e2e");
const NEON_STATE_FILE = path.join(E2E_RESULTS_DIR, "neon-real-state.json");
const BASE_SETTINGS_FIXTURE = JSON.parse(fs.readFileSync(
    path.join(WORKSPACE_ROOT, "test", "fixtures", "settings", "settings-dark-light-customized.json"),
    "utf8"
));
const DEV_IMAGES_DIR = path.join(WORKSPACE_ROOT, "images", "dev-images");
const RANDOM_IMAGES_DIR = path.join(WORKSPACE_ROOT, "images", "random-images");
const EDITOR_BACKGROUND_FIT_AREAS = {
    full: { top: "0", right: "auto", bottom: "auto", left: "0", width: "100%", height: "100%" },
    top: { top: "0", right: "auto", bottom: "auto", left: "0", width: "100%", height: "50%" },
    bottom: { top: "auto", right: "auto", bottom: "0", left: "0", width: "100%", height: "50%" },
    left: { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "100%" },
    right: { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "100%" },
    "top-left": { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "50%" },
    "top-right": { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "50%" },
    "bottom-left": { top: "auto", right: "auto", bottom: "0", left: "0", width: "50%", height: "50%" },
    "bottom-right": { top: "auto", right: "0", bottom: "0", left: "auto", width: "50%", height: "50%" }
};
const EDITOR_BACKGROUND_FIT_OPTIONS = Object.keys(EDITOR_BACKGROUND_FIT_AREAS);
const DSTGROUP_VISUAL_CASE = createVisualSettingsCase("dstgroup", {
    editorBackgroundImagePath: path.join(DEV_IMAGES_DIR, "logo-page.png"),
    emptyEditorLogoImagePath: path.join(DEV_IMAGES_DIR, "logo-nopage.png")
});
const ALTERNATE_VISUAL_CASE = createVisualSettingsCase("alternate", {
    editorBackgroundImagePath: path.join(RANDOM_IMAGES_DIR, "felix-0008.jpg"),
    emptyEditorLogoImagePath: path.join(RANDOM_IMAGES_DIR, "felix-gamer-ah.webp"),
    editorBackgroundFit: "top-right"
});
const NEON_STORAGE = path.resolve(
    process.env.KAWAII_E2E_STORAGE || path.join(DISPOSABLE_TEST_ROOT, "extest-111-neon")
);
const REQUIRED_NEON_FLAG = "1";

describe("Neon real gated E2E @neon-real", function () {
    this.timeout(180000);

    before(function () {
        if (process.env.KAWAII_E2E_ALLOW_NEON_PATCH !== REQUIRED_NEON_FLAG) {
            this.skip();
        }
    });

    afterEach(function () {
        const title = this.currentTest && this.currentTest.title || "";
        const state = readStateIfExists();

        if (!state) {
            return;
        }

        const mayLeavePatchForNextPhase = this.currentTest.state === "passed"
            && (
                title.includes("@neon-real-apply")
                || title.includes("@neon-real-applied")
                || title.includes("@neon-real-alternate")
            );
        if (mayLeavePatchForNextPhase) {
            return;
        }

        restoreBaselineIfNeeded(state);
    });

    it("captures before state and applies Neon Effect patch @neon-real-apply", async function () {
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const baselineSnapshot = ensureCleanWorkbenchBaseline(patchPaths);
        const baselineLogoState = await captureBaselineEmptyEditorLogoVisualState();

        assert.equal(baselineSnapshot.patchEnabled, false, "Expected disposable workbench to start without Kawaii UI patch");
        assert.equal(baselineSnapshot.scriptTagCount, 0, "Expected no Kawaii UI script tag before applying");

        writeState({
            storage: NEON_STORAGE,
            htmlFile: patchPaths.htmlFile,
            templateFile: patchPaths.templateFile,
            baselineHtml: baselineSnapshot.html,
            baselineHtmlHash: baselineSnapshot.htmlHash,
            baselineTemplateExists: baselineSnapshot.templateExists,
            baselineTemplateHash: baselineSnapshot.templateHash,
            baselineLogoState
        });

        await applyVisualSettingsThroughUiAndEffects(DSTGROUP_VISUAL_CASE, "neon-real-before-apply-dstgroup");

        const appliedSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => snapshot.patchEnabled && snapshot.templateExists,
            "Expected Kawaii UI patch and generated template after applying effects"
        );

        assert.notEqual(appliedSnapshot.htmlHash, baselineSnapshot.htmlHash, "Expected workbench HTML to change after applying effects");
        assert.equal(appliedSnapshot.scriptTagCount, 1, "Expected exactly one Kawaii UI script tag after applying effects");
        assert.match(appliedSnapshot.html, /<!-- KAWAII VSCODE COLORS UI --><script src="kawaii-vscode-colors-ui\.js\?v=\d+"><\/script><!-- \/KAWAII VSCODE COLORS UI -->/);
        assertAppliedTemplateUsesEditorTokens(appliedSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(appliedSnapshot.template, DSTGROUP_VISUAL_CASE);

        updateState({
            dstgroupHtmlHash: appliedSnapshot.htmlHash,
            dstgroupTemplateHash: appliedSnapshot.templateHash
        });
    });

    it("validates dstgroup applied state after full VS Code restart and applies alternate image @neon-real-applied", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const appliedSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(appliedSnapshot.patchEnabled, true, "Expected Kawaii UI patch to persist after full VS Code restart");
        assert.equal(appliedSnapshot.scriptTagCount, 1, "Expected one Kawaii UI script tag after full VS Code restart");
        assert.equal(appliedSnapshot.htmlHash, state.dstgroupHtmlHash, "Expected dstgroup HTML hash to persist across restart");
        assert.equal(appliedSnapshot.templateHash, state.dstgroupTemplateHash, "Expected dstgroup Kawaii UI script to persist across restart");
        assertAppliedTemplateUsesEditorTokens(appliedSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(appliedSnapshot.template, DSTGROUP_VISUAL_CASE);

        const dstgroupLogoState = await captureAppliedEmptyEditorLogoVisualState(
            DSTGROUP_VISUAL_CASE,
            "neon-real-dstgroup-after-full-restart"
        );
        const logoScreenshotAnalysis = compareEmptyEditorLogoScreenshots(
            state.baselineLogoState,
            dstgroupLogoState
        );
        assert.ok(
            logoScreenshotAnalysis.hasVisualChangeFromDefault,
            `Expected screenshot crop to change from the default VS Code watermark to the custom no-tab logo. Analysis: ${JSON.stringify(logoScreenshotAnalysis)}`
        );

        const dstgroupEditorBackgroundState = await captureAppliedEditorBackgroundVisualState(
            DSTGROUP_VISUAL_CASE,
            "neon-real-dstgroup-page-background-after-full-restart"
        );

        await applyVisualSettingsBundleAndEffects(ALTERNATE_VISUAL_CASE, "neon-real-before-apply-alternate");

        const alternateSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => snapshot.patchEnabled
                && snapshot.templateExists
                && snapshot.templateHash !== state.dstgroupTemplateHash,
            "Expected alternate image settings to regenerate the Kawaii UI script"
        );

        assert.equal(alternateSnapshot.scriptTagCount, 1, "Expected exactly one Kawaii UI script tag after applying alternate image");
        assert.notEqual(alternateSnapshot.templateHash, state.dstgroupTemplateHash, "Expected alternate image to change generated Kawaii UI script content");
        assertAppliedTemplateUsesEditorTokens(alternateSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(alternateSnapshot.template, ALTERNATE_VISUAL_CASE);

        updateState({
            dstgroupLogoState,
            dstgroupEditorBackgroundState,
            alternateHtmlHash: alternateSnapshot.htmlHash,
            alternateTemplateHash: alternateSnapshot.templateHash
        });
    });

    it("validates alternate image after full VS Code restart and reapplies dstgroup @neon-real-alternate", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const alternateSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(alternateSnapshot.patchEnabled, true, "Expected alternate Kawaii UI patch to persist after full VS Code restart");
        assert.equal(alternateSnapshot.scriptTagCount, 1, "Expected one Kawaii UI script tag after alternate full VS Code restart");
        assert.equal(alternateSnapshot.htmlHash, state.alternateHtmlHash, "Expected alternate HTML hash to persist across restart");
        assert.equal(alternateSnapshot.templateHash, state.alternateTemplateHash, "Expected alternate Kawaii UI script to persist across restart");
        assertAppliedTemplateUsesEditorTokens(alternateSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(alternateSnapshot.template, ALTERNATE_VISUAL_CASE);

        const alternateLogoState = await captureAppliedEmptyEditorLogoVisualState(
            ALTERNATE_VISUAL_CASE,
            "neon-real-alternate-after-full-restart"
        );
        const alternateScreenshotAnalysis = compareEmptyEditorLogoScreenshots(
            state.dstgroupLogoState,
            alternateLogoState
        );
        assert.ok(
            alternateScreenshotAnalysis.hasVisualChangeFromDefault,
            `Expected screenshot crop to change from dstgroup no-tab logo to alternate image. Analysis: ${JSON.stringify(alternateScreenshotAnalysis)}`
        );

        const alternateEditorBackgroundState = await captureAppliedEditorBackgroundVisualState(
            ALTERNATE_VISUAL_CASE,
            "neon-real-alternate-page-background-top-right-after-full-restart"
        );
        const editorBackgroundScreenshotAnalysis = compareEditorBackgroundScreenshots(
            state.dstgroupEditorBackgroundState,
            alternateEditorBackgroundState
        );
        assert.ok(
            editorBackgroundScreenshotAnalysis.hasVisualChange,
            `Expected editor page background screenshot crop to change from dstgroup to alternate image. Analysis: ${JSON.stringify(editorBackgroundScreenshotAnalysis)}`
        );

        const alternateEditorBackgroundFitMatrixState = await captureEditorBackgroundFitMatrixVisualState(
            ALTERNATE_VISUAL_CASE,
            "neon-real-alternate-page-background-fit"
        );

        await applyVisualSettingsBundleAndEffects(DSTGROUP_VISUAL_CASE, "neon-real-before-revert-dstgroup");

        const revertedDstgroupSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => snapshot.patchEnabled
                && snapshot.templateExists
                && snapshot.templateHash !== state.alternateTemplateHash,
            "Expected dstgroup settings to regenerate the Kawaii UI script after alternate image"
        );

        assert.equal(revertedDstgroupSnapshot.scriptTagCount, 1, "Expected exactly one Kawaii UI script tag after reverting to dstgroup");
        assert.equal(revertedDstgroupSnapshot.templateHash, state.dstgroupTemplateHash, "Expected reverting to dstgroup to restore the original generated Kawaii UI script content");
        assertAppliedTemplateUsesEditorTokens(revertedDstgroupSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(revertedDstgroupSnapshot.template, DSTGROUP_VISUAL_CASE);

        updateState({
            alternateLogoState,
            alternateEditorBackgroundState,
            alternateEditorBackgroundFitMatrixState,
            revertedDstgroupHtmlHash: revertedDstgroupSnapshot.htmlHash,
            revertedDstgroupTemplateHash: revertedDstgroupSnapshot.templateHash
        });
    });

    it("validates dstgroup restoration after full VS Code restart and disables Neon Effect @neon-real-reverted", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const revertedDstgroupSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(revertedDstgroupSnapshot.patchEnabled, true, "Expected reverted dstgroup Kawaii UI patch to persist after full VS Code restart");
        assert.equal(revertedDstgroupSnapshot.scriptTagCount, 1, "Expected one Kawaii UI script tag after reverted dstgroup full VS Code restart");
        assert.equal(revertedDstgroupSnapshot.htmlHash, state.revertedDstgroupHtmlHash, "Expected reverted dstgroup HTML hash to persist across restart");
        assert.equal(revertedDstgroupSnapshot.templateHash, state.revertedDstgroupTemplateHash, "Expected reverted dstgroup Kawaii UI script to persist across restart");
        assert.equal(revertedDstgroupSnapshot.templateHash, state.dstgroupTemplateHash, "Expected reverted dstgroup Kawaii UI script to match the original dstgroup script");
        assertAppliedTemplateUsesEditorTokens(revertedDstgroupSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(revertedDstgroupSnapshot.template, DSTGROUP_VISUAL_CASE);

        const revertedDstgroupLogoState = await captureAppliedEmptyEditorLogoVisualState(
            DSTGROUP_VISUAL_CASE,
            "neon-real-dstgroup-reverted-after-full-restart"
        );
        const revertedScreenshotAnalysis = compareEmptyEditorLogoScreenshots(
            state.alternateLogoState,
            revertedDstgroupLogoState
        );
        assert.ok(
            revertedScreenshotAnalysis.hasVisualChangeFromDefault,
            `Expected screenshot crop to change from alternate image back to dstgroup no-tab logo. Analysis: ${JSON.stringify(revertedScreenshotAnalysis)}`
        );

        const revertedDstgroupEditorBackgroundState = await captureAppliedEditorBackgroundVisualState(
            DSTGROUP_VISUAL_CASE,
            "neon-real-dstgroup-page-background-reverted-after-full-restart"
        );
        const revertedEditorBackgroundScreenshotAnalysis = compareEditorBackgroundScreenshots(
            state.alternateEditorBackgroundState,
            revertedDstgroupEditorBackgroundState
        );
        assert.ok(
            revertedEditorBackgroundScreenshotAnalysis.hasVisualChange,
            `Expected editor page background screenshot crop to change from alternate image back to dstgroup. Analysis: ${JSON.stringify(revertedEditorBackgroundScreenshotAnalysis)}`
        );

        await clickNeonAction("#disable-neon", "neon-real-before-disable");

        const restoredSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => !snapshot.patchEnabled && snapshot.html === state.baselineHtml,
            "Expected workbench HTML to match the before state after disabling"
        );

        assert.equal(restoredSnapshot.htmlHash, state.baselineHtmlHash, "Expected restored HTML hash to match the before state");
        assert.equal(restoredSnapshot.scriptTagCount, 0, "Expected no Kawaii UI script tag after disabling");
        updateState({
            restoredHtmlHash: restoredSnapshot.htmlHash
        });
    });

    it("validates restored state after full VS Code restart @neon-real-restored", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const restoredSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(restoredSnapshot.patchEnabled, false, "Expected Kawaii UI patch to stay removed after full VS Code restart");
        assert.equal(restoredSnapshot.scriptTagCount, 0, "Expected no Kawaii UI script tag after full VS Code restart");
        assert.equal(restoredSnapshot.html, state.baselineHtml, "Expected restored workbench HTML to equal the before state");
        assert.equal(restoredSnapshot.htmlHash, state.baselineHtmlHash, "Expected restored HTML hash to match the before state");

        const runtimeRestoredState = await waitForRuntimeNeonState(
            (runtimeState) => !runtimeState.hasChromeStyles && !runtimeState.hasThemeStyles,
            "Expected Neon runtime CSS to be gone after full VS Code restart"
        );

        assert.equal(runtimeRestoredState.hasOwnPaletteOnly, false, "Expected restored workbench to have no injected Neon palette");
        await takeE2EScreenshot("neon-real-restored-after-full-restart");
    });
});

function createVisualSettingsCase(id, options) {
    const bundle = createVisualSettingsBundle(BASE_SETTINGS_FIXTURE, options);

    return {
        id,
        bundle,
        source: {
            editorBackgroundImagePath: options.editorBackgroundImagePath,
            emptyEditorLogoImagePath: options.emptyEditorLogoImagePath
        },
        expected: createExpectedVisualEffects(bundle)
    };
}

function createVisualCaseWithEditorBackgroundOverrides(visualCase, overrides) {
    const expected = { ...visualCase.expected };

    if (Object.prototype.hasOwnProperty.call(overrides, "editorBackgroundOpacity")) {
        expected.editorBackgroundOpacity = String(overrides.editorBackgroundOpacity);
    }

    if (Object.prototype.hasOwnProperty.call(overrides, "editorBackgroundFit")) {
        expected.editorBackgroundFit = overrides.editorBackgroundFit;
        expected.editorBackgroundFitArea = getExpectedEditorBackgroundFitArea(overrides.editorBackgroundFit);
    }

    return {
        ...visualCase,
        id: `${visualCase.id}-${expected.editorBackgroundFit}-${expected.editorBackgroundOpacity}`,
        expected
    };
}

function createVisualSettingsBundle(baseBundle, options) {
    const bundle = JSON.parse(JSON.stringify(baseBundle));
    const editorBackgroundExtension = path.extname(options.editorBackgroundImagePath).slice(1).toLowerCase();
    const emptyEditorLogoExtension = path.extname(options.emptyEditorLogoImagePath).slice(1).toLowerCase();

    bundle.effects.editorBackground.opacity = 0.3;
    bundle.effects.editorBackground.fit = options.editorBackgroundFit || "full";
    bundle.effects.editorBackground.image = createImageExport(
        options.editorBackgroundImagePath,
        `editor-background-image.${editorBackgroundExtension}`
    );
    bundle.activeThemeVariantId = "dark";
    bundle.activeThemeLabel = "Kawaii VS Code Color";
    bundle.effects.emptyEditorLogo.opacity = 1;
    bundle.effects.emptyEditorLogo.image = createImageExport(
        options.emptyEditorLogoImagePath,
        `empty-editor-logo-image.${emptyEditorLogoExtension}`
    );

    return bundle;
}

function createExpectedVisualEffects(bundle) {
    const editorBackgroundImage = bundle.effects.editorBackground.image;
    const emptyEditorLogoImage = bundle.effects.emptyEditorLogo.image;

    return {
        editorBackgroundDataUrl: createDataUrl(editorBackgroundImage),
        editorBackgroundOpacity: String(bundle.effects.editorBackground.opacity),
        editorBackgroundFit: bundle.effects.editorBackground.fit,
        editorBackgroundFitArea: getExpectedEditorBackgroundFitArea(bundle.effects.editorBackground.fit),
        editorBackgroundOriginalName: editorBackgroundImage.originalName,
        editorBackgroundMimeType: editorBackgroundImage.mimeType,
        emptyEditorLogoDataUrl: createDataUrl(emptyEditorLogoImage),
        emptyEditorLogoOpacity: String(bundle.effects.emptyEditorLogo.opacity),
        emptyEditorLogoOriginalName: emptyEditorLogoImage.originalName,
        emptyEditorLogoMimeType: emptyEditorLogoImage.mimeType
    };
}

function createDataUrl(imageExport) {
    return `data:${imageExport.mimeType};base64,${imageExport.dataBase64}`;
}

function createImageExport(imagePath, storedFileName) {
    const imageBuffer = fs.readFileSync(imagePath);
    const extension = path.extname(imagePath).slice(1).toLowerCase();

    return {
        fileName: storedFileName,
        originalName: path.basename(imagePath),
        mimeType: getImageMimeType(extension),
        extension,
        size: imageBuffer.length,
        dataBase64: imageBuffer.toString("base64")
    };
}

function getImageMimeType(extension) {
    const mimeTypes = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp"
    };

    return mimeTypes[extension] || "application/octet-stream";
}

async function captureBaselineEmptyEditorLogoVisualState() {
    await runCommand("View: Close All Editors");
    await sleep(2000);
    await clearTransientWorkbenchNotifications();

    const runtimeState = await waitForRuntimeNeonState(
        (state) => state.emptyEditorLogoRect && state.emptyEditorLogoRect.width > 20 && state.emptyEditorLogoRect.height > 20,
        "Expected default VS Code empty editor watermark before applying Neon"
    );
    const screenshotPath = await takeE2EScreenshot("neon-real-before-apply-watermark");

    return { screenshotPath, runtimeState };
}

async function captureAppliedEmptyEditorLogoVisualState(visualCase, screenshotName) {
    await runCommand("View: Close All Editors");
    await sleep(2000);
    await clearTransientWorkbenchNotifications();

    const runtimeState = await waitForRuntimeNeonState(
        (state) =>
            state.hasChromeStyles
            && state.hasThemeStyles
            && state.hasKawaiiThemeWrapper
            && state.hasThemeWrapperClass
            && state.usesEditorTokens
            && !state.hasOwnPaletteOnly
            && state.hasExpectedEditorBackgroundImage
            && state.hasExpectedEditorBackgroundOpacity
            && state.hasExpectedEditorBackgroundFit
            && state.hasExpectedEmptyEditorLogoImage
            && state.hasExpectedEmptyEditorLogoOpacity,
        `Expected ${visualCase.id} Neon chrome CSS to be active after full VS Code restart`,
        visualCase
    );
    const screenshotPath = await takeE2EScreenshot(screenshotName);

    assert.equal(runtimeState.hasThemeWrapperClass, true, `Expected ${visualCase.id} Kawaii theme wrapper class after restart`);
    assert.equal(runtimeState.hasOwnPaletteOnly, false, `Expected ${visualCase.id} runtime CSS to keep VS Code editor tokens`);
    assert.equal(runtimeState.hasExpectedEditorBackgroundImage, true, `Expected runtime CSS to include ${visualCase.id} editor background image data URL`);
    assert.equal(runtimeState.hasExpectedEmptyEditorLogoImage, true, `Expected runtime CSS to apply ${visualCase.id} no-tab logo image data URL to the real watermark target`);
    assert.ok(runtimeState.emptyEditorLogoActiveFallbackId, `Expected a known no-page logo fallback selector to be active. Runtime state: ${JSON.stringify(runtimeState.emptyEditorLogoFallbackMatches)}`);
    assert.equal(runtimeState.hasExpectedEditorBackgroundOpacity, true, `Expected runtime CSS to include ${visualCase.id} background opacity`);
    assert.equal(runtimeState.hasExpectedEditorBackgroundFit, true, `Expected runtime CSS to include ${visualCase.id} background fit area`);
    assert.equal(runtimeState.hasExpectedEmptyEditorLogoOpacity, true, `Expected runtime CSS to include ${visualCase.id} no-tab logo opacity`);

    return { screenshotPath, runtimeState };
}

async function captureAppliedEditorBackgroundVisualState(visualCase, screenshotName) {
    await openUntitledTextEditorPage();
    await sleep(1000);
    await clearTransientWorkbenchNotifications();

    try {
        const runtimeState = await waitForRuntimeNeonState(
            (state) =>
                state.hasChromeStyles
                && state.hasThemeStyles
                && state.hasKawaiiThemeWrapper
                && state.hasThemeWrapperClass
                && state.usesEditorTokens
                && !state.hasOwnPaletteOnly
                && state.hasExpectedEditorBackgroundImage
                && state.hasExpectedEditorBackgroundImageOnEditor
                && state.hasExpectedEditorBackgroundOpacity
                && state.hasExpectedEditorBackgroundPseudoOpacity
                && state.hasExpectedEditorBackgroundFit
                && state.editorBackgroundRect
                && state.editorBackgroundRect.width > 100
                && state.editorBackgroundRect.height > 100,
            `Expected ${visualCase.id} editor page background to be active on a real editor after full VS Code restart`,
            visualCase
        );
        const screenshotPath = await takeE2EScreenshot(screenshotName);

        assert.equal(runtimeState.hasThemeWrapperClass, true, `Expected ${visualCase.id} Kawaii theme wrapper class with an editor page open`);
        assert.equal(runtimeState.hasOwnPaletteOnly, false, `Expected ${visualCase.id} editor page runtime CSS to keep VS Code editor tokens`);
        assert.equal(runtimeState.hasExpectedEditorBackgroundImageOnEditor, true, `Expected ${visualCase.id} editor background image data URL on the real Monaco editor pseudo-element`);
        assert.equal(runtimeState.hasExpectedEditorBackgroundPseudoOpacity, true, `Expected ${visualCase.id} editor background pseudo-element opacity`);

        return { screenshotPath, runtimeState };
    } finally {
        await runCommand("View: Close All Editors").catch(() => undefined);
        await sleep(500);
    }
}

async function captureEditorBackgroundFitMatrixVisualState(visualCase, screenshotPrefix) {
    await openUntitledTextEditorPage();
    await sleep(1000);
    await clearTransientWorkbenchNotifications();

    try {
        await waitForRuntimeNeonState(
            (state) =>
                state.hasChromeStyles
                && state.hasThemeStyles
                && state.hasKawaiiThemeWrapper
                && state.hasExpectedEditorBackgroundImageOnEditor
                && state.editorBackgroundRect
                && state.editorBackgroundRect.width > 100
                && state.editorBackgroundRect.height > 100,
            `Expected ${visualCase.id} editor page background before capturing the fit matrix`,
            visualCase
        );

        const baselineVisualCase = createVisualCaseWithEditorBackgroundOverrides(visualCase, {
            editorBackgroundOpacity: "0",
            editorBackgroundFit: "full"
        });
        await applyRuntimeEditorBackgroundVisualOverride({
            editorBackgroundOpacity: baselineVisualCase.expected.editorBackgroundOpacity,
            editorBackgroundFit: baselineVisualCase.expected.editorBackgroundFit
        });
        const baselineRuntimeState = await waitForRuntimeNeonState(
            (state) =>
                state.hasExpectedEditorBackgroundImageOnEditor
                && state.hasExpectedEditorBackgroundPseudoOpacity
                && state.hasExpectedEditorBackgroundFit
                && state.editorBackgroundRect
                && state.editorBackgroundRect.width > 100
                && state.editorBackgroundRect.height > 100,
            `Expected ${visualCase.id} editor page background no-overlay baseline for fit matrix`,
            baselineVisualCase,
            10000,
            {
                allowRuntimeEditorBackgroundFitOverride: true,
                allowRuntimeEditorBackgroundOpacityOverride: true
            }
        );
        await clearTransientWorkbenchNotifications();
        const baselineScreenshotPath = await takeE2EScreenshot(`${screenshotPrefix}-before-no-overlay`);
        const baselineState = {
            screenshotPath: baselineScreenshotPath,
            runtimeState: baselineRuntimeState
        };
        const fits = {};
        const analyses = {};

        for (const fit of EDITOR_BACKGROUND_FIT_OPTIONS) {
            const fitVisualCase = createVisualCaseWithEditorBackgroundOverrides(visualCase, {
                editorBackgroundOpacity: visualCase.expected.editorBackgroundOpacity,
                editorBackgroundFit: fit
            });

            await applyRuntimeEditorBackgroundVisualOverride({
                editorBackgroundOpacity: fitVisualCase.expected.editorBackgroundOpacity,
                editorBackgroundFit: fit
            });

            const runtimeState = await waitForRuntimeNeonState(
                (state) =>
                    state.hasExpectedEditorBackgroundImageOnEditor
                    && state.hasExpectedEditorBackgroundPseudoOpacity
                    && state.hasExpectedEditorBackgroundFit
                    && state.editorBackgroundRect
                    && state.editorBackgroundRect.width > 100
                    && state.editorBackgroundRect.height > 100,
                `Expected ${visualCase.id} editor page background fit ${fit} to be active before screenshot`,
                fitVisualCase,
                10000,
                { allowRuntimeEditorBackgroundFitOverride: true }
            );
            await clearTransientWorkbenchNotifications();
            const screenshotPath = await takeE2EScreenshot(`${screenshotPrefix}-${fit}`);
            const fitState = { screenshotPath, runtimeState };
            const analysis = compareEditorBackgroundFitScreenshot(baselineState, fitState, fit);

            assert.ok(
                analysis.hasVisualChangeInExpectedArea,
                `Expected visual change for editor background fit ${fit}. Analysis: ${JSON.stringify(analysis)}`
            );
            assert.ok(
                analysis.hasPositionCompatibleWithFit,
                `Expected editor background fit ${fit} visual change to be concentrated in the configured area. Analysis: ${JSON.stringify(analysis)}`
            );

            fits[fit] = fitState;
            analyses[fit] = analysis;
        }

        return { baseline: baselineState, fits, analyses };
    } finally {
        await runCommand("View: Close All Editors").catch(() => undefined);
        await sleep(500);
    }
}

async function applyRuntimeEditorBackgroundVisualOverride(options) {
    const fitArea = Object.prototype.hasOwnProperty.call(options, "editorBackgroundFit")
        ? getExpectedEditorBackgroundFitArea(options.editorBackgroundFit)
        : undefined;
    const opacity = Object.prototype.hasOwnProperty.call(options, "editorBackgroundOpacity")
        ? String(options.editorBackgroundOpacity)
        : undefined;

    const result = await VSBrowser.instance.driver.executeScript(`
        const fitArea = arguments[0];
        const opacity = arguments[1];
        const fitProperties = ['top', 'right', 'bottom', 'left', 'width', 'height'];
        const themeSelectors = [
            '[class~="vs-dark"][class*="kawaii_synthwave-generated-color-theme-json"]',
            '[class~="vs-dark"][class*="kawaii-synthwave-generated-color-theme-json"]',
            '[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"]',
            '[class~="vs"][class*="kawaii_synthwave-generated-color-theme-light-json"]',
            '[class~="vs"][class*="kawaii-synthwave-generated-color-theme-light-json"]',
            '[class~="vs"][class*="kawaii-vscode-color-generated-color-theme-light-json"]'
        ];
        const themeWrapper = document.querySelector(themeSelectors.join(', '));
        if (!themeWrapper) {
            return { applied: false, reason: 'missing-theme-wrapper' };
        }

        if (fitArea) {
            for (const propertyName of fitProperties) {
                themeWrapper.style.setProperty(
                    '--kawaii-editor-background-area-' + propertyName,
                    fitArea[propertyName]
                );
            }
        }

        if (opacity !== undefined && opacity !== null) {
            themeWrapper.style.setProperty('--kawaii-editor-background-image-opacity', opacity);
        }

        const styles = window.getComputedStyle(themeWrapper);
        const fitAreaValues = {};
        for (const propertyName of fitProperties) {
            fitAreaValues[propertyName] = styles.getPropertyValue('--kawaii-editor-background-area-' + propertyName).trim();
        }

        return {
            applied: true,
            fitAreaValues,
            opacity: styles.getPropertyValue('--kawaii-editor-background-image-opacity').trim()
        };
    `, fitArea || null, opacity);

    assert.equal(result.applied, true, `Expected runtime editor background override to apply. Result: ${JSON.stringify(result)}`);
    if (fitArea) {
        assert.deepEqual(result.fitAreaValues, fitArea, "Expected runtime editor background fit custom properties to match the requested area");
    }
    if (opacity !== undefined) {
        assert.equal(result.opacity, opacity, "Expected runtime editor background opacity custom property to match the requested opacity");
    }
}

async function openUntitledTextEditorPage() {
    await VSBrowser.instance.driver.switchTo().defaultContent();
    await VSBrowser.instance.driver.actions()
        .keyDown(Workbench.ctlKey)
        .sendKeys("n")
        .keyUp(Workbench.ctlKey)
        .perform();
}

async function applyVisualSettingsBundleAndEffects(visualCase, screenshotName) {
    await withSettingsWebview(async () => {
        await clickWebviewCss('.nav-button[data-page="color-settings"]');
        await assertWebviewPageVisible("color-settings-page");
        await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");

        await postWebviewE2EMessage({ type: "e2e-apply-settings-bundle", bundle: visualCase.bundle });
        await waitForWebviewTextIncludes("#effects-warning", "Settings restored from E2E bundle", 30000);
        await waitForWebviewTextIncludes("#editor-background-file", visualCase.expected.editorBackgroundOriginalName, 30000);
        await waitForWebviewTextIncludes("#empty-editor-logo-file", visualCase.expected.emptyEditorLogoOriginalName, 30000);

        assert.equal(await getWebviewInputValue("#theme-variant"), "dark");
        assert.equal(await getWebviewInputValue("#editor-background-opacity"), visualCase.expected.editorBackgroundOpacity);
        assert.equal(await getWebviewInputValue("#editor-background-fit"), visualCase.expected.editorBackgroundFit);
        assert.equal(await getWebviewInputValue("#empty-editor-logo-opacity"), visualCase.expected.emptyEditorLogoOpacity);

        if (screenshotName) {
            await takeE2EScreenshot(screenshotName);
        }

        await clickWebviewCss("#apply-effects");
    });
}

async function applyVisualSettingsThroughUiAndEffects(visualCase, screenshotName) {
    await withSettingsWebview(async () => {
        await clickWebviewCss('.nav-button[data-page="color-settings"]');
        await assertWebviewPageVisible("color-settings-page");
        await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");

        const preseedVisualCase = visualCase.id === ALTERNATE_VISUAL_CASE.id
            ? DSTGROUP_VISUAL_CASE
            : ALTERNATE_VISUAL_CASE;
        await postWebviewE2EMessage({ type: "e2e-apply-settings-bundle", bundle: preseedVisualCase.bundle });
        await waitForWebviewTextIncludes("#editor-background-file", preseedVisualCase.expected.editorBackgroundOriginalName, 30000);
        await waitForWebviewTextIncludes("#empty-editor-logo-file", preseedVisualCase.expected.emptyEditorLogoOriginalName, 30000);

        await postWebviewE2EMessage({
            type: "e2e-set-test-fixtures",
            fixtures: {
                editorBackgroundImagePath: visualCase.source.editorBackgroundImagePath,
                emptyEditorLogoImagePath: visualCase.source.emptyEditorLogoImagePath
            }
        });

        await clickWebviewCss("#editor-background-upload");
        await waitForWebviewTextIncludes("#editor-background-file", visualCase.expected.editorBackgroundOriginalName, 30000);
        await clickWebviewCss("#empty-editor-logo-upload");
        await waitForWebviewTextIncludes("#empty-editor-logo-file", visualCase.expected.emptyEditorLogoOriginalName, 30000);

        await setWebviewInputValue("#editor-background-opacity", visualCase.expected.editorBackgroundOpacity);
        await waitForWebviewInputValue("#editor-background-opacity", visualCase.expected.editorBackgroundOpacity, 20000);
        await setWebviewInputValue("#editor-background-fit", visualCase.expected.editorBackgroundFit);
        await waitForWebviewInputValue("#editor-background-fit", visualCase.expected.editorBackgroundFit, 20000);
        await setWebviewInputValue("#empty-editor-logo-opacity", visualCase.expected.emptyEditorLogoOpacity);
        await waitForWebviewInputValue("#empty-editor-logo-opacity", visualCase.expected.emptyEditorLogoOpacity, 20000);

        assert.equal(await getWebviewInputValue("#theme-variant"), "dark");

        if (screenshotName) {
            await takeE2EScreenshot(screenshotName);
        }

        await setVisualControlsAndApply(visualCase);
    });
}

async function setVisualControlsAndApply(visualCase) {
    const applied = await VSBrowser.instance.driver.executeScript(`
        const editorBackgroundOpacity = document.querySelector('#editor-background-opacity');
        const editorBackgroundFit = document.querySelector('#editor-background-fit');
        const emptyEditorLogoOpacity = document.querySelector('#empty-editor-logo-opacity');
        const applyEffects = document.querySelector('#apply-effects');

        if (!editorBackgroundOpacity || !editorBackgroundFit || !emptyEditorLogoOpacity || !applyEffects) {
            return false;
        }

        editorBackgroundOpacity.value = arguments[0];
        editorBackgroundFit.value = arguments[1];
        emptyEditorLogoOpacity.value = arguments[2];
        editorBackgroundOpacity.dispatchEvent(new Event('input', { bubbles: true }));
        editorBackgroundFit.dispatchEvent(new Event('change', { bubbles: true }));
        emptyEditorLogoOpacity.dispatchEvent(new Event('input', { bubbles: true }));
        applyEffects.click();
        return true;
    `,
        visualCase.expected.editorBackgroundOpacity,
        visualCase.expected.editorBackgroundFit,
        visualCase.expected.emptyEditorLogoOpacity
    );

    assert.equal(applied, true, "Expected visual controls to be set before Apply Effects");
}

async function clickNeonAction(buttonCss, screenshotName) {
    await withSettingsWebview(async () => {
        await clickWebviewCss('.nav-button[data-page="neon-effect"]');
        await assertWebviewPageVisible("neon-effect-page");
        await waitForWebviewTextIncludes("#neon-effect-page", "Enable Neon Effect");

        if (screenshotName) {
            await takeE2EScreenshot(screenshotName);
        }

        await clickWebviewCss(buttonCss);
    });
}

function findDisposableWorkbenchPatchPaths() {
    assertInsideDisposableStorage(NEON_STORAGE);

    const archiveRoot = path.join(NEON_STORAGE, "VSCode-win32-x64-archive");
    const candidates = [
        path.join(archiveRoot, "resources", "app", "out", "vs", "code")
    ];

    if (fs.existsSync(archiveRoot)) {
        for (const entry of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                candidates.push(path.join(archiveRoot, entry.name, "resources", "app", "out", "vs", "code"));
            }
        }
    }

    for (const candidate of candidates) {
        const resolvedPaths = resolveWorkbenchPatchPaths(candidate);
        if (resolvedPaths) {
            assertInsideDisposableStorage(resolvedPaths.htmlFile);
            assertInsideDisposableStorage(resolvedPaths.templateFile);
            return resolvedPaths;
        }
    }

    assert.fail(`Could not find disposable VS Code workbench under ${archiveRoot}`);
}

function ensureCleanWorkbenchBaseline(paths) {
    const initialSnapshot = readPatchSnapshot(paths);

    if (!initialSnapshot.patchEnabled) {
        return initialSnapshot;
    }

    const cleanHtml = removeWorkbenchPatchScriptTag(initialSnapshot.html);
    fs.writeFileSync(paths.htmlFile, cleanHtml, "utf-8");

    const cleanSnapshot = readPatchSnapshot(paths);
    assert.equal(cleanSnapshot.patchEnabled, false, "Expected pre-test cleanup to remove existing Kawaii UI patch");
    return cleanSnapshot;
}

async function waitForPatchSnapshot(paths, predicate, message, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const snapshot = readPatchSnapshot(paths);
        if (predicate(snapshot)) {
            return snapshot;
        }

        await sleep(250);
    }

    const latestSnapshot = readPatchSnapshot(paths);
    assert.fail(`${message}. Latest snapshot: ${JSON.stringify({
        htmlHash: latestSnapshot.htmlHash,
        patchEnabled: latestSnapshot.patchEnabled,
        scriptTagCount: latestSnapshot.scriptTagCount,
        templateExists: latestSnapshot.templateExists
    })}`);
}

function readPatchSnapshot(paths) {
    const html = fs.readFileSync(paths.htmlFile, "utf-8");
    const templateExists = fs.existsSync(paths.templateFile);
    const template = templateExists ? fs.readFileSync(paths.templateFile, "utf-8") : "";

    return {
        html,
        htmlHash: sha256(html),
        patchEnabled: isWorkbenchPatchEnabled(html),
        scriptTagCount: (html.match(/<!-- KAWAII VSCODE COLORS UI -->/g) || []).length,
        template,
        templateExists,
        templateHash: templateExists ? sha256(template) : ""
    };
}

function assertAppliedTemplateUsesEditorTokens(template) {
    assert.match(template, /kawaii_synthwave-chrome-styles/);
    assert.match(template, /kawaii_synthwave-theme-styles/);
    assert.match(template, /var\(--vscode-editor-background/);
    assert.match(template, /var\(--vscode-tab-activeBorder/);
    assert.doesNotMatch(template, /\[(?:CHROME_STYLES|DISABLE_GLOW|NEON_BRIGHTNESS)\]/);
}

function assertAppliedTemplateIncludesVisualEffects(template, visualCase) {
    assert.ok(
        template.includes(visualCase.expected.editorBackgroundDataUrl),
        `Expected ${visualCase.id} editor background image data URL in generated Kawaii UI script`
    );
    assert.ok(
        template.includes(visualCase.expected.emptyEditorLogoDataUrl),
        `Expected ${visualCase.id} empty editor logo data URL in generated Kawaii UI script`
    );
    assert.ok(
        template.includes(`--kawaii-editor-background-image: url("${visualCase.expected.editorBackgroundDataUrl}`),
        `Expected ${visualCase.id} editor background image declaration in generated Kawaii UI script`
    );
    assert.match(template, new RegExp(`--kawaii-editor-background-image-opacity:\\s*${escapeRegExp(visualCase.expected.editorBackgroundOpacity)}`));
    assertAppliedTemplateIncludesEditorBackgroundFitArea(template, visualCase);
    assert.ok(
        template.includes(`background-image: url("${visualCase.expected.emptyEditorLogoDataUrl}`),
        `Expected ${visualCase.id} empty editor logo background declaration in generated Kawaii UI script`
    );
    assert.match(template, new RegExp(`opacity:\\s*${escapeRegExp(visualCase.expected.emptyEditorLogoOpacity)}`));
    assert.doesNotMatch(template, /\[(?:EDITOR_BACKGROUND_IMAGE|EDITOR_BACKGROUND_IMAGE_OPACITY|EDITOR_BACKGROUND_IMAGE_POSITION|EDITOR_BACKGROUND_IMAGE_SIZE|EDITOR_BACKGROUND_IMAGE_REPEAT|EDITOR_BACKGROUND_AREA_TOP|EDITOR_BACKGROUND_AREA_RIGHT|EDITOR_BACKGROUND_AREA_BOTTOM|EDITOR_BACKGROUND_AREA_LEFT|EDITOR_BACKGROUND_AREA_WIDTH|EDITOR_BACKGROUND_AREA_HEIGHT|EMPTY_EDITOR_LOGO_STYLES)\]/);
}

function assertAppliedTemplateIncludesEditorBackgroundFitArea(template, visualCase) {
    for (const [propertyName, expectedValue] of Object.entries(visualCase.expected.editorBackgroundFitArea)) {
        assert.match(
            template,
            new RegExp(`--kawaii-editor-background-area-${propertyName}:\\s*${escapeRegExp(expectedValue)}`),
            `Expected ${visualCase.id} editor background ${propertyName} area to be ${expectedValue}`
        );
    }
}

async function waitForRuntimeNeonState(predicate, message, visualCase = DSTGROUP_VISUAL_CASE, timeoutMs = 30000, options = {}) {
    const deadline = Date.now() + timeoutMs;
    let latestState;

    while (Date.now() < deadline) {
        await VSBrowser.instance.driver.switchTo().defaultContent();
        latestState = await getRuntimeNeonState(visualCase, options).catch((error) => ({
            error: error && error.message ? error.message : String(error)
        }));

        if (latestState && predicate(latestState)) {
            return latestState;
        }

        await sleep(250);
    }

    assert.fail(`${message}. Latest runtime state: ${JSON.stringify(latestState)}`);
}

async function getRuntimeNeonState(visualCase, options = {}) {
    return VSBrowser.instance.driver.executeScript(`
        const expectedEditorBackgroundDataUrl = arguments[0];
        const expectedEmptyEditorLogoDataUrl = arguments[1];
        const expectedEditorBackgroundOpacity = arguments[2];
        const expectedEmptyEditorLogoOpacity = arguments[3];
        const expectedEditorBackgroundFitArea = arguments[4];
        const emptyEditorLogoSelectors = arguments[5];
        const emptyEditorLogoFallbackCases = arguments[6];
        const allowRuntimeEditorBackgroundFitOverride = arguments[7];
        const allowRuntimeEditorBackgroundOpacityOverride = arguments[8];
        const editorBackgroundFitProperties = ['top', 'right', 'bottom', 'left', 'width', 'height'];
        const themeSelectors = [
            '[class~="vs-dark"][class*="kawaii_synthwave-generated-color-theme-json"]',
            '[class~="vs-dark"][class*="kawaii-synthwave-generated-color-theme-json"]',
            '[class~="vs-dark"][class*="kawaii-vscode-color-generated-color-theme-json"]',
            '[class~="vs"][class*="kawaii_synthwave-generated-color-theme-light-json"]',
            '[class~="vs"][class*="kawaii-synthwave-generated-color-theme-light-json"]',
            '[class~="vs"][class*="kawaii-vscode-color-generated-color-theme-light-json"]'
        ];
        const themeWrapper = document.querySelector(themeSelectors.join(', '));
        const chromeStyles = document.querySelector('#kawaii_synthwave-chrome-styles');
        const themeStyles = document.querySelector('#kawaii_synthwave-theme-styles');
        const themeWrapperStyles = themeWrapper ? window.getComputedStyle(themeWrapper) : null;
        const chromeText = chromeStyles ? chromeStyles.textContent || '' : '';
        const themeText = themeStyles ? themeStyles.textContent || '' : '';
        const injectedText = chromeText + themeText;
        const editorBackgroundFitAreaValues = {};
        const editorBackgroundOpacityValue = themeWrapperStyles
            ? themeWrapperStyles.getPropertyValue('--kawaii-editor-background-image-opacity').trim()
            : '';
        const hasExpectedEditorBackgroundFit = editorBackgroundFitProperties.every((propertyName) => {
            const cssPropertyName = '--kawaii-editor-background-area-' + propertyName;
            const expectedValue = expectedEditorBackgroundFitArea[propertyName];
            const runtimeValue = themeWrapperStyles ? themeWrapperStyles.getPropertyValue(cssPropertyName).trim() : '';
            const spacedDeclaration = cssPropertyName + ': ' + expectedValue;
            const compactDeclaration = cssPropertyName + ':' + expectedValue;

            editorBackgroundFitAreaValues[propertyName] = runtimeValue;

            return runtimeValue === expectedValue
                && (
                    allowRuntimeEditorBackgroundFitOverride
                    || chromeText.includes(spacedDeclaration)
                    || chromeText.includes(compactDeclaration)
                );
        });
        const hasExpectedEditorBackgroundOpacity = allowRuntimeEditorBackgroundOpacityOverride
            ? editorBackgroundOpacityValue === expectedEditorBackgroundOpacity
            : new RegExp('--kawaii-editor-background-image-opacity:\\\\s*' + expectedEditorBackgroundOpacity.replace('.', '\\\\.')).test(chromeText);
        const editorTargets = Array.from(document.querySelectorAll('.monaco-editor')).filter((element) => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            return rect.width > 100 && rect.height > 100 && styles.display !== 'none' && styles.visibility !== 'hidden';
        });
        const editorTarget = editorTargets.find((element) => {
            const styles = window.getComputedStyle(element, '::before');
            return styles.backgroundImage.includes(expectedEditorBackgroundDataUrl);
        }) || editorTargets[0];
        const editorTargetStyles = editorTarget ? window.getComputedStyle(editorTarget, '::before') : null;
        const editorTargetRect = editorTarget ? editorTarget.getBoundingClientRect() : null;
        const logoTargets = Array.from(document.querySelectorAll(emptyEditorLogoSelectors.join(', ')));
        const logoTarget = logoTargets.find((element) => {
            const styles = window.getComputedStyle(element);
            return styles.backgroundImage.includes(expectedEmptyEditorLogoDataUrl);
        }) || logoTargets[0];
        const logoTargetStyles = logoTarget ? window.getComputedStyle(logoTarget) : null;
        const logoTargetRect = logoTarget ? logoTarget.getBoundingClientRect() : null;
        const emptyEditorLogoFallbackMatches = emptyEditorLogoFallbackCases.map((fallbackCase) => {
            const matches = Array.from(document.querySelectorAll(fallbackCase.selector));
            const expectedImageMatches = matches.filter((element) => {
                const styles = window.getComputedStyle(element);
                return styles.backgroundImage.includes(expectedEmptyEditorLogoDataUrl);
            });

            return {
                id: fallbackCase.id,
                selector: fallbackCase.selector,
                count: matches.length,
                expectedImageCount: expectedImageMatches.length
            };
        });
        const activeFallback = emptyEditorLogoFallbackMatches.find((fallbackCase) => fallbackCase.expectedImageCount > 0)
            || emptyEditorLogoFallbackMatches.find((fallbackCase) => fallbackCase.count > 0);
        return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            hasChromeStyles: Boolean(chromeStyles),
            hasThemeStyles: Boolean(themeStyles),
            hasKawaiiThemeWrapper: Boolean(themeWrapper),
            hasThemeWrapperClass: Boolean(themeWrapper && /kawaii/i.test(themeWrapper.className || '')),
            usesEditorTokens: /var\\(--vscode-/.test(injectedText),
            hasOwnPaletteOnly: Boolean(injectedText) && !/var\\(--vscode-/.test(injectedText),
            hasExpectedEditorBackgroundImage: injectedText.includes(expectedEditorBackgroundDataUrl),
            hasExpectedEditorBackgroundImageOnEditor: Boolean(editorTargetStyles && editorTargetStyles.backgroundImage.includes(expectedEditorBackgroundDataUrl)),
            hasExpectedEmptyEditorLogoImage: Boolean(logoTargetStyles && logoTargetStyles.backgroundImage.includes(expectedEmptyEditorLogoDataUrl)),
            editorBackgroundTargetCount: editorTargets.length,
            editorBackgroundTargetClassName: editorTarget ? editorTarget.className : '',
            editorBackgroundPseudoBackgroundImageLength: editorTargetStyles ? editorTargetStyles.backgroundImage.length : 0,
            editorBackgroundPseudoOpacity: editorTargetStyles ? editorTargetStyles.opacity : '',
            editorBackgroundOpacityValue,
            editorBackgroundFitAreaValues,
            editorBackgroundRect: editorTargetRect ? {
                left: editorTargetRect.left,
                top: editorTargetRect.top,
                width: editorTargetRect.width,
                height: editorTargetRect.height
            } : null,
            emptyEditorLogoTargetCount: logoTargets.length,
            emptyEditorLogoTargetClassName: logoTarget ? logoTarget.className : '',
            emptyEditorLogoFallbackMatches,
            emptyEditorLogoActiveFallbackId: activeFallback ? activeFallback.id : '',
            emptyEditorLogoTargetBackgroundImageLength: logoTargetStyles ? logoTargetStyles.backgroundImage.length : 0,
            emptyEditorLogoRect: logoTargetRect ? {
                left: logoTargetRect.left,
                top: logoTargetRect.top,
                width: logoTargetRect.width,
                height: logoTargetRect.height
            } : null,
            hasExpectedEditorBackgroundOpacity,
            hasExpectedEditorBackgroundFit,
            hasExpectedEditorBackgroundPseudoOpacity: Boolean(editorTargetStyles && editorTargetStyles.opacity === expectedEditorBackgroundOpacity),
            hasExpectedEmptyEditorLogoOpacity: Boolean(logoTargetStyles && logoTargetStyles.opacity === expectedEmptyEditorLogoOpacity)
        };
    `,
        visualCase.expected.editorBackgroundDataUrl,
        visualCase.expected.emptyEditorLogoDataUrl,
        visualCase.expected.editorBackgroundOpacity,
        visualCase.expected.emptyEditorLogoOpacity,
        visualCase.expected.editorBackgroundFitArea,
        EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS,
        EMPTY_EDITOR_LOGO_FALLBACK_VERSION_CASES,
        Boolean(options.allowRuntimeEditorBackgroundFitOverride),
        Boolean(options.allowRuntimeEditorBackgroundOpacityOverride)
    );
}

function compareEditorBackgroundFitScreenshot(beforeState, afterState, fit) {
    assert.ok(beforeState && beforeState.screenshotPath, "Expected before editor background fit screenshot state.");
    assert.ok(afterState && afterState.screenshotPath, "Expected after editor background fit screenshot state.");

    const differences = getEditorBackgroundCropLuminanceDifferences(
        beforeState.screenshotPath,
        afterState.screenshotPath,
        afterState.runtimeState
    );
    const expectedRegion = getEditorBackgroundFitGridRegion(fit, differences.gridWidth, differences.gridHeight);
    let expectedDifferenceTotal = 0;
    let unexpectedDifferenceTotal = 0;
    let expectedChangedPixels = 0;
    let unexpectedChangedPixels = 0;
    let expectedCount = 0;
    let unexpectedCount = 0;

    for (const sample of differences.samples) {
        const isExpected = expectedRegion(sample.column, sample.row);
        if (isExpected) {
            expectedDifferenceTotal += sample.difference;
            expectedCount += 1;
            if (sample.difference > 6) {
                expectedChangedPixels += 1;
            }
        } else {
            unexpectedDifferenceTotal += sample.difference;
            unexpectedCount += 1;
            if (sample.difference > 6) {
                unexpectedChangedPixels += 1;
            }
        }
    }

    const expectedMeanDifference = expectedCount > 0 ? expectedDifferenceTotal / expectedCount : 0;
    const unexpectedMeanDifference = unexpectedCount > 0 ? unexpectedDifferenceTotal / unexpectedCount : 0;
    const expectedChangedRatio = expectedCount > 0 ? expectedChangedPixels / expectedCount : 0;
    const unexpectedChangedRatio = unexpectedCount > 0 ? unexpectedChangedPixels / unexpectedCount : 0;
    const hasVisualChangeInExpectedArea = expectedCount > 0
        && expectedMeanDifference > 0.75
        && expectedChangedRatio > 0.01;
    const hasPositionCompatibleWithFit = unexpectedCount === 0
        ? hasVisualChangeInExpectedArea
        : hasVisualChangeInExpectedArea
            && expectedMeanDifference > unexpectedMeanDifference + 0.35
            && expectedChangedRatio > unexpectedChangedRatio + 0.005;

    return {
        beforeScreenshotPath: beforeState.screenshotPath,
        afterScreenshotPath: afterState.screenshotPath,
        crop: differences.crop,
        fit,
        expectedCount,
        unexpectedCount,
        expectedMeanDifference,
        unexpectedMeanDifference,
        expectedChangedRatio,
        unexpectedChangedRatio,
        hasVisualChangeInExpectedArea,
        hasPositionCompatibleWithFit
    };
}

function getEditorBackgroundFitGridRegion(fit, gridWidth, gridHeight) {
    const halfWidth = gridWidth / 2;
    const halfHeight = gridHeight / 2;

    switch (fit) {
        case "top":
            return (_column, row) => row < halfHeight;
        case "bottom":
            return (_column, row) => row >= halfHeight;
        case "left":
            return (column) => column < halfWidth;
        case "right":
            return (column) => column >= halfWidth;
        case "top-left":
            return (column, row) => column < halfWidth && row < halfHeight;
        case "top-right":
            return (column, row) => column >= halfWidth && row < halfHeight;
        case "bottom-left":
            return (column, row) => column < halfWidth && row >= halfHeight;
        case "bottom-right":
            return (column, row) => column >= halfWidth && row >= halfHeight;
        default:
            return () => true;
    }
}

function compareEditorBackgroundScreenshots(beforeState, afterState) {
    assert.ok(beforeState && beforeState.screenshotPath, "Expected before editor background screenshot state.");
    assert.ok(afterState && afterState.screenshotPath, "Expected after editor background screenshot state.");

    const beforeSamples = getEditorBackgroundCropLuminanceSamples(beforeState.screenshotPath, beforeState.runtimeState);
    const afterSamples = getEditorBackgroundCropLuminanceSamples(afterState.screenshotPath, afterState.runtimeState);
    const sampleCount = Math.min(beforeSamples.samples.length, afterSamples.samples.length);
    let changedPixels = 0;
    let totalDifference = 0;
    let maxDifference = 0;

    for (let index = 0; index < sampleCount; index++) {
        const difference = Math.abs(beforeSamples.samples[index] - afterSamples.samples[index]);

        totalDifference += difference;
        maxDifference = Math.max(maxDifference, difference);

        if (difference > 6) {
            changedPixels += 1;
        }
    }

    const meanDifference = sampleCount > 0 ? totalDifference / sampleCount : 0;
    const changedRatio = sampleCount > 0 ? changedPixels / sampleCount : 0;

    return {
        beforeScreenshotPath: beforeState.screenshotPath,
        afterScreenshotPath: afterState.screenshotPath,
        beforeCrop: beforeSamples.crop,
        afterCrop: afterSamples.crop,
        sampleCount,
        meanDifference,
        maxDifference,
        changedRatio,
        hasVisualChange: sampleCount > 1000
            && meanDifference > 1
            && maxDifference > 10
            && changedRatio > 0.01
    };
}

function getExpectedEditorBackgroundFitArea(fit) {
    return EDITOR_BACKGROUND_FIT_AREAS[fit] || EDITOR_BACKGROUND_FIT_AREAS.full;
}

function getEditorBackgroundCropLuminanceDifferences(beforeScreenshotPath, afterScreenshotPath, runtimeState) {
    const rect = runtimeState && runtimeState.editorBackgroundRect;

    assert.ok(rect && rect.width > 100 && rect.height > 100, `Expected a measurable editor background rect. Runtime state: ${JSON.stringify(runtimeState)}`);

    const beforePng = decodePng(beforeScreenshotPath);
    const afterPng = decodePng(afterScreenshotPath);

    assert.equal(afterPng.width, beforePng.width, "Expected before/after screenshots to have the same width.");
    assert.equal(afterPng.height, beforePng.height, "Expected before/after screenshots to have the same height.");

    const scaleX = afterPng.width / runtimeState.viewportWidth;
    const scaleY = afterPng.height / runtimeState.viewportHeight;
    const crop = {
        left: clamp(Math.floor(rect.left * scaleX), 0, afterPng.width - 1),
        top: clamp(Math.floor(rect.top * scaleY), 0, afterPng.height - 1),
        right: clamp(Math.ceil((rect.left + rect.width) * scaleX), 1, afterPng.width),
        bottom: clamp(Math.ceil((rect.top + rect.height) * scaleY), 1, afterPng.height)
    };
    const gridWidth = 48;
    const gridHeight = 48;
    const samples = [];

    for (let row = 0; row < gridHeight; row++) {
        for (let column = 0; column < gridWidth; column++) {
            const x = clamp(
                Math.floor(crop.left + ((column + 0.5) / gridWidth) * (crop.right - crop.left)),
                0,
                afterPng.width - 1
            );
            const y = clamp(
                Math.floor(crop.top + ((row + 0.5) / gridHeight) * (crop.bottom - crop.top)),
                0,
                afterPng.height - 1
            );
            const beforeLuminance = getPngPixelLuminance(beforePng, x, y);
            const afterLuminance = getPngPixelLuminance(afterPng, x, y);

            samples.push({
                column,
                row,
                difference: Math.abs(beforeLuminance - afterLuminance)
            });
        }
    }

    return { crop, gridWidth, gridHeight, samples };
}

function compareEmptyEditorLogoScreenshots(beforeState, afterState) {
    assert.ok(beforeState && beforeState.screenshotPath, "Expected baseline no-tab logo screenshot state.");
    assert.ok(afterState && afterState.screenshotPath, "Expected applied no-tab logo screenshot state.");

    const beforeSamples = getLogoCropLuminanceSamples(beforeState.screenshotPath, beforeState.runtimeState);
    const afterSamples = getLogoCropLuminanceSamples(afterState.screenshotPath, afterState.runtimeState);
    const sampleCount = Math.min(beforeSamples.samples.length, afterSamples.samples.length);
    let changedPixels = 0;
    let totalDifference = 0;
    let maxDifference = 0;

    for (let index = 0; index < sampleCount; index++) {
        const difference = Math.abs(beforeSamples.samples[index] - afterSamples.samples[index]);

        totalDifference += difference;
        maxDifference = Math.max(maxDifference, difference);

        if (difference > 8) {
            changedPixels += 1;
        }
    }

    const meanDifference = sampleCount > 0 ? totalDifference / sampleCount : 0;
    const changedRatio = sampleCount > 0 ? changedPixels / sampleCount : 0;

    return {
        beforeScreenshotPath: beforeState.screenshotPath,
        afterScreenshotPath: afterState.screenshotPath,
        beforeCrop: beforeSamples.crop,
        afterCrop: afterSamples.crop,
        sampleCount,
        meanDifference,
        maxDifference,
        changedRatio,
        hasVisualChangeFromDefault: sampleCount > 1000
            && meanDifference > 2
            && maxDifference > 20
            && changedRatio > 0.03
    };
}

function getEditorBackgroundCropLuminanceSamples(screenshotPath, runtimeState) {
    const rect = runtimeState && runtimeState.editorBackgroundRect;

    assert.ok(rect && rect.width > 100 && rect.height > 100, `Expected a measurable editor background rect. Runtime state: ${JSON.stringify(runtimeState)}`);

    const png = decodePng(screenshotPath);
    const scaleX = png.width / runtimeState.viewportWidth;
    const scaleY = png.height / runtimeState.viewportHeight;
    const crop = {
        left: clamp(Math.floor(rect.left * scaleX), 0, png.width - 1),
        top: clamp(Math.floor(rect.top * scaleY), 0, png.height - 1),
        right: clamp(Math.ceil((rect.left + rect.width) * scaleX), 1, png.width),
        bottom: clamp(Math.ceil((rect.top + rect.height) * scaleY), 1, png.height)
    };
    const gridWidth = 96;
    const gridHeight = 96;
    const samples = [];

    for (let row = 0; row < gridHeight; row++) {
        for (let column = 0; column < gridWidth; column++) {
            const x = clamp(
                Math.floor(crop.left + ((column + 0.5) / gridWidth) * (crop.right - crop.left)),
                0,
                png.width - 1
            );
            const y = clamp(
                Math.floor(crop.top + ((row + 0.5) / gridHeight) * (crop.bottom - crop.top)),
                0,
                png.height - 1
            );
            const offset = (y * png.width + x) * png.channels;
            const red = png.data[offset];
            const green = png.data[offset + 1];
            const blue = png.data[offset + 2];

            samples.push((0.2126 * red) + (0.7152 * green) + (0.0722 * blue));
        }
    }

    return { crop, samples };
}

function getLogoCropLuminanceSamples(screenshotPath, runtimeState) {
    const rect = runtimeState && runtimeState.emptyEditorLogoRect;

    assert.ok(rect && rect.width > 20 && rect.height > 20, `Expected a measurable no-tab logo rect. Runtime state: ${JSON.stringify(runtimeState)}`);

    const png = decodePng(screenshotPath);
    const scaleX = png.width / runtimeState.viewportWidth;
    const scaleY = png.height / runtimeState.viewportHeight;
    const crop = {
        left: clamp(Math.floor(rect.left * scaleX), 0, png.width - 1),
        top: clamp(Math.floor(rect.top * scaleY), 0, png.height - 1),
        right: clamp(Math.ceil((rect.left + rect.width) * scaleX), 1, png.width),
        bottom: clamp(Math.ceil((rect.top + rect.height) * scaleY), 1, png.height)
    };
    const gridWidth = 96;
    const gridHeight = 96;
    const samples = [];

    for (let row = 0; row < gridHeight; row++) {
        for (let column = 0; column < gridWidth; column++) {
            const x = clamp(
                Math.floor(crop.left + ((column + 0.5) / gridWidth) * (crop.right - crop.left)),
                0,
                png.width - 1
            );
            const y = clamp(
                Math.floor(crop.top + ((row + 0.5) / gridHeight) * (crop.bottom - crop.top)),
                0,
                png.height - 1
            );
            const offset = (y * png.width + x) * png.channels;
            const red = png.data[offset];
            const green = png.data[offset + 1];
            const blue = png.data[offset + 2];

            samples.push((0.2126 * red) + (0.7152 * green) + (0.0722 * blue));
        }
    }

    return { crop, samples };
}

function getPngPixelLuminance(png, x, y) {
    const offset = (y * png.width + x) * png.channels;
    const red = png.data[offset];
    const green = png.data[offset + 1];
    const blue = png.data[offset + 2];

    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function decodePng(filePath) {
    const input = fs.readFileSync(filePath);
    const signature = input.subarray(0, 8).toString("hex");

    assert.equal(signature, "89504e470d0a1a0a", `Expected PNG screenshot at ${filePath}`);

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idatChunks = [];

    while (offset < input.length) {
        const length = input.readUInt32BE(offset);
        const type = input.subarray(offset + 4, offset + 8).toString("ascii");
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;
        const chunkData = input.subarray(dataStart, dataEnd);

        if (type === "IHDR") {
            width = chunkData.readUInt32BE(0);
            height = chunkData.readUInt32BE(4);
            bitDepth = chunkData[8];
            colorType = chunkData[9];
        } else if (type === "IDAT") {
            idatChunks.push(chunkData);
        } else if (type === "IEND") {
            break;
        }

        offset = dataEnd + 4;
    }

    assert.equal(bitDepth, 8, "Screenshot PNG parser supports 8-bit screenshots.");
    assert.ok(colorType === 2 || colorType === 6, `Screenshot PNG parser supports RGB/RGBA screenshots, got color type ${colorType}.`);

    const channels = colorType === 6 ? 4 : 3;
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const stride = width * channels;
    const pixels = Buffer.alloc(width * height * channels);
    let inputOffset = 0;

    for (let y = 0; y < height; y++) {
        const filter = inflated[inputOffset];
        inputOffset += 1;
        const rowOffset = y * stride;
        const previousRowOffset = (y - 1) * stride;

        for (let x = 0; x < stride; x++) {
            const raw = inflated[inputOffset];
            inputOffset += 1;

            const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
            const up = y > 0 ? pixels[previousRowOffset + x] : 0;
            const upLeft = y > 0 && x >= channels ? pixels[previousRowOffset + x - channels] : 0;

            pixels[rowOffset + x] = (raw + getPngFilterValue(filter, left, up, upLeft)) & 0xff;
        }
    }

    return { width, height, channels, data: pixels };
}

function getPngFilterValue(filter, left, up, upLeft) {
    switch (filter) {
        case 0:
            return 0;
        case 1:
            return left;
        case 2:
            return up;
        case 3:
            return Math.floor((left + up) / 2);
        case 4:
            return paethPredictor(left, up, upLeft);
        default:
            throw new Error(`Unsupported PNG filter type: ${filter}`);
    }
}

function paethPredictor(left, up, upLeft) {
    const estimate = left + up - upLeft;
    const leftDistance = Math.abs(estimate - left);
    const upDistance = Math.abs(estimate - up);
    const upLeftDistance = Math.abs(estimate - upLeft);

    if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
        return left;
    }

    if (upDistance <= upLeftDistance) {
        return up;
    }

    return upLeft;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function writeState(state) {
    fs.mkdirSync(E2E_RESULTS_DIR, { recursive: true });
    fs.writeFileSync(NEON_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

function updateState(values) {
    writeState({
        ...readRequiredState(),
        ...values
    });
}

function readRequiredState() {
    const state = readStateIfExists();
    assert.ok(state, `Expected Neon E2E state file at ${NEON_STATE_FILE}`);
    return state;
}

function readStateIfExists() {
    if (!fs.existsSync(NEON_STATE_FILE)) {
        return undefined;
    }

    return JSON.parse(fs.readFileSync(NEON_STATE_FILE, "utf-8"));
}

function restoreBaselineIfNeeded(state) {
    if (!state.baselineHtml || !state.htmlFile) {
        return;
    }

    assertInsideDisposableStorage(state.htmlFile);

    if (!fs.existsSync(state.htmlFile)) {
        return;
    }

    const currentHtml = fs.readFileSync(state.htmlFile, "utf-8");
    if (currentHtml !== state.baselineHtml) {
        fs.writeFileSync(state.htmlFile, state.baselineHtml, "utf-8");
    }
}

function assertStateMatchesPatchPaths(state, patchPaths) {
    assert.equal(path.resolve(state.htmlFile), path.resolve(patchPaths.htmlFile));
    assert.equal(path.resolve(state.templateFile), path.resolve(patchPaths.templateFile));
}

function assertInsideDisposableStorage(filePath) {
    const root = path.resolve(DISPOSABLE_TEST_ROOT);
    const resolvedPath = path.resolve(filePath);
    assert.ok(
        resolvedPath === root || resolvedPath.startsWith(`${root}${path.sep}`),
        `Refusing to touch non-disposable VS Code path: ${resolvedPath}`
    );
}

function sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
