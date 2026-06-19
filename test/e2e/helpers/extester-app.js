const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { By, Key, until, VSBrowser, Workbench } = require("vscode-extension-tester");

const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..", "..");
const E2E_RESULTS_DIR = path.join(WORKSPACE_ROOT, "test-results", "e2e");
const SETTINGS_COMMAND_LABEL = "Kawaii VS Code Color: Settings";
const SETTINGS_EDITOR_TITLE = "Kawaii VS Code Color Settings";

async function waitForWorkbench(timeout = 60000) {
    await VSBrowser.instance.waitForWorkbench(timeout);
}

async function assertCommandAvailable(commandLabel = SETTINGS_COMMAND_LABEL) {
    const input = await new Workbench().openCommandPrompt();

    try {
        await input.setText(`>${commandLabel}`);
        const quickPick = await input.findQuickPick(commandLabel);
        if (!quickPick) {
            const quickPicks = await input.getQuickPicks();
            const labels = [];
            for (const item of quickPicks) {
                labels.push(await item.getLabel());
            }

            assert.fail(`Expected command to be available: ${commandLabel}. Visible quick picks: ${labels.join(" | ")}`);
        }
    } finally {
        await input.cancel().catch(() => undefined);
    }
}

async function runCommand(commandLabel = SETTINGS_COMMAND_LABEL) {
    const driver = VSBrowser.instance.driver;
    const input = await openCommandPromptWithKeyboard();

    await input.click();
    await driver.actions().sendKeys(`>${commandLabel}`, Key.ENTER).perform();
}

async function openCommandPromptWithKeyboard() {
    const driver = VSBrowser.instance.driver;
    const inputLocator = By.css(".quick-input-widget input");

    await driver.actions()
        .keyDown(Workbench.ctlKey)
        .keyDown(Key.SHIFT)
        .sendKeys("p")
        .keyUp(Key.SHIFT)
        .keyUp(Workbench.ctlKey)
        .perform();

    const input = await driver.wait(until.elementLocated(inputLocator), 10000);
    await driver.wait(until.elementIsVisible(input), 10000);

    return input;
}

async function openSettingsWebview() {
    await runCommand(SETTINGS_COMMAND_LABEL);

    const webview = await waitForSettingsEditor();
    await webview.switchToFrame(15000);
    await waitForWebviewElement(By.css(".app"));

    return webview;
}

async function waitForSettingsEditor(timeout = 30000) {
    const driver = VSBrowser.instance.driver;
    const editorView = new Workbench().getEditorView();

    return driver.wait(async () => {
        try {
            const titles = await editorView.getOpenEditorTitles();
            if (!titles.includes(SETTINGS_EDITOR_TITLE)) {
                return false;
            }

            const editor = await editorView.openEditor(SETTINGS_EDITOR_TITLE);
            return typeof editor.switchToFrame === "function" ? editor : false;
        } catch (error) {
            return false;
        }
    }, timeout, `Expected ${SETTINGS_EDITOR_TITLE} webview editor to open.`);
}

async function withSettingsWebview(callback) {
    const webview = await openSettingsWebview();

    try {
        await clickWebviewCss('.nav-button[data-page="home"]').catch(() => undefined);
        return await callback(webview, VSBrowser.instance.driver);
    } finally {
        await webview.switchBack().catch(() => undefined);
    }
}

async function waitForWebviewElement(locator, timeout = 10000) {
    const driver = VSBrowser.instance.driver;
    const element = await driver.wait(until.elementLocated(locator), timeout);

    await driver.wait(until.elementIsVisible(element), timeout);

    return element;
}

async function waitForWebviewCss(css, timeout = 10000) {
    return waitForWebviewElement(By.css(css), timeout);
}

async function waitForWebviewTextIncludes(css, expectedText, timeout = 10000) {
    const driver = VSBrowser.instance.driver;

    return driver.wait(async () => {
        const text = await getWebviewText(css).catch(() => "");
        return text.includes(expectedText);
    }, timeout, `Expected ${css} to include ${expectedText}`);
}

async function clickWebviewCss(css) {
    const element = await waitForWebviewCss(css);
    await element.click();
    return element;
}

