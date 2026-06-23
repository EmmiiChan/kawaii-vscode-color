const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
    createE2ERunnerConfig,
    runE2EWithConfig
} = require("./run-e2e");

test("createE2ERunnerConfig builds safe defaults and sanitized environment", () => {
    const workspaceRoot = path.join(os.tmpdir(), "kawaii-e2e-safe");
    const config = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js"],
        env: {
            ELECTRON_RUN_AS_NODE: "1",
            EXTRA_VALUE: "kept"
        },
        platform: "linux",
        workspaceRoot
    });

    assert.equal(config.mode, "safe");
    assert.equal(config.codeVersion, "1.111.0");
    assert.equal(config.storage, ".vscode-test/extest-111");
    assert.equal(config.extensionsDir, ".vscode-test/extest-111-extensions");
    assert.equal(config.extestBinary, path.join(workspaceRoot, "node_modules", ".bin", "extest"));
    assert.equal(config.env.KAWAII_E2E_STORAGE, path.join(workspaceRoot, ".vscode-test", "extest-111"));
    assert.equal(config.env.KAWAII_E2E_TEST_HOOKS, "1");
    assert.equal(config.env.EXTRA_VALUE, "kept");
    assert.equal(config.env.ELECTRON_RUN_AS_NODE, undefined);
    assert.deepEqual(config.phases, [{
        name: "safe",
        mochaConfig: "test/e2e/.mocharc.js"
    }]);
});

test("createE2ERunnerConfig isolates current and neon modes", () => {
    const workspaceRoot = path.join(os.tmpdir(), "kawaii-e2e-modes");
    const currentConfig = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js", "current"],
        env: {
            KAWAII_E2E_CURRENT_CODE_VERSION: "1.120.0"
        },
        platform: "win32",
        workspaceRoot
    });
    const neonConfig = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js", "neon"],
        env: {
            KAWAII_E2E_ALLOW_NEON_PATCH: "1"
        },
        platform: "linux",
        workspaceRoot
    });

    assert.equal(currentConfig.mode, "current");
    assert.equal(currentConfig.codeVersion, "1.120.0");
    assert.equal(currentConfig.storage, ".vscode-test/extest-current");
    assert.equal(currentConfig.extensionsDir, ".vscode-test/extest-current-extensions");
    assert.equal(currentConfig.extestBinary, path.join(workspaceRoot, "node_modules", ".bin", "extest.cmd"));
    assert.deepEqual(currentConfig.phases.map((phase) => phase.name), ["current"]);

    assert.equal(neonConfig.mode, "neon");
    assert.equal(neonConfig.codeVersion, "1.111.0");
    assert.equal(neonConfig.storage, ".vscode-test/extest-111-neon");
    assert.equal(neonConfig.extensionsDir, ".vscode-test/extest-111-neon-extensions");
    assert.deepEqual(neonConfig.phases.map((phase) => phase.name), [
        "neon apply",
        "neon applied after full restart",
        "neon alternate after full restart",
        "neon dstgroup reverted after full restart",
        "neon restored after full restart"
    ]);
});

test("runE2EWithConfig records a passing safe phase and spawn arguments", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-e2e-pass-"));
    t.after(() => {
        fs.rmSync(workspaceRoot, { force: true, recursive: true });
    });
    const spawnCalls = [];
    const config = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js"],
        env: {},
        platform: "linux",
        workspaceRoot
    });

    const exitCode = runE2EWithConfig(config, {
        spawnSync(command, args, options) {
            spawnCalls.push({ command, args, options });
            return { status: 0 };
        },
        console: createSilentConsole()
    });
    const marker = readMarker(workspaceRoot);

    assert.equal(exitCode, 0);
    assert.equal(spawnCalls.length, 1);
    assert.equal(spawnCalls[0].command, config.extestBinary);
    assert.deepEqual(spawnCalls[0].args, [
        "setup-and-run",
        "test/e2e/**/*.spec.js",
        "--code_version",
        "1.111.0",
        "--storage",
        ".vscode-test/extest-111",
        "--extensions_dir",
        ".vscode-test/extest-111-extensions",
        "--code_settings",
        "test/e2e/settings.json",
        "--open_resource",
        "test/fixtures/workspace",
        "--mocha_config",
        "test/e2e/.mocharc.js"
    ]);
    assert.equal(spawnCalls[0].options.shell, false);
    assert.equal(marker.status, "passed");
    assert.deepEqual(marker.phases.map((phase) => phase.status), ["passed"]);
});

test("runE2EWithConfig fails fast on a non-zero phase status", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-e2e-fail-"));
    t.after(() => {
        fs.rmSync(workspaceRoot, { force: true, recursive: true });
    });
    const spawnCalls = [];
    const config = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js", "neon"],
        env: {
            KAWAII_E2E_ALLOW_NEON_PATCH: "1"
        },
        platform: "linux",
        workspaceRoot
    });

    const exitCode = runE2EWithConfig(config, {
        spawnSync(command, args) {
            spawnCalls.push({ command, args });
            return { status: spawnCalls.length === 1 ? 0 : 2 };
        },
        console: createSilentConsole()
    });
    const marker = readMarker(workspaceRoot);

    assert.equal(exitCode, 2);
    assert.equal(spawnCalls.length, 2);
    assert.equal(marker.status, "failed");
    assert.deepEqual(marker.phases.map((phase) => phase.status), [
        "passed",
        "failed",
        "pending",
        "pending",
        "pending"
    ]);
    assert.equal(marker.phases[1].exitCode, 2);
});

test("runE2EWithConfig records spawn errors", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-e2e-error-"));
    t.after(() => {
        fs.rmSync(workspaceRoot, { force: true, recursive: true });
    });
    const config = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js"],
        env: {},
        platform: "linux",
        workspaceRoot
    });

    const exitCode = runE2EWithConfig(config, {
        spawnSync() {
            return {
                status: null,
                error: new Error("spawn failed")
            };
        },
        console: createSilentConsole()
    });
    const marker = readMarker(workspaceRoot);

    assert.equal(exitCode, 1);
    assert.equal(marker.status, "failed");
    assert.equal(marker.error, "spawn failed");
    assert.equal(marker.phases[0].status, "failed");
    assert.equal(marker.phases[0].error, "spawn failed");
});

test("runE2EWithConfig rejects invalid Neon options before spawning", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-e2e-invalid-"));
    t.after(() => {
        fs.rmSync(workspaceRoot, { force: true, recursive: true });
    });
    let spawnCount = 0;
    const config = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js", "neon"],
        env: {},
        platform: "linux",
        workspaceRoot
    });

    const exitCode = runE2EWithConfig(config, {
        spawnSync() {
            spawnCount += 1;
            return { status: 0 };
        },
        console: createSilentConsole()
    });

    assert.equal(exitCode, 1);
    assert.equal(spawnCount, 0);
    assert.equal(fs.existsSync(path.join(workspaceRoot, "test-results", "e2e", "kawaii-last-run.json")), false);
});

function readMarker(workspaceRoot) {
    return JSON.parse(fs.readFileSync(path.join(workspaceRoot, "test-results", "e2e", "kawaii-last-run.json"), "utf8"));
}

function createSilentConsole() {
    return {
        error() {},
        log() {}
    };
}
