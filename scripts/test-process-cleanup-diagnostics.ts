import fs = require("node:fs");
import path = require("node:path");
import { spawnSync } from "node:child_process";

export const DISPOSABLE_TEST_STORAGE_RELATIVE_PATHS: readonly string[] = [".vscode-test"];
const DEFAULT_ARTIFACT_RELATIVE_PATHS: readonly string[] = [
    ".vscode-test",
    "test-results",
    "playwright-report",
    "out-tests"
];

export interface ProcessInfo {
    readonly processId: number;
    readonly name?: string;
    readonly executablePath?: string;
    readonly commandLine?: string;
}

export interface ArtifactDiagnostic {
    readonly absolutePath: string;
    readonly bytes: number;
    readonly directoryCount: number;
    readonly exists: boolean;
    readonly fileCount: number;
    readonly relativePath: string;
}

interface CleanupDiagnosticsOptions {
    readonly artifactRelativePaths?: readonly string[];
    readonly kill?: boolean;
    readonly killProcesses?: (processes: readonly ProcessInfo[]) => void;
    readonly output?: { write(chunk: string): unknown };
    readonly platform?: NodeJS.Platform;
    readonly queryProcesses?: (storageRoots: readonly string[]) => readonly ProcessInfo[];
    readonly workspaceRoot?: string;
}

interface CleanupDiagnosticsResult {
    readonly artifacts: readonly ArtifactDiagnostic[];
    readonly processes: {
        readonly matched: readonly ProcessInfo[];
        readonly unsupported: boolean;
    };
}

export function filterDisposableVSCodeProcesses(
    processes: readonly ProcessInfo[],
    storageRoots: readonly string[],
    platform: NodeJS.Platform = process.platform
): readonly ProcessInfo[] {
    const normalizedStorageRoots = storageRoots.map((storageRoot) => normalizePathForComparison(storageRoot, platform));

    return processes.filter((processInfo) => {
        if (!isCodeExecutable(processInfo, platform)) {
            return false;
        }

        const executablePath = processInfo.executablePath ? normalizePathForComparison(processInfo.executablePath, platform) : "";
        const commandLine = processInfo.commandLine ? normalizePathForComparison(processInfo.commandLine, platform) : "";

        return normalizedStorageRoots.some((storageRoot) =>
            isInsideOrSamePath(executablePath, storageRoot, platform)
            || commandLine.includes(storageRoot)
        );
    });
}

export function createArtifactDiagnostics(options: {
    readonly artifactRelativePaths?: readonly string[];
    readonly workspaceRoot?: string;
}): readonly ArtifactDiagnostic[] {
    const workspaceRoot = path.resolve(options.workspaceRoot || process.cwd());
    const artifactRelativePaths = options.artifactRelativePaths || DEFAULT_ARTIFACT_RELATIVE_PATHS;

    return artifactRelativePaths.map((relativePath) => {
        const absolutePath = resolveInsideWorkspace(workspaceRoot, relativePath);

        if (!fs.existsSync(absolutePath)) {
            return {
                absolutePath,
                bytes: 0,
                directoryCount: 0,
                exists: false,
                fileCount: 0,
                relativePath
            };
        }

        const totals = collectArtifactTotals(absolutePath);

        return {
            absolutePath,
            bytes: totals.bytes,
            directoryCount: totals.directoryCount,
            exists: true,
            fileCount: totals.fileCount,
            relativePath
        };
    });
}

export function runCleanupDiagnostics(options: CleanupDiagnosticsOptions = {}): CleanupDiagnosticsResult {
    const workspaceRoot = path.resolve(options.workspaceRoot || process.cwd());
    const platform = options.platform || process.platform;
    const output = options.output || process.stdout;
    const storageRoots = DISPOSABLE_TEST_STORAGE_RELATIVE_PATHS.map((relativePath) => resolveInsideWorkspace(workspaceRoot, relativePath));
    const queryProcesses = options.queryProcesses || queryDisposableVSCodeProcesses;
    const processCandidates = platform === "win32" ? queryProcesses(storageRoots) : [];
    const matched = platform === "win32"
        ? filterDisposableVSCodeProcesses(processCandidates, storageRoots, platform)
        : [];
    const artifacts = createArtifactDiagnostics({
        workspaceRoot,
        artifactRelativePaths: options.artifactRelativePaths || DEFAULT_ARTIFACT_RELATIVE_PATHS
    });

    writeDiagnosticsReport(output, {
        artifacts,
        kill: Boolean(options.kill),
        matched,
        platform,
        workspaceRoot
    });

    if (options.kill && matched.length > 0) {
        const killProcesses = options.killProcesses || killProcessesOnWindows;
        killProcesses(matched);
    }

    return {
        artifacts,
        processes: {
            matched,
            unsupported: platform !== "win32"
        }
    };
}

export function cleanupDisposableVSCodeProcesses(options: CleanupDiagnosticsOptions = {}): CleanupDiagnosticsResult {
    return runCleanupDiagnostics({
        ...options,
        artifactRelativePaths: [],
        kill: true
    });
}

