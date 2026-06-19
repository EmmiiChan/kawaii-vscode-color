const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
    E2E_LAST_RUN_MARKER,
    createE2ELastRunRecord,
    finalizeE2ELastRunRecord,
    getE2ELastRunMarkerPath,
    readExTesterLastRun,
    updateE2ELastRunPhase,
    validateE2ERunOptions,
    writeE2ELastRunRecord
} = require("./e2e-last-run");

test("createE2ELastRunRecord normalizes safe run metadata and artifact paths", () => {
    const workspaceRoot = path.join(os.tmpdir(), "kawaii-marker-safe");
    const startedAt = "2026-06-19T10:00:00.000Z";
    const record = createE2ELastRunRecord({
        mode: "safe",
        workspaceRoot,
        storage: ".vscode-test/extest-111",
        extensionsDir: ".vscode-test/extest-111-extensions",
        codeVersion: "1.111.0",
        codeSettings: "test/e2e/settings.json",
        openResource: "test/fixtures/workspace",
        startedAt,
        phases: [{ name: "safe", mochaConfig: "test/e2e/.mocharc.js" }]
    });

    assert.equal(record.schemaVersion, 1);
    assert.equal(record.marker, E2E_LAST_RUN_MARKER);
    assert.equal(record.mode, "safe");
    assert.equal(record.status, "running");
    assert.equal(record.startedAt, startedAt);
    assert.equal(record.storage, path.join(workspaceRoot, ".vscode-test", "extest-111"));
    assert.equal(record.extensionsDir, path.join(workspaceRoot, ".vscode-test", "extest-111-extensions"));
    assert.equal(record.codeSettings, path.join(workspaceRoot, "test", "e2e", "settings.json"));
    assert.equal(record.openResource, path.join(workspaceRoot, "test", "fixtures", "workspace"));
    assert.deepEqual(record.phases, [{
        name: "safe",
        mochaConfig: "test/e2e/.mocharc.js",
        status: "pending"
    }]);
    assert.equal(
        record.artifacts.projectLastRun,
        path.join(workspaceRoot, "test-results", "e2e", E2E_LAST_RUN_MARKER)
    );
    assert.equal(
        record.artifacts.extesterLastRun,
        path.join(workspaceRoot, "test-results", "e2e", ".last-run.json")
    );
});

test("createE2ELastRunRecord keeps current VS Code E2E metadata isolated", () => {
    const workspaceRoot = path.join(os.tmpdir(), "kawaii-marker-current");
    const record = createE2ELastRunRecord({
        mode: "current",
        workspaceRoot,
        phases: [{ name: "current", mochaConfig: "test/e2e/.mocharc.js" }],
        startedAt: "2026-06-19T10:00:00.000Z"
    });

    assert.equal(record.mode, "current");
    assert.equal(record.command, "node scripts/run-e2e.js current");
    assert.equal(record.storage, path.join(workspaceRoot, ".vscode-test", "extest-current"));
    assert.equal(record.extensionsDir, path.join(workspaceRoot, ".vscode-test", "extest-current-extensions"));
    assert.deepEqual(record.phases, [{
        name: "current",
        mochaConfig: "test/e2e/.mocharc.js",
        status: "pending"
    }]);
});

test("updateE2ELastRunPhase and finalizeE2ELastRunRecord preserve failure details", () => {
    const record = createE2ELastRunRecord({
        mode: "neon",
        workspaceRoot: path.join(os.tmpdir(), "kawaii-marker-neon"),
        storage: ".vscode-test/extest-111-neon",
        extensionsDir: ".vscode-test/extest-111-neon-extensions",
        phases: [
            { name: "neon apply", mochaConfig: "test/e2e/.mocharc.neon-apply.js" },
            { name: "neon restored", mochaConfig: "test/e2e/.mocharc.neon-restored.js" }
        ],
        startedAt: "2026-06-19T10:00:00.000Z"
    });

    updateE2ELastRunPhase(record, "neon apply", {
        status: "passed",
        startedAt: "2026-06-19T10:00:01.000Z",
        finishedAt: "2026-06-19T10:00:05.000Z",
        exitCode: 0
    });
    updateE2ELastRunPhase(record, "neon restored", {
        status: "failed",
        startedAt: "2026-06-19T10:00:06.000Z",
        finishedAt: "2026-06-19T10:00:09.000Z",
        exitCode: 1,
        error: new Error("restore failed")
    });
    finalizeE2ELastRunRecord(record, {
        exitCode: 1,
        finishedAt: "2026-06-19T10:00:10.000Z",
        failedTests: ["neon-real-restored"]
    });

    assert.equal(record.status, "failed");
    assert.equal(record.exitCode, 1);
    assert.equal(record.durationMs, 10000);
    assert.deepEqual(record.failedTests, ["neon-real-restored"]);
    assert.deepEqual(record.phases.map((phase) => phase.status), ["passed", "failed"]);
    assert.equal(record.phases[1].error, "restore failed");
});

