const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { VSBrowser } = require("vscode-extension-tester");

const {
    assertWebviewPageVisible,
    clickWebviewCss,
    getWebviewInputValue,
    runCommand,
    takeE2EScreenshot,
    waitForWebviewTextIncludes,
    withSettingsWebview
} = require("./helpers/extester-app");
const {
    isWorkbenchPatchEnabled,
    removeWorkbenchPatchScriptTag,
    resolveWorkbenchPatchPaths
} = require("../../src/workbenchPatch");
const {
    EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS
} = require("../../src/emptyEditorLogoStyles");

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
const DSTGROUP_VISUAL_CASE = createVisualSettingsCase("dstgroup", {
    editorBackgroundImagePath: path.join(DEV_IMAGES_DIR, "logo-page.png"),
    emptyEditorLogoImagePath: path.join(DEV_IMAGES_DIR, "logo-nopage.png")
});
const ALTERNATE_VISUAL_CASE = createVisualSettingsCase("alternate", {
    editorBackgroundImagePath: path.join(RANDOM_IMAGES_DIR, "felix-0008.jpg"),
    emptyEditorLogoImagePath: path.join(RANDOM_IMAGES_DIR, "felix-gamer-ah.webp")
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

        assert.equal(baselineSnapshot.patchEnabled, false, "Expected disposable workbench to start without Neon patch");
        assert.equal(baselineSnapshot.scriptTagCount, 0, "Expected no Neon script tag before applying");

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

        await applyVisualSettingsBundleAndEffects(DSTGROUP_VISUAL_CASE, "neon-real-before-apply-dstgroup");

        const appliedSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => snapshot.patchEnabled && snapshot.templateExists,
            "Expected Neon patch and generated template after applying effects"
        );

        assert.notEqual(appliedSnapshot.htmlHash, baselineSnapshot.htmlHash, "Expected workbench HTML to change after applying effects");
        assert.equal(appliedSnapshot.scriptTagCount, 1, "Expected exactly one Neon script tag after applying effects");
        assert.match(appliedSnapshot.html, /<!-- KAWAII SYNTHWAVE --><script src="neondreams\.js\?v=\d+"><\/script><!-- NEON DREAMS -->/);
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
        assert.equal(appliedSnapshot.patchEnabled, true, "Expected Neon patch to persist after full VS Code restart");
        assert.equal(appliedSnapshot.scriptTagCount, 1, "Expected one Neon script tag after full VS Code restart");
        assert.equal(appliedSnapshot.htmlHash, state.dstgroupHtmlHash, "Expected dstgroup HTML hash to persist across restart");
        assert.equal(appliedSnapshot.templateHash, state.dstgroupTemplateHash, "Expected dstgroup Neon script to persist across restart");
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

        await applyVisualSettingsBundleAndEffects(ALTERNATE_VISUAL_CASE, "neon-real-before-apply-alternate");

        const alternateSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => snapshot.patchEnabled
                && snapshot.templateExists
                && snapshot.templateHash !== state.dstgroupTemplateHash,
            "Expected alternate image settings to regenerate the Neon script"
        );

        assert.equal(alternateSnapshot.scriptTagCount, 1, "Expected exactly one Neon script tag after applying alternate image");
        assert.notEqual(alternateSnapshot.templateHash, state.dstgroupTemplateHash, "Expected alternate image to change generated Neon script content");
        assertAppliedTemplateUsesEditorTokens(alternateSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(alternateSnapshot.template, ALTERNATE_VISUAL_CASE);

        updateState({
            dstgroupLogoState,
            alternateHtmlHash: alternateSnapshot.htmlHash,
            alternateTemplateHash: alternateSnapshot.templateHash
        });
    });

    it("validates alternate image after full VS Code restart and reapplies dstgroup @neon-real-alternate", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const alternateSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(alternateSnapshot.patchEnabled, true, "Expected alternate Neon patch to persist after full VS Code restart");
        assert.equal(alternateSnapshot.scriptTagCount, 1, "Expected one Neon script tag after alternate full VS Code restart");
        assert.equal(alternateSnapshot.htmlHash, state.alternateHtmlHash, "Expected alternate HTML hash to persist across restart");
        assert.equal(alternateSnapshot.templateHash, state.alternateTemplateHash, "Expected alternate Neon script to persist across restart");
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

        await applyVisualSettingsBundleAndEffects(DSTGROUP_VISUAL_CASE, "neon-real-before-revert-dstgroup");

        const revertedDstgroupSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => snapshot.patchEnabled
                && snapshot.templateExists
                && snapshot.templateHash !== state.alternateTemplateHash,
            "Expected dstgroup settings to regenerate the Neon script after alternate image"
        );

        assert.equal(revertedDstgroupSnapshot.scriptTagCount, 1, "Expected exactly one Neon script tag after reverting to dstgroup");
        assert.equal(revertedDstgroupSnapshot.templateHash, state.dstgroupTemplateHash, "Expected reverting to dstgroup to restore the original generated Neon script content");
        assertAppliedTemplateUsesEditorTokens(revertedDstgroupSnapshot.template);
        assertAppliedTemplateIncludesVisualEffects(revertedDstgroupSnapshot.template, DSTGROUP_VISUAL_CASE);

        updateState({
            alternateLogoState,
            revertedDstgroupHtmlHash: revertedDstgroupSnapshot.htmlHash,
            revertedDstgroupTemplateHash: revertedDstgroupSnapshot.templateHash
        });
    });

    it("validates dstgroup restoration after full VS Code restart and disables Neon Effect @neon-real-reverted", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const revertedDstgroupSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(revertedDstgroupSnapshot.patchEnabled, true, "Expected reverted dstgroup Neon patch to persist after full VS Code restart");
        assert.equal(revertedDstgroupSnapshot.scriptTagCount, 1, "Expected one Neon script tag after reverted dstgroup full VS Code restart");
        assert.equal(revertedDstgroupSnapshot.htmlHash, state.revertedDstgroupHtmlHash, "Expected reverted dstgroup HTML hash to persist across restart");
        assert.equal(revertedDstgroupSnapshot.templateHash, state.revertedDstgroupTemplateHash, "Expected reverted dstgroup Neon script to persist across restart");
        assert.equal(revertedDstgroupSnapshot.templateHash, state.dstgroupTemplateHash, "Expected reverted dstgroup Neon script to match the original dstgroup script");
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

        await clickNeonAction("#disable-neon", "neon-real-before-disable");

        const restoredSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => !snapshot.patchEnabled && snapshot.html === state.baselineHtml,
            "Expected workbench HTML to match the before state after disabling"
        );

        assert.equal(restoredSnapshot.htmlHash, state.baselineHtmlHash, "Expected restored HTML hash to match the before state");
        assert.equal(restoredSnapshot.scriptTagCount, 0, "Expected no Neon script tag after disabling");
        updateState({
            restoredHtmlHash: restoredSnapshot.htmlHash
        });
    });

    it("validates restored state after full VS Code restart @neon-real-restored", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const restoredSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(restoredSnapshot.patchEnabled, false, "Expected Neon patch to stay removed after full VS Code restart");
        assert.equal(restoredSnapshot.scriptTagCount, 0, "Expected no Neon script tag after full VS Code restart");
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
        expected: createExpectedVisualEffects(bundle)
    };
}

