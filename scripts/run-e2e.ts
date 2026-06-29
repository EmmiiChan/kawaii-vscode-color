import path = require("node:path");
import fs = require("node:fs");
import { spawnSync } from "node:child_process";
import {
    createE2ELastRunRecord,
    finalizeE2ELastRunRecord,
    readExTesterLastRun,
    updateE2ELastRunPhase,
    validateE2ERunOptions,
    writeE2ELastRunRecord
} from "./e2e-last-run";
import { cleanupDisposableVSCodeProcesses } from "./test-process-cleanup-diagnostics";

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

interface E2ERunnerConfigOptions {
    readonly argv?: readonly string[];
    readonly env?: NodeJS.ProcessEnv;
    readonly platform?: NodeJS.Platform;
    readonly workspaceRoot?: string;
    readonly extestBinary?: string;
}

interface E2ERunnerDependencies {
    readonly cleanupPhase?: typeof cleanupE2EPhase;
    readonly console?: Pick<Console, "error" | "log">;
    readonly now?: () => string;
    readonly preparePhase?: typeof prepareE2EPhase;
    readonly readExTesterLastRun?: typeof readExTesterLastRun;
    readonly spawnSync?: typeof spawnSync;
    readonly writeE2ELastRunRecord?: typeof writeE2ELastRunRecord;
}

const E2E_TEST_PATTERN = "test/e2e/**/*.spec.js";
const DEFAULT_CODE_VERSION = "1.111.0";
const CURRENT_CODE_VERSION_FALLBACK = "max";
const CODE_SETTINGS = "test/e2e/settings.json";
const OPEN_RESOURCE = "test/fixtures/workspace";
const SAFE_MOCHA_CONFIG = "test/e2e/.mocharc.js";
const NEON_APPLY_PHASE_NAME = "neon apply";
const WORKBENCH_PATCH_SCRIPT_TAG_PATTERNS: readonly RegExp[] = [
    /^.*<!-- KAWAII VSCODE COLORS UI --><script src="kawaii-vscode-colors-ui\.js(?:\?v=[^"]+)?"><\/script><!-- \/KAWAII VSCODE COLORS UI -->.*\r?\n?/mg,
    /^.*<!-- KAWAII SYNTHWAVE --><script src="neondreams\.js(?:\?v=[^"]+)?"><\/script><!-- NEON DREAMS -->.*\r?\n?/mg
];
const WORKBENCH_PATCH_ASSET_FILE_NAMES: readonly string[] = [
    "kawaii-vscode-colors-ui.js",
    "kawaii-vscode-colors-ui.min.css",
    "kawaii-vscode-colors-editor-background-image.png",
    "kawaii-vscode-colors-editor-background-image.jpg",
    "kawaii-vscode-colors-editor-background-image.jpeg",
    "kawaii-vscode-colors-editor-background-image.webp",
    "kawaii-vscode-colors-editor-background-image.svg",
    "kawaii-vscode-colors-empty-editor-logo-image.png",
    "kawaii-vscode-colors-empty-editor-logo-image.jpg",
    "kawaii-vscode-colors-empty-editor-logo-image.jpeg",
    "kawaii-vscode-colors-empty-editor-logo-image.webp",
    "kawaii-vscode-colors-empty-editor-logo-image.svg",
    "neondreams.js"
];
const NEON_PHASES: readonly E2EPhase[] = [
    { name: NEON_APPLY_PHASE_NAME, mochaConfig: "test/e2e/.mocharc.neon-apply.js" },
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

function createRunnerEnv(storage: string, workspaceRoot = process.cwd(), baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...baseEnv };

    env.KAWAII_E2E_STORAGE = path.resolve(workspaceRoot, storage);
    env.KAWAII_E2E_TEST_HOOKS = "1";
    delete env.ELECTRON_RUN_AS_NODE;

    return env;
}

