const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

let diagnostics = {};

try {
    diagnostics = require("./test-process-cleanup-diagnostics");
} catch (error) {
    if (!error || error.code !== "MODULE_NOT_FOUND") {
        throw error;
    }
}

test("filterDisposableVSCodeProcesses keeps only Code.exe processes under .vscode-test", () => {
    assert.equal(typeof diagnostics.filterDisposableVSCodeProcesses, "function");

    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-process-filter-"));
    const storageRoot = path.join(workspaceRoot, ".vscode-test");
    const disposableCodePath = path.join(storageRoot, "extest-111", "VSCode-win32-x64-archive", "Code.exe");
    const userCodePath = path.join(os.tmpdir(), "Microsoft VS Code", "Code.exe");

    try {
        const processes = [
            { processId: 10, name: "Code.exe", executablePath: disposableCodePath, commandLine: `"${disposableCodePath}"` },
            { processId: 11, name: "Code.exe", executablePath: userCodePath, commandLine: `"${userCodePath}" "${workspaceRoot}"` },
            { processId: 12, name: "node.exe", executablePath: process.execPath, commandLine: `"${process.execPath}" "${storageRoot}"` }
        ];

        const result = diagnostics.filterDisposableVSCodeProcesses(processes, [storageRoot], "win32");

        assert.deepEqual(result.map((processInfo) => processInfo.processId), [10]);
    } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
});

test("filterDisposableVSCodeProcesses accepts command line storage matches when ExecutablePath is missing", () => {
    assert.equal(typeof diagnostics.filterDisposableVSCodeProcesses, "function");

    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-process-command-line-"));
    const storageRoot = path.join(workspaceRoot, ".vscode-test");
    const storageArgument = path.join(storageRoot, "extest-current", "user-data");

    try {
        const result = diagnostics.filterDisposableVSCodeProcesses([
            { processId: 20, name: "Code.exe", commandLine: `"Code.exe" --user-data-dir "${storageArgument}"` },
            { processId: 21, name: "Code.exe", commandLine: `"Code.exe" --user-data-dir "${workspaceRoot}"` }
        ], [storageRoot], "win32");

        assert.deepEqual(result.map((processInfo) => processInfo.processId), [20]);
    } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
});

test("createArtifactDiagnostics reports size and missing artifact directories", () => {
    assert.equal(typeof diagnostics.createArtifactDiagnostics, "function");

    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-artifact-diagnostics-"));

    try {
        fs.mkdirSync(path.join(workspaceRoot, ".vscode-test", "nested"), { recursive: true });
        fs.writeFileSync(path.join(workspaceRoot, ".vscode-test", "nested", "one.txt"), "12345", "utf8");

        const result = diagnostics.createArtifactDiagnostics({
            workspaceRoot,
            artifactRelativePaths: [".vscode-test", "test-results"]
        });

        assert.equal(result[0].relativePath, ".vscode-test");
        assert.equal(result[0].exists, true);
        assert.equal(result[0].bytes, 5);
        assert.equal(result[0].fileCount, 1);
        assert.equal(result[1].relativePath, "test-results");
        assert.equal(result[1].exists, false);
        assert.equal(result[1].bytes, 0);
    } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
});

test("runCleanupDiagnostics kills only filtered disposable VS Code processes when requested", () => {
    assert.equal(typeof diagnostics.runCleanupDiagnostics, "function");

    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-kill-diagnostics-"));
    const storageRoot = path.join(workspaceRoot, ".vscode-test");
    const killedProcessIds = [];

    try {
        const result = diagnostics.runCleanupDiagnostics({
            workspaceRoot,
            platform: "win32",
            kill: true,
            artifactRelativePaths: [],
            output: { write() {} },
            queryProcesses() {
                return [
                    { processId: 30, name: "Code.exe", executablePath: path.join(storageRoot, "extest-111", "Code.exe") },
                    { processId: 31, name: "Code.exe", executablePath: path.join(os.tmpdir(), "Code.exe") }
                ];
            },
            killProcesses(processes) {
                killedProcessIds.push(...processes.map((processInfo) => processInfo.processId));
            }
        });

        assert.equal(result.processes.matched.length, 1);
        assert.deepEqual(killedProcessIds, [30]);
    } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
});