function createVisualSettingsBundle(baseBundle, options) {
    const bundle = JSON.parse(JSON.stringify(baseBundle));
    const editorBackgroundExtension = path.extname(options.editorBackgroundImagePath).slice(1).toLowerCase();
    const emptyEditorLogoExtension = path.extname(options.emptyEditorLogoImagePath).slice(1).toLowerCase();

    bundle.effects.editorBackground.opacity = 0.3;
    bundle.effects.editorBackground.fit = "full";
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
    assert.equal(runtimeState.hasExpectedEditorBackgroundOpacity, true, `Expected runtime CSS to include ${visualCase.id} background opacity`);
    assert.equal(runtimeState.hasExpectedEditorBackgroundFit, true, `Expected runtime CSS to include ${visualCase.id} background fit area`);
    assert.equal(runtimeState.hasExpectedEmptyEditorLogoOpacity, true, `Expected runtime CSS to include ${visualCase.id} no-tab logo opacity`);

    return { screenshotPath, runtimeState };
}

async function applyVisualSettingsBundleAndEffects(visualCase, screenshotName) {
    await withSettingsWebview(async () => {
        await clickWebviewCss('.nav-button[data-page="color-settings"]');
        await assertWebviewPageVisible("color-settings-page");
        await waitForWebviewTextIncludes("#color-settings-page", "THEME MODE");

        const posted = await VSBrowser.instance.driver.executeScript(`
            const postMessage = window.kawaiiVsCodeColorE2EPostMessage;
            if (typeof postMessage !== 'function') {
                return false;
            }
            postMessage({ type: 'e2e-apply-settings-bundle', bundle: arguments[0] });
            return true;
        `, visualCase.bundle);

        assert.equal(posted, true, "Expected gated E2E postMessage hook to be available");
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
    assert.equal(cleanSnapshot.patchEnabled, false, "Expected pre-test cleanup to remove existing Neon patch");
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
        scriptTagCount: (html.match(/<!-- KAWAII SYNTHWAVE -->/g) || []).length,
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
        `Expected ${visualCase.id} editor background image data URL in generated Neon script`
    );
    assert.ok(
        template.includes(visualCase.expected.emptyEditorLogoDataUrl),
        `Expected ${visualCase.id} empty editor logo data URL in generated Neon script`
    );
    assert.ok(
        template.includes(`--kawaii-editor-background-image: url("${visualCase.expected.editorBackgroundDataUrl}`),
        `Expected ${visualCase.id} editor background image declaration in generated Neon script`
    );
    assert.match(template, new RegExp(`--kawaii-editor-background-image-opacity:\\s*${escapeRegExp(visualCase.expected.editorBackgroundOpacity)}`));
    assert.match(template, /--kawaii-editor-background-area-width:\s*100%/);
    assert.match(template, /--kawaii-editor-background-area-height:\s*100%/);
    assert.ok(
        template.includes(`background-image: url("${visualCase.expected.emptyEditorLogoDataUrl}`),
        `Expected ${visualCase.id} empty editor logo background declaration in generated Neon script`
    );
    assert.match(template, new RegExp(`opacity:\\s*${escapeRegExp(visualCase.expected.emptyEditorLogoOpacity)}`));
    assert.doesNotMatch(template, /\[(?:EDITOR_BACKGROUND_IMAGE|EDITOR_BACKGROUND_IMAGE_OPACITY|EDITOR_BACKGROUND_IMAGE_POSITION|EDITOR_BACKGROUND_IMAGE_SIZE|EDITOR_BACKGROUND_IMAGE_REPEAT|EDITOR_BACKGROUND_AREA_TOP|EDITOR_BACKGROUND_AREA_RIGHT|EDITOR_BACKGROUND_AREA_BOTTOM|EDITOR_BACKGROUND_AREA_LEFT|EDITOR_BACKGROUND_AREA_WIDTH|EDITOR_BACKGROUND_AREA_HEIGHT|EMPTY_EDITOR_LOGO_STYLES)\]/);
}

async function waitForRuntimeNeonState(predicate, message, visualCase = DSTGROUP_VISUAL_CASE, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    let latestState;

    while (Date.now() < deadline) {
        await VSBrowser.instance.driver.switchTo().defaultContent();
        latestState = await getRuntimeNeonState(visualCase).catch((error) => ({
            error: error && error.message ? error.message : String(error)
        }));

        if (latestState && predicate(latestState)) {
            return latestState;
        }

        await sleep(250);
    }

    assert.fail(`${message}. Latest runtime state: ${JSON.stringify(latestState)}`);
}

async function getRuntimeNeonState(visualCase) {
    return VSBrowser.instance.driver.executeScript(`
        const expectedEditorBackgroundDataUrl = arguments[0];
        const expectedEmptyEditorLogoDataUrl = arguments[1];
        const expectedEditorBackgroundOpacity = arguments[2];
        const expectedEmptyEditorLogoOpacity = arguments[3];
        const emptyEditorLogoSelectors = arguments[4];
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
        const chromeText = chromeStyles ? chromeStyles.textContent || '' : '';
        const themeText = themeStyles ? themeStyles.textContent || '' : '';
        const injectedText = chromeText + themeText;
        const logoTargets = Array.from(document.querySelectorAll(emptyEditorLogoSelectors.join(', ')));
        const logoTarget = logoTargets.find((element) => {
            const styles = window.getComputedStyle(element);
            return styles.backgroundImage.includes(expectedEmptyEditorLogoDataUrl);
        }) || logoTargets[0];
        const logoTargetStyles = logoTarget ? window.getComputedStyle(logoTarget) : null;
        const logoTargetRect = logoTarget ? logoTarget.getBoundingClientRect() : null;
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
            hasExpectedEmptyEditorLogoImage: Boolean(logoTargetStyles && logoTargetStyles.backgroundImage.includes(expectedEmptyEditorLogoDataUrl)),
            emptyEditorLogoTargetCount: logoTargets.length,
            emptyEditorLogoTargetClassName: logoTarget ? logoTarget.className : '',
            emptyEditorLogoTargetBackgroundImageLength: logoTargetStyles ? logoTargetStyles.backgroundImage.length : 0,
            emptyEditorLogoRect: logoTargetRect ? {
                left: logoTargetRect.left,
                top: logoTargetRect.top,
                width: logoTargetRect.width,
                height: logoTargetRect.height
            } : null,
            hasExpectedEditorBackgroundOpacity: new RegExp('--kawaii-editor-background-image-opacity:\\\\s*' + expectedEditorBackgroundOpacity.replace('.', '\\\\.')).test(chromeText),
            hasExpectedEditorBackgroundFit: /--kawaii-editor-background-area-width:\\s*100%/.test(chromeText)
                && /--kawaii-editor-background-area-height:\\s*100%/.test(chromeText),
            hasExpectedEmptyEditorLogoOpacity: Boolean(logoTargetStyles && logoTargetStyles.opacity === expectedEmptyEditorLogoOpacity)
        };
    `,
        visualCase.expected.editorBackgroundDataUrl,
        visualCase.expected.emptyEditorLogoDataUrl,
        visualCase.expected.editorBackgroundOpacity,
        visualCase.expected.emptyEditorLogoOpacity,
        EMPTY_EDITOR_LOGO_LETTERPRESS_SELECTORS
    );
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
