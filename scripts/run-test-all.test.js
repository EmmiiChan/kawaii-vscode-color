const assert = require("node:assert/strict");
const test = require("node:test");

let testAllRunner = {};

try {
    testAllRunner = require("./run-test-all");
} catch (error) {
    if (!error || error.code !== "MODULE_NOT_FOUND") {
        throw error;
    }
}

test("formatSummary prints a final overview for passed, failed, and skipped phases", () => {
    assert.equal(typeof testAllRunner.formatSummary, "function");

    const summary = testAllRunner.formatSummary([
        { name: "Unit", script: "test:unit", status: "passed", durationMs: 1120 },
        { name: "DOM", script: "test:dom", status: "failed", durationMs: 2500, exitCode: 1 },
        { name: "Integration", script: "test:integration", status: "skipped", durationMs: 0 }
    ], 3620);

    assert.match(summary, /All Safe Tests Summary/);
    assert.match(summary, /PASS\s+Unit\s+npm run test:unit\s+1\.1s/);
    assert.match(summary, /FAIL\s+DOM\s+npm run test:dom\s+2\.5s/);
    assert.match(summary, /SKIP\s+Integration\s+npm run test:integration\s+-/);
    assert.match(summary, /Result:\s+FAIL/);
    assert.match(summary, /1 passed, 1 failed, 1 skipped/);
    assert.match(summary, /Total duration:\s+3\.6s/);
});

test("createSkippedResults marks remaining phases after a fail-fast stop", () => {
    assert.equal(typeof testAllRunner.createSkippedResults, "function");

    const skipped = testAllRunner.createSkippedResults([
        { name: "Integration", script: "test:integration" },
        { name: "Safe E2E", script: "test:e2e" }
    ]);

    assert.deepEqual(skipped, [
        { name: "Integration", script: "test:integration", status: "skipped", durationMs: 0 },
        { name: "Safe E2E", script: "test:e2e", status: "skipped", durationMs: 0 }
    ]);
});

test("getNpmExecutable uses npm.exe on Windows so child process runs without a shell", () => {
    assert.equal(typeof testAllRunner.getNpmExecutable, "function");

    assert.equal(testAllRunner.getNpmExecutable("win32"), "npm.exe");
    assert.equal(testAllRunner.getNpmExecutable("linux"), "npm");
});

test("formatSummary includes spawn errors for failed phases", () => {
    assert.equal(typeof testAllRunner.formatSummary, "function");

    const summary = testAllRunner.formatSummary([
        {
            name: "Unit",
            script: "test:unit",
            status: "failed",
            durationMs: 0,
            exitCode: 1,
            error: new Error("spawnSync npm.cmd EINVAL")
        }
    ], 0);

    assert.match(summary, /spawnSync npm\.cmd EINVAL/);
});

test("runAllSafeTests returns a promise so the CLI can wait before exiting", async () => {
    assert.equal(typeof testAllRunner.runAllSafeTests, "function");

    const result = testAllRunner.runAllSafeTests({
        phases: [],
        summaryDelayMs: 0,
        output: { write() {} }
    });

    assert.equal(typeof result.then, "function");
    assert.equal(await result, 0);
});

test("getSummaryDelayMs defaults to a short pause before final output", () => {
    assert.equal(typeof testAllRunner.getSummaryDelayMs, "function");

    assert.equal(testAllRunner.getSummaryDelayMs({}), 1000);
    assert.equal(testAllRunner.getSummaryDelayMs({ summaryDelayMs: 0 }), 0);
});

test("safe phase list captures integration output before continuing", () => {
    const integrationPhase = testAllRunner.SAFE_TEST_PHASES.find((phase) => phase.script === "test:integration");

    assert.equal(integrationPhase.captureOutput, true);
});
