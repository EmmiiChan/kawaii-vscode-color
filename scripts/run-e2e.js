const path = require("path");
const { spawnSync } = require("child_process");
const {
    createE2ELastRunRecord,
    finalizeE2ELastRunRecord,
    readExTesterLastRun,
    updateE2ELastRunPhase,
    validateE2ERunOptions,
    writeE2ELastRunRecord
} = require("./e2e-last-run");

const mode = process.argv[2] === "neon" ? "neon" : "safe";
const isWindows = process.platform === "win32";
const workspaceRoot = process.cwd();
const extestBinary = path.join(
    workspaceRoot,
    "node_modules",
    ".bin",
    isWindows ? "extest.cmd" : "extest"
);
const codeVersion = "1.111.0";
const codeSettings = "test/e2e/settings.json";
const openResource = "test/fixtures/workspace";
const mochaConfig = mode === "neon"
    ? "test/e2e/.mocharc.neon.js"
    : "test/e2e/.mocharc.js";
const storage = mode === "neon"
    ? ".vscode-test/extest-111-neon"
    : ".vscode-test/extest-111";
const extensionsDir = mode === "neon"
    ? ".vscode-test/extest-111-neon-extensions"
    : ".vscode-test/extest-111-extensions";
const env = { ...process.env };
env.KAWAII_E2E_STORAGE = path.resolve(storage);

delete env.ELECTRON_RUN_AS_NODE;

try {
    validateE2ERunOptions({ mode, workspaceRoot, storage, env });
} catch (error) {
    console.error(error.message);
    process.exit(1);
}

const phases = mode === "neon"
    ? [
        { name: "neon apply", mochaConfig: "test/e2e/.mocharc.neon-apply.js" },
        { name: "neon applied after full restart", mochaConfig: "test/e2e/.mocharc.neon-applied.js" },
        { name: "neon alternate after full restart", mochaConfig: "test/e2e/.mocharc.neon-alternate.js" },
        { name: "neon dstgroup reverted after full restart", mochaConfig: "test/e2e/.mocharc.neon-reverted.js" },
        { name: "neon restored after full restart", mochaConfig: "test/e2e/.mocharc.neon-restored.js" }
    ]
    : [
        { name: "safe", mochaConfig }
    ];
const runRecord = createE2ELastRunRecord({
    mode,
    workspaceRoot,
    storage,
    extensionsDir,
    codeVersion,
    codeSettings,
    openResource,
    phases
});

writeE2ELastRunRecord(runRecord, { workspaceRoot });

for (const phase of phases) {
    console.log(`Running E2E phase: ${phase.name}`);
    updateE2ELastRunPhase(runRecord, phase.name, {
        status: "running",
        startedAt: new Date().toISOString()
    });
    writeE2ELastRunRecord(runRecord, { workspaceRoot });

    const result = spawnSync(extestBinary, [
        "setup-and-run",
        "test/e2e/**/*.spec.js",
        "--code_version",
        codeVersion,
        "--storage",
        storage,
        "--extensions_dir",
        extensionsDir,
        "--code_settings",
        codeSettings,
        "--open_resource",
        openResource,
        "--mocha_config",
        phase.mochaConfig
    ], {
        env,
        shell: isWindows,
        stdio: "inherit"
    });

    if (result.error) {
        updateE2ELastRunPhase(runRecord, phase.name, {
            status: "failed",
            finishedAt: new Date().toISOString(),
            exitCode: 1,
            error: result.error
        });
        finalizeAndWriteRunRecord(runRecord, 1, result.error);
        console.error(result.error);
        process.exit(1);
    }

    if (result.status) {
        updateE2ELastRunPhase(runRecord, phase.name, {
            status: "failed",
            finishedAt: new Date().toISOString(),
            exitCode: result.status
        });
        finalizeAndWriteRunRecord(runRecord, result.status);
        process.exit(result.status);
    }

    updateE2ELastRunPhase(runRecord, phase.name, {
        status: "passed",
        finishedAt: new Date().toISOString(),
        exitCode: 0
    });
    writeE2ELastRunRecord(runRecord, { workspaceRoot });
}

finalizeAndWriteRunRecord(runRecord, 0);
process.exit(0);

function finalizeAndWriteRunRecord(record, exitCode, error) {
    const extesterLastRun = exitCode === 0
        ? { failedTests: [] }
        : readExTesterLastRun({ workspaceRoot, minModifiedAt: record.startedAt });

    finalizeE2ELastRunRecord(record, {
        exitCode,
        error,
        failedTests: extesterLastRun.failedTests,
        finishedAt: new Date().toISOString()
    });
    writeE2ELastRunRecord(record, { workspaceRoot });
}