function createE2ERunnerConfig(options: E2ERunnerConfigOptions = {}): E2ERunnerConfig {
    const argv = options.argv || process.argv;
    const mode = normalizeMode(argv[2]);
    const platform = options.platform || process.platform;
    const isWindows = platform === "win32";
    const workspaceRoot = options.workspaceRoot || process.cwd();
    const extestBinary = options.extestBinary || path.join(
        workspaceRoot,
        "node_modules",
        ".bin",
        isWindows ? "extest.cmd" : "extest"
    );
    const storage = getStorage(mode);
    const env = createRunnerEnv(storage, workspaceRoot, options.env || process.env);

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
    error?: unknown,
    dependencies: E2ERunnerDependencies = {}
): void {
    const readExTesterLastRunImpl = dependencies.readExTesterLastRun || readExTesterLastRun;
    const writeE2ELastRunRecordImpl = dependencies.writeE2ELastRunRecord || writeE2ELastRunRecord;
    const now = dependencies.now || (() => new Date().toISOString());
    const extesterLastRun = exitCode === 0
        ? { failedTests: [] }
        : readExTesterLastRunImpl({ workspaceRoot: config.workspaceRoot, minModifiedAt: record.startedAt });

    finalizeE2ELastRunRecord(record, {
        exitCode,
        error,
        failedTests: extesterLastRun.failedTests,
        finishedAt: now()
    });
    writeE2ELastRunRecordImpl(record, { workspaceRoot: config.workspaceRoot });
}

function prepareE2EPhase(config: E2ERunnerConfig, phase: E2EPhase): void {
    if (config.mode !== "neon" || phase.name !== NEON_APPLY_PHASE_NAME) {
        return;
    }

    removeDisposableNeonWorkbenchPatch(config);
}

function cleanupE2EPhase(config: E2ERunnerConfig, _phase: E2EPhase): void {
    if (!config.isWindows) {
        return;
    }

    cleanupDisposableVSCodeProcesses({
        workspaceRoot: config.workspaceRoot,
        output: { write() {} }
    });
}

function shouldCleanupBeforePhase(config: E2ERunnerConfig, phase: E2EPhase): boolean {
    return config.mode !== "neon" || phase.name === NEON_APPLY_PHASE_NAME;
}

function shouldCleanupAfterPhase(config: E2ERunnerConfig, phase: E2EPhase): boolean {
    return config.mode !== "neon" || phase.name !== NEON_APPLY_PHASE_NAME;
}

function removeDisposableNeonWorkbenchPatch(config: E2ERunnerConfig): void {
    const htmlFile = findDisposableNeonWorkbenchHtml(config);

    if (!htmlFile) {
        return;
    }

    const html = fs.readFileSync(htmlFile, "utf8");
    const cleanHtml = removeMarkedWorkbenchPatchScriptTags(html);

    if (cleanHtml !== html) {
        fs.writeFileSync(htmlFile, cleanHtml, "utf8");
    }

    removeDisposableNeonWorkbenchAssets(config, path.dirname(htmlFile));
}

function findDisposableNeonWorkbenchHtml(config: E2ERunnerConfig): string | undefined {
    const storageRoot = path.resolve(config.workspaceRoot, config.storage);
    const archiveRoot = path.join(storageRoot, "VSCode-win32-x64-archive");
    const baseCandidates = [path.join(archiveRoot, "resources", "app", "out", "vs", "code")];

    if (fs.existsSync(archiveRoot)) {
        for (const entry of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                baseCandidates.push(path.join(archiveRoot, entry.name, "resources", "app", "out", "vs", "code"));
            }
        }
    }

    for (const baseCandidate of baseCandidates) {
        for (const electronBase of ["electron-browser", "electron-sandbox"]) {
            for (const htmlFileName of ["workbench.esm.html", "workbench.html"]) {
                const htmlFile = path.join(baseCandidate, electronBase, "workbench", htmlFileName);

                if (isInsideDisposableNeonStorage(config, htmlFile) && fs.existsSync(htmlFile)) {
                    return htmlFile;
                }
            }
        }
    }

    return undefined;
}