async function getWebviewElementCount(css) {
    return VSBrowser.instance.driver.executeScript(
        "return document.querySelectorAll(arguments[0]).length;",
        css
    );
}

async function getWebviewElementAttribute(css, attributeName) {
    await waitForWebviewCss(css);

    return VSBrowser.instance.driver.executeScript(
        `
        const element = document.querySelector(arguments[0]);
        if (!element) {
            return null;
        }
        return element.getAttribute(arguments[1]);
        `,
        css,
        attributeName
    );
}

async function getWebviewInputValue(css) {
    await waitForWebviewCss(css);

    return VSBrowser.instance.driver.executeScript(
        `
        const input = document.querySelector(arguments[0]);
        return input ? input.value : null;
        `,
        css
    );
}

async function setWebviewInputValue(css, value) {
    await waitForWebviewCss(css);

    await VSBrowser.instance.driver.executeScript(
        `
        const input = document.querySelector(arguments[0]);
        input.focus();
        input.value = arguments[1];
        input.dispatchEvent(new InputEvent("input", { bubbles: true, data: arguments[1], inputType: "insertText" }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        `,
        css,
        value
    );
}

async function selectWebviewOptionByText(css, optionText) {
    await waitForWebviewCss(css);

    const selectedValue = await VSBrowser.instance.driver.executeScript(
        `
        const select = document.querySelector(arguments[0]);
        const option = Array.from(select.options).find((item) => item.textContent.includes(arguments[1]));
        if (!option) {
            return null;
        }
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return select.value;
        `,
        css,
        optionText
    );

    assert.ok(selectedValue, `Expected ${css} to include an option containing ${optionText}`);
    return selectedValue;
}

async function getWebviewText(css) {
    const element = await waitForWebviewCss(css);
    const text = await element.getText();

    if (text) {
        return text;
    }

    return VSBrowser.instance.driver.executeScript(
        "return document.querySelector(arguments[0]) ? document.querySelector(arguments[0]).textContent : '';",
        css
    );
}

async function assertWebviewTextIncludes(css, expectedText) {
    const text = await getWebviewText(css);
    assert.match(text, new RegExp(escapeRegExp(expectedText)), `Expected ${css} to include ${expectedText}`);
}

async function assertAnyWebviewTextIncludes(css, expectedText) {
    await waitForWebviewCss(css);

    const matches = await VSBrowser.instance.driver.executeScript(
        "return Array.from(document.querySelectorAll(arguments[0])).map((element) => element.textContent || '').some((text) => text.includes(arguments[1]));",
        css,
        expectedText
    );

    assert.ok(matches, `Expected one ${css} element to include ${expectedText}`);
}

async function assertWebviewCssVisible(css) {
    return waitForWebviewCss(css);
}

async function assertWebviewPageVisible(pageId) {
    const page = await waitForWebviewCss(`#${pageId}`);
    const className = await page.getAttribute("class");

    assert.ok(!String(className).split(/\s+/).includes("hidden"), `Expected #${pageId} to be visible.`);

    return page;
}

async function takeE2EScreenshot(name) {
    fs.mkdirSync(E2E_RESULTS_DIR, { recursive: true });

    const screenshot = await VSBrowser.instance.driver.takeScreenshot();
    const outputPath = path.join(E2E_RESULTS_DIR, `${name}.png`);
    fs.writeFileSync(outputPath, screenshot, "base64");

    return outputPath;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
    SETTINGS_COMMAND_LABEL,
    SETTINGS_EDITOR_TITLE,
    assertCommandAvailable,
    assertAnyWebviewTextIncludes,
    assertWebviewCssVisible,
    assertWebviewPageVisible,
    assertWebviewTextIncludes,
    clickWebviewCss,
    getWebviewElementAttribute,
    getWebviewElementCount,
    getWebviewInputValue,
    getWebviewText,
    openSettingsWebview,
    runCommand,
    selectWebviewOptionByText,
    setWebviewInputValue,
    takeE2EScreenshot,
    waitForWebviewCss,
    waitForWebviewElement,
    waitForWebviewTextIncludes,
    waitForWorkbench,
    withSettingsWebview
};