test("writeE2ELastRunRecord writes the project-owned marker without depending on ExTester marker freshness", () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-marker-write-"));
    const markerPath = getE2ELastRunMarkerPath({ workspaceRoot });
    const record = finalizeE2ELastRunRecord(createE2ELastRunRecord({
        mode: "safe",
        workspaceRoot,
        storage: ".vscode-test/extest-111",
        extensionsDir: ".vscode-test/extest-111-extensions",
        phases: [{ name: "safe", mochaConfig: "test/e2e/.mocharc.js" }],
        startedAt: "2026-06-19T10:00:00.000Z"
    }), {
        exitCode: 0,
        finishedAt: "2026-06-19T10:00:01.000Z"
    });

    writeE2ELastRunRecord(record, { workspaceRoot });

    const written = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    assert.equal(written.status, "passed");
    assert.equal(written.mode, "safe");
    assert.equal(written.artifacts.projectLastRun, markerPath);
});

test("readExTesterLastRun treats missing or stale ExTester marker as optional diagnostics", () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-marker-extester-"));
    const extesterPath = path.join(workspaceRoot, "test-results", "e2e", ".last-run.json");

    assert.deepEqual(readExTesterLastRun({ workspaceRoot }), { failedTests: [] });

    fs.mkdirSync(path.dirname(extesterPath), { recursive: true });
    fs.writeFileSync(extesterPath, JSON.stringify({
        status: "failed",
        failedTests: ["old-test-id"]
    }), "utf8");

    assert.deepEqual(readExTesterLastRun({ workspaceRoot }), {
        status: "failed",
        failedTests: ["old-test-id"]
    });
});

test("readExTesterLastRun ignores failed tests from a marker older than the current run", () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-marker-stale-"));
    const extesterPath = path.join(workspaceRoot, "test-results", "e2e", ".last-run.json");

    fs.mkdirSync(path.dirname(extesterPath), { recursive: true });
    fs.writeFileSync(extesterPath, JSON.stringify({
        status: "failed",
        failedTests: ["stale-test-id"]
    }), "utf8");
    fs.utimesSync(extesterPath, new Date("2026-06-19T09:59:00.000Z"), new Date("2026-06-19T09:59:00.000Z"));

    assert.deepEqual(readExTesterLastRun({
        workspaceRoot,
        minModifiedAt: "2026-06-19T10:00:00.000Z"
    }), {
        failedTests: [],
        stale: true
    });
});

test("validateE2ERunOptions requires gated Neon runs to stay inside disposable storage", () => {
    const workspaceRoot = path.join(os.tmpdir(), "kawaii-marker-validation");

    assert.doesNotThrow(() => validateE2ERunOptions({
        mode: "neon",
        workspaceRoot,
        storage: ".vscode-test/extest-111-neon",
        env: { KAWAII_E2E_ALLOW_NEON_PATCH: "1" }
    }));
    assert.throws(() => validateE2ERunOptions({
        mode: "neon",
        workspaceRoot,
        storage: ".vscode-test/extest-111",
        env: { KAWAII_E2E_ALLOW_NEON_PATCH: "1" }
    }), /disposable Neon E2E storage/);
    assert.throws(() => validateE2ERunOptions({
        mode: "neon",
        workspaceRoot,
        storage: ".vscode-test/extest-111-neon",
        env: {}
    }), /KAWAII_E2E_ALLOW_NEON_PATCH=1/);
});
