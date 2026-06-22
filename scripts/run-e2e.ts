import path = require("node:path");
import { spawnSync } from "node:child_process";
import {
    createE2ELastRunRecord,
    finalizeE2ELastRunRecord,
    readExTesterLastRun,
    updateE2ELastRunPhase,
    validateE2ERunOptions,
    writeE2ELastRunRecord
} from "./e2e-last-run";

type E2EMode = "safe" | "current" | "neon";
type E2ELastRunRecord = ReturnType<typeof createE2ELastRunRecord>;

interface E2EPhase {
    readonly name: string;
    readonly mochaConfig: string;
}

interface E2ERunnerConfig {
    readonly mode: E2EMode;
    readonly isWindows: boolean;
    readonly workspaceRoot: string;
    readonly extestBinary: string;
    readonly codeVersion: string;
    readonly codeSettings: string;
    readonly openResource: string;
    readonly storage: string;
    readonly extensionsDir: string;
    readonly phases: readonly E2EPhase[];
    readonly env: NodeJS.ProcessEnv;
}

const E2E_TEST_PATTERN = "test/e2e/**/*.spec.js";
const DEFAULT_CODE_VERSION = "1.111.0";
const CURRENT_CODE_VERSION_FALLBACK = "max";
const CODE_SETTINGS = "test/e2e/settings.json";
const OPEN_RESOURCE = "test/fixtures/workspace";
const SAFE_MOCHA_CONFIG = "test/e2e/.mocharc.js";
const NEON_PHASES: readonly E2EPhase[] = [
    { name: "neon apply", mochaConfig: "test/e2e/.mocharc.neon-apply.js" },
    { name: "neon applied after full restart", mochaConfig: "test/e2e/.mocharc.neon-applied.js" },
    { name: "neon alternate after full restart", mochaConfig: "test/e2e/.mocharc.neon-alternate.js" },
    { name: "neon dstgroup reverted after full restart", mochaConfig: "test/e2e/.mocharc.neon-reverted.js" },
    { name: "neon restored after full restart", mochaConfig: "test/e2e/.mocharc.neon-restored.js" }
];

function normalizeMode(requestedMode: string | undefined): E2EMode {
    return requestedMode === "neon" || requestedMode === "current" ? requestedMode : "safe";
}

function getStorage(mode: E2EMode): string {
    if (mode === "neon") {
        return ".vscode-test/extest-111-neon";
    }

    if (mode === "current") {
        return ".vscode-test/extest-current";
    }

    return ".vscode-test/extest-111";
}

function getExtensionsDir(mode: E2EMode): string {
    if (mode === "neon") {
        return ".vscode-test/extest-111-neon-extensions";
    }

    if (mode === "current") {
        return ".vscode-test/extest-current-extensions";
    }

    return ".vscode-test/extest-111-extensions";
}

function getCodeVersion(mode: E2EMode, env: NodeJS.ProcessEnv): string {
    if (mode === "current") {
        return env.KAWAII_E2E_CURRENT_CODE_VERSION || CURRENT_CODE_VERSION_FALLBACK;
    }

    return DEFAULT_CODE_VERSION;
}

function getPhases(mode: E2EMode): readonly E2EPhase[] {
    if (mode === "neon") {
        return NEON_PHASES;
    }

    return [
        {
            name: mode === "current" ? "current" : "safe",
            mochaConfig: SAFE_MOCHA_CONFIG
        }
    ];
}

function createRunnerEnv(storage: string): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };

    env.KAWAII_E2E_STORAGE = path.resolve(storage);
    env.KAWAII_E2E_TEST_HOOKS = "1";
    delete env.ELECTRON_RUN_AS_NODE;

    return env;
}

function createE2ERunnerConfig(): E2ERunnerConfig {
    const mode = normalizeMode(process.argv[2]);
    const isWindows = process.platform === "win32";
    const workspaceRoot = process.cwd();
    const extestBinary = path.join(
        workspaceRoot,
        "node_modules",
        ".bin",
        isWindows ? "extest.cmd" : "extest"
    );
    const storage = getStorage(mode);
    const env = createRunnerEnv(storage);

    return {
        mode,
        isWindows,
        workspaceRoot,
        extestBinary,
        codeVersion: getCodeVersion(mode, env),
        codeSettings: CODE_SETTINGS,
        openResource: OPEN_RESOURCE,
        storage,
        extensionsDir: getExtensionsDir(mode),
        phases: getPhases(mode),
        env
    };
}

