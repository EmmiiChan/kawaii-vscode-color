import assert = require("node:assert/strict");
import fs = require("node:fs");
import path = require("node:path");
import test = require("node:test");

interface TypeScriptConfig {
  readonly compilerOptions?: {
    readonly allowJs?: boolean;
  };
  readonly include?: readonly string[];
}

const workspaceRoot = process.cwd();
const strictTypeScriptConfigPaths = [
  "tsconfig.extension.json",
  "tsconfig.scripts.json",
  "tsconfig.tests.json",
  "tsconfig.tests.emit.json"
];

test("TypeScript configs disable JavaScript compatibility mode", () => {
  for (const configPath of strictTypeScriptConfigPaths) {
    const config = readJsonFile<TypeScriptConfig>(configPath);

    assert.notEqual(config.compilerOptions?.allowJs, true, `${configPath} must not enable allowJs`);

    for (const includePattern of config.include || []) {
      assert.doesNotMatch(includePattern, /\.js($|[/*{])/u, `${configPath} must not include JavaScript globs`);
    }
  }
});

test("runtime source JavaScript is limited to the intentional Neon renderer template asset", () => {
  const runtimeJavaScriptFiles = collectFiles(path.join(workspaceRoot, "src"))
    .filter((filePath) => filePath.endsWith(".js"))
    .map(toProjectPath)
    .sort();

  assert.deepEqual(runtimeJavaScriptFiles, ["src/js/theme_template.js"]);
});

test("VSIX ignore rules exclude development artifacts but keep runtime assets packageable", () => {
  const ignoreRules = readIgnoreRules();
  const requiredExcludes = [
    ".github/**",
    ".vscode-test.js",
    "docs/**",
    "out/package.json",
    "out/src/js/**",
    "out-scripts/**",
    "out-tests/**",
    "scripts/**",
    "src/**/*.ts",
    "tsconfig*.json"
  ];
  const requiredRuntimeAssets = [
    "LICENSE.txt",
    "README.md",
    "icon.png",
    "images/**",
    "out/**",
    "package.json",
    "src/css/**",
    "src/js/**",
    "themes/**"
  ];

  for (const rule of requiredExcludes) {
    assert.ok(ignoreRules.includes(rule), `.vscodeignore must exclude ${rule}`);
  }

  for (const assetRule of requiredRuntimeAssets) {
    assert.ok(!ignoreRules.includes(assetRule), `.vscodeignore must not exclude required runtime asset ${assetRule}`);
  }
});

function readJsonFile<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8")) as T;
}

function readIgnoreRules(): readonly string[] {
  return fs.readFileSync(path.join(workspaceRoot, ".vscodeignore"), "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function collectFiles(directoryPath: string): readonly string[] {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

function toProjectPath(filePath: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}