export function runCli(): void {
    try {
        runCleanupDiagnostics({
            kill: process.argv.includes("--kill")
        });
    } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    }
}

function queryDisposableVSCodeProcesses(): readonly ProcessInfo[] {
    if (process.platform !== "win32") {
        return [];
    }

    const result = spawnSync("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"name = 'Code.exe'\" | Select-Object ProcessId,Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress"
    ], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status && result.status !== 0) {
        throw new Error(result.stderr || `Get-CimInstance failed with exit code ${result.status}`);
    }

    return parsePowerShellProcesses(result.stdout);
}

function parsePowerShellProcesses(stdout: string): readonly ProcessInfo[] {
    const trimmed = String(stdout || "").trim();

    if (!trimmed) {
        return [];
    }

    const parsed = JSON.parse(trimmed);
    const values = Array.isArray(parsed) ? parsed : [parsed];

    return values.map((value) => ({
        processId: Number(value.ProcessId ?? value.processId),
        name: value.Name ?? value.name,
        executablePath: value.ExecutablePath ?? value.executablePath,
        commandLine: value.CommandLine ?? value.commandLine
    })).filter((value) => Number.isInteger(value.processId) && value.processId > 0);
}

function killProcessesOnWindows(processes: readonly ProcessInfo[]): void {
    const processIds = processes
        .map((processInfo) => processInfo.processId)
        .filter((processId) => Number.isInteger(processId) && processId > 0);

    if (processIds.length === 0) {
        return;
    }

    const command = `$ids = @(${processIds.join(",")}); Stop-Process -Id $ids -Force`;
    const result = spawnSync("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        command
    ], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status && result.status !== 0) {
        throw new Error(result.stderr || `Stop-Process failed with exit code ${result.status}`);
    }
}

function isCodeExecutable(processInfo: ProcessInfo, platform: NodeJS.Platform): boolean {
    const name = processInfo.name || path.basename(processInfo.executablePath || "");
    const normalizedName = platform === "win32" ? name.toLowerCase() : name;

    return normalizedName === (platform === "win32" ? "code.exe" : "Code.exe");
}

function normalizePathForComparison(value: string, platform: NodeJS.Platform): string {
    const normalizedValue = path.resolve(value);
    return platform === "win32" ? normalizedValue.toLowerCase() : normalizedValue;
}

function isInsideOrSamePath(candidatePath: string, rootPath: string, platform: NodeJS.Platform): boolean {
    if (!candidatePath) {
        return false;
    }

    const separator = platform === "win32" ? "\\" : path.sep;
    return candidatePath === rootPath || candidatePath.startsWith(`${rootPath}${separator}`);
}

function resolveInsideWorkspace(workspaceRoot: string, relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
        throw new Error(`Artifact path must be relative: ${relativePath}`);
    }

    const absolutePath = path.resolve(workspaceRoot, relativePath);

    if (absolutePath !== workspaceRoot && !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
        throw new Error(`Artifact path is outside workspace: ${relativePath}`);
    }

    return absolutePath;
}

function collectArtifactTotals(absolutePath: string): {
    readonly bytes: number;
    readonly directoryCount: number;
    readonly fileCount: number;
} {
    const stat = fs.lstatSync(absolutePath);

    if (stat.isFile()) {
        return { bytes: stat.size, directoryCount: 0, fileCount: 1 };
    }

    if (!stat.isDirectory()) {
        return { bytes: 0, directoryCount: 0, fileCount: 0 };
    }

    return fs.readdirSync(absolutePath).reduce((totals, entryName) => {
        const entryTotals = collectArtifactTotals(path.join(absolutePath, entryName));

        return {
            bytes: totals.bytes + entryTotals.bytes,
            directoryCount: totals.directoryCount + entryTotals.directoryCount,
            fileCount: totals.fileCount + entryTotals.fileCount
        };
    }, {
        bytes: 0,
        directoryCount: 1,
        fileCount: 0
    });
}

function writeDiagnosticsReport(output: { write(chunk: string): unknown }, data: {
    readonly artifacts: readonly ArtifactDiagnostic[];
    readonly kill: boolean;
    readonly matched: readonly ProcessInfo[];
    readonly platform: NodeJS.Platform;
    readonly workspaceRoot: string;
}): void {
    output.write(`Workspace: ${data.workspaceRoot}\n`);
    output.write(`Process diagnostics: ${data.platform === "win32" ? `${data.matched.length} disposable Code.exe process(es)` : "unsupported on this platform"}\n`);

    for (const processInfo of data.matched) {
        output.write(`- PID ${processInfo.processId}: ${processInfo.executablePath || processInfo.commandLine || processInfo.name || "Code.exe"}\n`);
    }

    if (data.kill) {
        output.write(`Kill mode: ${data.matched.length > 0 ? "enabled" : "enabled, no matching processes"}\n`);
    }

    output.write("Artifacts:\n");
    for (const artifact of data.artifacts) {
        output.write(`- ${artifact.relativePath}: ${artifact.exists ? `${artifact.bytes} bytes, ${artifact.fileCount} files, ${artifact.directoryCount} dirs` : "missing"}\n`);
    }
}

if (require.main === module) {
    runCli();
}
