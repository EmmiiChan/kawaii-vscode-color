const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { VSBrowser } = require("vscode-extension-tester");

const {
    assertWebviewPageVisible,
    clickWebviewCss,
    takeE2EScreenshot,
    waitForWebviewTextIncludes,
    withSettingsWebview
} = require("./helpers/extester-app");
const {
    isWorkbenchPatchEnabled,
    removeWorkbenchPatchScriptTag,
    resolveWorkbenchPatchPaths
} = require("../../src/workbenchPatch");

const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..");
const DISPOSABLE_TEST_ROOT = path.join(WORKSPACE_ROOT, ".vscode-test");
const E2E_RESULTS_DIR = path.join(WORKSPACE_ROOT, "test-results", "e2e");
const NEON_STATE_FILE = path.join(E2E_RESULTS_DIR, "neon-real-state.json");
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

        const applyPhaseCanLeavePatch = title.includes("@neon-real-apply") && this.currentTest.state === "passed";
        if (applyPhaseCanLeavePatch) {
            return;
        }

        restoreBaselineIfNeeded(state);
    });

    it("captures before state and applies Neon Effect patch @neon-real-apply", async function () {
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const baselineSnapshot = ensureCleanWorkbenchBaseline(patchPaths);

        assert.equal(baselineSnapshot.patchEnabled, false, "Expected disposable workbench to start without Neon patch");
        assert.equal(baselineSnapshot.scriptTagCount, 0, "Expected no Neon script tag before applying");

        writeState({
            storage: NEON_STORAGE,
            htmlFile: patchPaths.htmlFile,
            templateFile: patchPaths.templateFile,
            baselineHtml: baselineSnapshot.html,
            baselineHtmlHash: baselineSnapshot.htmlHash,
            baselineTemplateExists: baselineSnapshot.templateExists,
            baselineTemplateHash: baselineSnapshot.templateHash
        });

        await clickNeonAction("#enable-neon", "neon-real-before");

        const appliedSnapshot = await waitForPatchSnapshot(
            patchPaths,
            (snapshot) => snapshot.patchEnabled && snapshot.templateExists,
            "Expected Neon patch and generated template after enabling"
        );

        assert.notEqual(appliedSnapshot.htmlHash, baselineSnapshot.htmlHash, "Expected workbench HTML to change after enabling");
        assert.equal(appliedSnapshot.scriptTagCount, 1, "Expected exactly one Neon script tag after enabling");
        assert.match(appliedSnapshot.html, /<!-- KAWAII SYNTHWAVE --><script src="neondreams\.js\?v=\d+"><\/script><!-- NEON DREAMS -->/);
        assertAppliedTemplateUsesEditorTokens(appliedSnapshot.template);

        updateState({
            appliedHtmlHash: appliedSnapshot.htmlHash,
            appliedTemplateHash: appliedSnapshot.templateHash
        });
    });

    it("validates applied state after full VS Code restart and disables Neon Effect @neon-real-applied", async function () {
        const state = readRequiredState();
        const patchPaths = findDisposableWorkbenchPatchPaths();
        const appliedSnapshot = readPatchSnapshot(patchPaths);

        assertStateMatchesPatchPaths(state, patchPaths);
        assert.equal(appliedSnapshot.patchEnabled, true, "Expected Neon patch to persist after full VS Code restart");
        assert.equal(appliedSnapshot.scriptTagCount, 1, "Expected one Neon script tag after full VS Code restart");
        assert.equal(appliedSnapshot.htmlHash, state.appliedHtmlHash, "Expected applied HTML hash to persist across restart");
        assert.equal(appliedSnapshot.templateHash, state.appliedTemplateHash, "Expected generated Neon script to persist across restart");
        assertAppliedTemplateUsesEditorTokens(appliedSnapshot.template);

        const runtimeEnabledState = await waitForRuntimeNeonState(
            (runtimeState) => runtimeState.hasChromeStyles && runtimeState.hasKawaiiThemeWrapper && runtimeState.usesEditorTokens,
            "Expected Neon chrome CSS to be active after full VS Code restart"
        );

        assert.equal(runtimeEnabledState.hasThemeWrapperClass, true, "Expected Kawaii theme wrapper class after restart");
        assert.equal(runtimeEnabledState.hasOwnPaletteOnly, false, "Expected runtime CSS to keep VS Code editor tokens");
        await takeE2EScreenshot("neon-real-applied-after-full-restart");

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

async function waitForRuntimeNeonState(predicate, message, timeoutMs = 30000) {
    const driver = VSBrowser.instance.driver;

    return driver.wait(async () => {
        await driver.switchTo().defaultContent();
        const state = await getRuntimeNeonState().catch(() => undefined);
        return state && predicate(state) ? state : false;
    }, timeoutMs, message);
}

async function getRuntimeNeonState() {
    return VSBrowser.instance.driver.executeScript(`
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
        return {
            hasChromeStyles: Boolean(chromeStyles),
            hasThemeStyles: Boolean(themeStyles),
            hasKawaiiThemeWrapper: Boolean(themeWrapper),
            hasThemeWrapperClass: Boolean(themeWrapper && /kawaii/i.test(themeWrapper.className || '')),
            usesEditorTokens: /var\\(--vscode-/.test(injectedText),
            hasOwnPaletteOnly: Boolean(injectedText) && !/var\\(--vscode-/.test(injectedText)
        };
    `);
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

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
