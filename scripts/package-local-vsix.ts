import childProcess = require("node:child_process");
import fs = require("node:fs");
import path = require("node:path");

interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

interface VsceCommand {
  readonly command: string;
  readonly args: string[];
}

interface OutputWriter {
  write(chunk: string): unknown;
}

interface PackageLocalVsixOptions {
  readonly workspaceRoot?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly execPath?: string;
  readonly existsSync?: (filePath: string) => boolean;
  readonly spawnSync?: typeof childProcess.spawnSync;
  readonly output?: OutputWriter;
}

interface PackageLocalVsixResult {
  readonly outputPath: string;
  readonly exitCode: number;
}

const DIST_DIRECTORY_NAME = "dist";
const VSIX_EXTENSION = ".vsix";
const WORKSPACE_ROOT = resolveWorkspaceRoot(__dirname);

function resolveWorkspaceRoot(scriptDirectory: string): string {
  const candidateRoots = [
    path.resolve(scriptDirectory, ".."),
    path.resolve(scriptDirectory, "..", "..")
  ];
  const workspaceRoot = candidateRoots.find((candidateRoot) => (
    fs.existsSync(path.join(candidateRoot, "package.json"))
  ));

  return workspaceRoot || path.resolve(scriptDirectory, "..");
}

/**
 * Gets the extension manifest.
 *
 * @param workspaceRoot Repository root.
 * @returns Extension package manifest.
 */
function getPackageManifest(workspaceRoot = WORKSPACE_ROOT): PackageManifest {
  const manifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8")) as Partial<PackageManifest>;

  if (typeof manifest.name !== "string" || typeof manifest.version !== "string") {
    throw new Error("Expected package.json to contain string name and version fields.");
  }

  return {
    name: manifest.name,
    version: manifest.version
  };
}

/**
 * Gets the target VSIX file path under the workspace dist folder.
 *
 * @param manifest Extension package manifest.
 * @param workspaceRoot Repository root.
 * @returns Absolute VSIX output path.
 */
function getVsixOutputPath(manifest: PackageManifest, workspaceRoot = WORKSPACE_ROOT): string {
  const fileName = `${manifest.name}-${manifest.version}${VSIX_EXTENSION}`;
  return path.join(workspaceRoot, DIST_DIRECTORY_NAME, fileName);
}

/**
 * Ensures the local distribution folder exists.
 *
 * @param outputPath Absolute VSIX output path.
 * @returns {void}
 */
function ensureOutputDirectory(outputPath: string): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

/**
 * Gets the npm-backed vsce execution command.
 *
 * @param options Command environment options.
 * @returns Command and base arguments.
 */
function getVsceCommand(options: PackageLocalVsixOptions = {}): VsceCommand {
  const env = options.env || process.env;
  const existsSync = options.existsSync || fs.existsSync;

  if (env.npm_execpath && existsSync(env.npm_execpath)) {
    return {
      command: env.npm_node_execpath || options.execPath || process.execPath,
      args: [
        env.npm_execpath,
        "exec",
        "--yes",
        "--package",
        "@vscode/vsce",
        "--",
        "vsce"
      ]
    };
  }

  return {
    command: options.platform === "win32" ? "npx.cmd" : "npx",
    args: ["--yes", "@vscode/vsce"]
  };
}

/**
 * Runs vsce package and writes the VSIX to the configured dist path.
 *
 * @param outputPath Absolute VSIX output path.
 * @param options Package execution options.
 * @returns Exit code returned by the package command.
 */
function packageVsix(outputPath: string, options: PackageLocalVsixOptions = {}): number {
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;
  const vsceCommand = getVsceCommand(options);
  const spawnSync = options.spawnSync || childProcess.spawnSync;
  const result = spawnSync(
    vsceCommand.command,
    vsceCommand.args.concat(["package", "--out", outputPath]),
    {
      cwd: workspaceRoot,
      stdio: "inherit"
    }
  );

  if (result.error) {
    throw result.error;
  }

  return typeof result.status === "number" ? result.status : 1;
}

/**
 * Packages the extension into a local installable VSIX file.
 *
 * @param options Package execution options.
 * @returns Package result including output path and exit code.
 */
function createLocalVsix(options: PackageLocalVsixOptions = {}): PackageLocalVsixResult {
  const workspaceRoot = options.workspaceRoot || WORKSPACE_ROOT;
  const output = options.output || process.stdout;
  const manifest = getPackageManifest(workspaceRoot);
  const outputPath = getVsixOutputPath(manifest, workspaceRoot);

  ensureOutputDirectory(outputPath);
  const exitCode = packageVsix(outputPath, { ...options, workspaceRoot });

  if (exitCode === 0) {
    output.write(`Local VSIX created at: ${outputPath}\n`);
  }

  return {
    outputPath,
    exitCode
  };
}

function runCli(): void {
  const result = createLocalVsix();

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

if (require.main === module) {
  runCli();
}

export {
  createLocalVsix,
  ensureOutputDirectory,
  getPackageManifest,
  getVsceCommand,
  getVsixOutputPath,
  packageVsix,
  runCli
};
