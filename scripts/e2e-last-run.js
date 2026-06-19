const fs = require("node:fs");
const path = require("node:path");

const E2E_LAST_RUN_MARKER = "kawaii-last-run.json";
const REQUIRED_NEON_FLAG = "1";

function getE2ELastRunMarkerPath(options = {}) {
    return path.join(getE2EResultsDir(options), E2E_LAST_RUN_MARKER);
}

function getE2EResultsDir(options = {}) {
    return path.join(path.resolve(options.workspaceRoot || process.cwd()), "test-results", "e2e");
}

function createE2ELastRunRecord(options) {
    const workspaceRoot = path.resolve(options.workspaceRoot || process.cwd());
    const mode = normalizeE2EMode(options.mode);
    const startedAt = normalizeTimestamp(options.startedAt);

    return {
        schemaVersion: 1,
        marker: E2E_LAST_RUN_MARKER,
        mode,
        status: "running",
        startedAt,
        command: options.command || getDefaultCommand(mode),
        codeVersion: options.codeVersion || "1.111.0",
        storage: resolveFromWorkspace(workspaceRoot, options.storage || getDefaultStorage(mode)),
        extensionsDir: resolveFromWorkspace(workspaceRoot, options.extensionsDir || getDefaultExtensionsDir(mode)),
        codeSettings: resolveFromWorkspace(workspaceRoot, options.codeSettings || "test/e2e/settings.json"),
        openResource: resolveFromWorkspace(workspaceRoot, options.openResource || "test/fixtures/workspace"),
        phases: (options.phases || []).map((phase) => ({
            name: phase.name,
            mochaConfig: phase.mochaConfig,
            status: "pending"
        })),
        artifacts: createArtifactPaths(workspaceRoot),
        failedTests: []
    };
}

function updateE2ELastRunPhase(record, phaseName, values = {}) {
    const phase = findOrCreatePhase(record, phaseName, values.mochaConfig);

    if (values.status) {
        phase.status = values.status;
    }

    if (values.startedAt) {
        phase.startedAt = normalizeTimestamp(values.startedAt);
    }

    if (values.finishedAt) {
        phase.finishedAt = normalizeTimestamp(values.finishedAt);
    }

    if (typeof values.exitCode === "number") {
        phase.exitCode = values.exitCode;
    }

    if (values.error) {
        phase.error = normalizeError(values.error);
    }

    phase.durationMs = getDurationMs(phase.startedAt, phase.finishedAt);

    if (phase.durationMs === undefined) {
        delete phase.durationMs;
    }

    return record;
}

function finalizeE2ELastRunRecord(record, values = {}) {
    const exitCode = typeof values.exitCode === "number" ? values.exitCode : 0;
    const finishedAt = normalizeTimestamp(values.finishedAt);

    record.status = exitCode === 0 ? "passed" : "failed";
    record.finishedAt = finishedAt;
    record.exitCode = exitCode;
    record.durationMs = getDurationMs(record.startedAt, finishedAt);
    record.failedTests = Array.isArray(values.failedTests) ? values.failedTests : [];

    if (values.error) {
        record.error = normalizeError(values.error);
    } else {
        delete record.error;
    }

    return record;
}

function writeE2ELastRunRecord(record, options = {}) {
    const markerPath = options.markerPath || getE2ELastRunMarkerPath(options);

    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

    return markerPath;
}

function readExTesterLastRun(options = {}) {
    const markerPath = options.markerPath || path.join(getE2EResultsDir(options), ".last-run.json");

    if (!fs.existsSync(markerPath)) {
        return { failedTests: [] };
    }

    if (isOlderThan(markerPath, options.minModifiedAt)) {
        return {
            failedTests: [],
            stale: true
        };
    }

    try {
        const value = JSON.parse(fs.readFileSync(markerPath, "utf8"));
        const diagnostics = {
            failedTests: Array.isArray(value.failedTests) ? value.failedTests : []
        };

        if (typeof value.status === "string") {
            diagnostics.status = value.status;
        }

        return diagnostics;
    } catch (error) {
        return {
            failedTests: [],
            error: normalizeError(error)
        };
    }
}

