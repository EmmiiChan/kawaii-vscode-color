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

test("Neon Mocha phase greps match exact phase tags only", () => {
    const phaseCases = [
        {
            mochaConfig: "test/e2e/.mocharc.neon-apply.js",
            matchingTitle: "captures before state @neon-real-apply",
            rejectedTitles: [
                "validates applied state @neon-real-applied",
                "validates alternate state @neon-real-alternate",
                "validates reverted state @neon-real-reverted",
                "validates restored state @neon-real-restored"
            ]
        },
        {
            mochaConfig: "test/e2e/.mocharc.neon-applied.js",
            matchingTitle: "validates applied state @neon-real-applied",
            rejectedTitles: [
                "captures before state @neon-real-apply",
                "validates alternate state @neon-real-alternate"
            ]
        }
    ];

    for (const phaseCase of phaseCases) {
        assert.equal(matchesMochaGrep(phaseCase.mochaConfig, phaseCase.matchingTitle), true);

        for (const rejectedTitle of phaseCase.rejectedTitles) {
            assert.equal(
                matchesMochaGrep(phaseCase.mochaConfig, rejectedTitle),
                false,
                `${phaseCase.mochaConfig} should not match ${rejectedTitle}`
            );
        }
    }
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

test("runE2EWithConfig removes stale Neon patch before launching the apply phase", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-e2e-neon-clean-"));
    const workbenchDir = path.join(
        workspaceRoot,
        ".vscode-test",
        "extest-111-neon",
        "VSCode-win32-x64-archive",
        "ce099c1ed2",
        "resources",
        "app",
        "out",
        "vs",
        "code",
        "electron-browser",
        "workbench"
    );
    const htmlFile = path.join(workbenchDir, "workbench.html");
    const patchedHtml = [
        "<html>",
        "\t<!-- KAWAII VSCODE COLORS UI --><script src=\"kawaii-vscode-colors-ui.js?v=old\"></script><!-- /KAWAII VSCODE COLORS UI -->",
        "</html>",
        ""
    ].join("\n");
    const scriptFile = path.join(workbenchDir, "kawaii-vscode-colors-ui.js");
    const styleFile = path.join(workbenchDir, "kawaii-vscode-colors-ui.min.css");
    const legacyScriptFile = path.join(workbenchDir, "neondreams.js");
    t.after(() => {
        fs.rmSync(workspaceRoot, { force: true, recursive: true });
    });
    fs.mkdirSync(workbenchDir, { recursive: true });
    fs.writeFileSync(htmlFile, patchedHtml, "utf8");
    fs.writeFileSync(scriptFile, "stale script", "utf8");
    fs.writeFileSync(styleFile, "stale style", "utf8");
    fs.writeFileSync(legacyScriptFile, "stale legacy script", "utf8");

    let htmlAtSpawn = "";
    const config = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js", "neon"],
        env: {
            KAWAII_E2E_ALLOW_NEON_PATCH: "1"
        },
        platform: "linux",
        workspaceRoot
    });

    const exitCode = runE2EWithConfig(config, {
        spawnSync() {
            htmlAtSpawn = fs.readFileSync(htmlFile, "utf8");
            return { status: 2 };
        },
        console: createSilentConsole()
    });

    assert.equal(exitCode, 2);
    assert.doesNotMatch(htmlAtSpawn, /KAWAII VSCODE COLORS UI/);
    assert.doesNotMatch(fs.readFileSync(htmlFile, "utf8"), /kawaii-vscode-colors-ui\.js/);
    assert.equal(fs.existsSync(scriptFile), false);
    assert.equal(fs.existsSync(styleFile), false);
    assert.equal(fs.existsSync(legacyScriptFile), false);
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

test("runE2EWithConfig cleans disposable VS Code processes without interrupting the initial Neon restart", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-e2e-cleanup-"));
    t.after(() => {
        fs.rmSync(workspaceRoot, { force: true, recursive: true });
    });
    const calls = [];
    const config = createE2ERunnerConfig({
        argv: ["node", "scripts/run-e2e.js", "neon"],
        env: {
            KAWAII_E2E_ALLOW_NEON_PATCH: "1"
        },
        platform: "win32",
        workspaceRoot
    });

    const exitCode = runE2EWithConfig(config, {
        cleanupPhase(_config, phase) {
            calls.push(`cleanup:${phase.name}`);
        },
        spawnSync(_command, args) {
            calls.push(`spawn:${args[args.length - 1]}`);
            return { status: calls.filter((call) => call.startsWith("spawn:")).length === 1 ? 0 : 2 };
        },
        console: createSilentConsole()
    });

    assert.equal(exitCode, 2);
    assert.deepEqual(calls, [
        "cleanup:neon apply",
        "spawn:test/e2e/.mocharc.neon-apply.js",
        "spawn:test/e2e/.mocharc.neon-applied.js",
        "cleanup:neon applied after full restart"
    ]);
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

function matchesMochaGrep(mochaConfigPath, title) {
    const mochaConfig = require(path.join(__dirname, "..", mochaConfigPath));
    const grep = mochaConfig.grep;

    if (grep instanceof RegExp) {
        grep.lastIndex = 0;
        return grep.test(title);
    }

    return new RegExp(String(grep)).test(title);
}

function createSilentConsole() {
    return {
        error() {},
        log() {}
    };
}