function createRunRecord(config: E2ERunnerConfig): E2ELastRunRecord {
    return createE2ELastRunRecord({
        mode: config.mode,
        workspaceRoot: config.workspaceRoot,
        storage: config.storage,
        extensionsDir: config.extensionsDir,
        codeVersion: config.codeVersion,
        codeSettings: config.codeSettings,
        openResource: config.openResource,
        phases: config.phases
    });
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
    }

    return String(error);
}

function finalizeAndWriteRunRecord(
    record: E2ELastRunRecord,
    config: E2ERunnerConfig,
    exitCode: number,
    error?: unknown
): void {
    const extesterLastRun = exitCode === 0
        ? { failedTests: [] }
        : readExTesterLastRun({ workspaceRoot: config.workspaceRoot, minModifiedAt: record.startedAt });

    finalizeE2ELastRunRecord(record, {
        exitCode,
        error,
        failedTests: extesterLastRun.failedTests,
        finishedAt: new Date().toISOString()
    });
    writeE2ELastRunRecord(record, { workspaceRoot: config.workspaceRoot });
}

/**
 * Runs the safe, current, or gated Neon ExTester suite and writes the project-owned last-run marker.
 *
 * @returns Process exit code for the selected E2E run.
 */
function runE2E(): number {
    const config = createE2ERunnerConfig();

    try {
        validateE2ERunOptions({
            mode: config.mode,
            workspaceRoot: config.workspaceRoot,
            storage: config.storage,
            env: config.env
        });
    } catch (error) {
        console.error(getErrorMessage(error));
        return 1;
    }

    const runRecord = createRunRecord(config);

    writeE2ELastRunRecord(runRecord, { workspaceRoot: config.workspaceRoot });

    for (const phase of config.phases) {
        console.log(`Running E2E phase: ${phase.name}`);
        updateE2ELastRunPhase(runRecord, phase.name, {
            status: "running",
            startedAt: new Date().toISOString()
        });
        writeE2ELastRunRecord(runRecord, { workspaceRoot: config.workspaceRoot });

        const result = spawnSync(config.extestBinary, [
            "setup-and-run",
            E2E_TEST_PATTERN,
            "--code_version",
            config.codeVersion,
            "--storage",
            config.storage,
            "--extensions_dir",
            config.extensionsDir,
            "--code_settings",
            config.codeSettings,
            "--open_resource",
            config.openResource,
            "--mocha_config",
            phase.mochaConfig
        ], {
            env: config.env,
            shell: config.isWindows,
            stdio: "inherit"
        });

        if (result.error) {
            updateE2ELastRunPhase(runRecord, phase.name, {
                status: "failed",
                finishedAt: new Date().toISOString(),
                exitCode: 1,
                error: result.error
            });
            finalizeAndWriteRunRecord(runRecord, config, 1, result.error);
            console.error(result.error);

            return 1;
        }

        if (result.status) {
            updateE2ELastRunPhase(runRecord, phase.name, {
                status: "failed",
                finishedAt: new Date().toISOString(),
                exitCode: result.status
            });
            finalizeAndWriteRunRecord(runRecord, config, result.status);

            return result.status;
        }

        updateE2ELastRunPhase(runRecord, phase.name, {
            status: "passed",
            finishedAt: new Date().toISOString(),
            exitCode: 0
        });
        writeE2ELastRunRecord(runRecord, { workspaceRoot: config.workspaceRoot });
    }

    finalizeAndWriteRunRecord(runRecord, config, 0);

    return 0;
}

/**
 * CLI entrypoint for the stable JavaScript wrapper.
 *
 * @returns {void}
 */
function runCli(): void {
    process.exit(runE2E());
}

if (require.main === module) {
    runCli();
}

export {
    runCli,
    runE2E
};