function validateE2ERunOptions(options = {}) {
    if (normalizeE2EMode(options.mode) !== "neon") {
        return;
    }

    if (!options.env || options.env.KAWAII_E2E_ALLOW_NEON_PATCH !== REQUIRED_NEON_FLAG) {
        throw new Error("Refusing to run real Neon Effect E2E. Set KAWAII_E2E_ALLOW_NEON_PATCH=1 to acknowledge the patch risk.");
    }

    const workspaceRoot = path.resolve(options.workspaceRoot || process.cwd());
    const neonStorageRoot = path.join(workspaceRoot, ".vscode-test", "extest-111-neon");
    const resolvedStorage = resolveFromWorkspace(workspaceRoot, options.storage || getDefaultStorage("neon"));

    if (resolvedStorage !== neonStorageRoot && !resolvedStorage.startsWith(`${neonStorageRoot}${path.sep}`)) {
        throw new Error(`Refusing to run Neon E2E outside disposable Neon E2E storage: ${resolvedStorage}`);
    }
}

function createArtifactPaths(workspaceRoot) {
    const resultsDir = getE2EResultsDir({ workspaceRoot });

    return {
        projectLastRun: path.join(resultsDir, E2E_LAST_RUN_MARKER),
        extesterLastRun: path.join(resultsDir, ".last-run.json"),
        settingsVisualAnalysis: path.join(resultsDir, "settings-visual-state-analysis.json"),
        neonRealState: path.join(resultsDir, "neon-real-state.json")
    };
}

function findOrCreatePhase(record, phaseName, mochaConfig) {
    let phase = record.phases.find((candidate) => candidate.name === phaseName);

    if (!phase) {
        phase = {
            name: phaseName,
            mochaConfig,
            status: "pending"
        };
        record.phases.push(phase);
    }

    return phase;
}

function getDefaultCommand(mode) {
    if (mode === "neon") {
        return "node scripts/run-e2e.js neon";
    }

    if (mode === "current") {
        return "node scripts/run-e2e.js current";
    }

    return "node scripts/run-e2e.js";
}

function getDefaultStorage(mode) {
    if (mode === "neon") {
        return ".vscode-test/extest-111-neon";
    }

    if (mode === "current") {
        return ".vscode-test/extest-current";
    }

    return ".vscode-test/extest-111";
}

function getDefaultExtensionsDir(mode) {
    if (mode === "neon") {
        return ".vscode-test/extest-111-neon-extensions";
    }

    if (mode === "current") {
        return ".vscode-test/extest-current-extensions";
    }

    return ".vscode-test/extest-111-extensions";
}

function normalizeE2EMode(mode) {
    if (mode === "neon" || mode === "current") {
        return mode;
    }

    return "safe";
}

function resolveFromWorkspace(workspaceRoot, value) {
    return path.resolve(workspaceRoot, value);
}

function normalizeTimestamp(value) {
    if (!value) {
        return new Date().toISOString();
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return String(value);
}

function normalizeError(error) {
    if (error && error.message) {
        return error.message;
    }

    return String(error);
}

function getDurationMs(startedAt, finishedAt) {
    const start = Date.parse(startedAt);
    const finish = Date.parse(finishedAt);

    if (Number.isNaN(start) || Number.isNaN(finish)) {
        return undefined;
    }

    return Math.max(0, finish - start);
}

function isOlderThan(filePath, minModifiedAt) {
    if (!minModifiedAt) {
        return false;
    }

    const minModifiedTime = Date.parse(minModifiedAt);

    if (Number.isNaN(minModifiedTime)) {
        return false;
    }

    return fs.statSync(filePath).mtimeMs < minModifiedTime;
}

module.exports = {
    E2E_LAST_RUN_MARKER,
    createE2ELastRunRecord,
    finalizeE2ELastRunRecord,
    getE2ELastRunMarkerPath,
    readExTesterLastRun,
    updateE2ELastRunPhase,
    validateE2ERunOptions,
    writeE2ELastRunRecord
};