function isInsideDisposableNeonStorage(config: E2ERunnerConfig, filePath: string): boolean {
    const storageRoot = path.resolve(config.workspaceRoot, ".vscode-test", "extest-111-neon");
    const resolvedPath = path.resolve(filePath);

    return resolvedPath === storageRoot || resolvedPath.startsWith(`${storageRoot}${path.sep}`);
}

function removeDisposableNeonWorkbenchAssets(config: E2ERunnerConfig, workbenchDirectory: string): void {
    for (const fileName of WORKBENCH_PATCH_ASSET_FILE_NAMES) {
        const assetPath = path.join(workbenchDirectory, fileName);

        if (isInsideDisposableNeonStorage(config, assetPath) && fs.existsSync(assetPath)) {
            fs.unlinkSync(assetPath);
        }
    }
}

function removeMarkedWorkbenchPatchScriptTags(html: string): string {
    return WORKBENCH_PATCH_SCRIPT_TAG_PATTERNS.reduce(
        (output, pattern) => output.replace(pattern, ""),
        String(html || "")
    );
}

/**
 * Runs the safe, current, or gated Neon ExTester suite and writes the project-owned last-run marker.
 *
 * @returns Process exit code for the selected E2E run.
 */
function runE2E(): number {
    return runE2EWithConfig(createE2ERunnerConfig());
}

function runE2EWithConfig(config: E2ERunnerConfig, dependencies: E2ERunnerDependencies = {}): number {
    const cleanupPhase = dependencies.cleanupPhase || cleanupE2EPhase;
    const consoleImpl = dependencies.console || console;
    const preparePhase = dependencies.preparePhase || prepareE2EPhase;
    const spawnSyncImpl = dependencies.spawnSync || spawnSync;
    const writeE2ELastRunRecordImpl = dependencies.writeE2ELastRunRecord || writeE2ELastRunRecord;
    const now = dependencies.now || (() => new Date().toISOString());

    try {
        validateE2ERunOptions({
            mode: config.mode,
            workspaceRoot: config.workspaceRoot,
            storage: config.storage,
            env: config.env
        });
    } catch (error) {
        consoleImpl.error(getErrorMessage(error));
        return 1;
    }

    const runRecord = createRunRecord(config);

    writeE2ELastRunRecordImpl(runRecord, { workspaceRoot: config.workspaceRoot });

    for (const phase of config.phases) {
        consoleImpl.log(`Running E2E phase: ${phase.name}`);
        updateE2ELastRunPhase(runRecord, phase.name, {
            status: "running",
            startedAt: now()
        });
        writeE2ELastRunRecordImpl(runRecord, { workspaceRoot: config.workspaceRoot });
        if (shouldCleanupBeforePhase(config, phase)) {
            cleanupPhase(config, phase);
        }
        preparePhase(config, phase);

        const result = spawnSyncImpl(config.extestBinary, [
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
        if (shouldCleanupAfterPhase(config, phase)) {
            cleanupPhase(config, phase);
        }

        if (result.error) {
            updateE2ELastRunPhase(runRecord, phase.name, {
                status: "failed",
                finishedAt: now(),
                exitCode: 1,
                error: result.error
            });
            finalizeAndWriteRunRecord(runRecord, config, 1, result.error, dependencies);
            consoleImpl.error(result.error);

            return 1;
        }

        if (result.status) {
            updateE2ELastRunPhase(runRecord, phase.name, {
                status: "failed",
                finishedAt: now(),
                exitCode: result.status
            });
            finalizeAndWriteRunRecord(runRecord, config, result.status, undefined, dependencies);

            return result.status;
        }

        updateE2ELastRunPhase(runRecord, phase.name, {
            status: "passed",
            finishedAt: now(),
            exitCode: 0
        });
        writeE2ELastRunRecordImpl(runRecord, { workspaceRoot: config.workspaceRoot });
    }

    finalizeAndWriteRunRecord(runRecord, config, 0, undefined, dependencies);

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
    cleanupE2EPhase,
    createE2ERunnerConfig,
    runCli,
    runE2E,
    runE2EWithConfig
};
