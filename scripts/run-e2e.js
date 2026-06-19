const path = require("path");
const { spawnSync } = require("child_process");

const mode = process.argv[2] === "neon" ? "neon" : "safe";
const isWindows = process.platform === "win32";
const extestBinary = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    isWindows ? "extest.cmd" : "extest"
);
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

for (const phase of phases) {
    console.log(`Running E2E phase: ${phase.name}`);

    const result = spawnSync(extestBinary, [
        "setup-and-run",
        "test/e2e/**/*.spec.js",
        "--code_version",
        "1.111.0",
        "--storage",
        storage,
        "--extensions_dir",
        extensionsDir,
        "--code_settings",
        "test/e2e/settings.json",
        "--open_resource",
        "test/fixtures/workspace",
        "--mocha_config",
        phase.mochaConfig
    ], {
        env,
        shell: isWindows,
        stdio: "inherit"
    });

    if (result.error) {
        console.error(result.error);
        process.exit(1);
    }

    if (result.status) {
        process.exit(result.status);
    }
}

process.exit(0);
