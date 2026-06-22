const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

let packageTools = {};

try {
  packageTools = require("./package-local-vsix");
} catch (error) {
  if (!error || error.code !== "MODULE_NOT_FOUND") {
    throw error;
  }
}

test("getVsixOutputPath creates a dist VSIX path from package identity", () => {
  assert.equal(typeof packageTools.getVsixOutputPath, "function");

  const outputPath = packageTools.getVsixOutputPath(
    { name: "kawaii-vscode-color", version: "1.2.3" },
    path.join("C:", "workspace")
  );

  assert.equal(outputPath, path.join("C:", "workspace", "dist", "kawaii-vscode-color-1.2.3.vsix"));
});

test("getVsceCommand prefers npm exec when npm exposes its own executable path", () => {
  assert.equal(typeof packageTools.getVsceCommand, "function");

  const command = packageTools.getVsceCommand({
    env: {
      npm_execpath: path.join("C:", "npm", "npm-cli.js"),
      npm_node_execpath: path.join("C:", "node", "node.exe")
    },
    existsSync: () => true,
    execPath: "node"
  });

  assert.deepEqual(command, {
    command: path.join("C:", "node", "node.exe"),
    args: [
      path.join("C:", "npm", "npm-cli.js"),
      "exec",
      "--yes",
      "--package",
      "@vscode/vsce",
      "--",
      "vsce"
    ]
  });
});

test("createLocalVsix creates dist and calls vsce package without running real vsce", () => {
  assert.equal(typeof packageTools.createLocalVsix, "function");

  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-vsix-package-"));
  const calls = [];
  let output = "";

  try {
    fs.writeFileSync(
      path.join(workspaceRoot, "package.json"),
      `${JSON.stringify({ name: "kawaii-vscode-color", version: "0.1.31" }, null, 2)}\n`,
      "utf8"
    );

    const result = packageTools.createLocalVsix({
      workspaceRoot,
      env: {},
      platform: "linux",
      spawnSync(command, args, options) {
        calls.push({ command, args, options });
        return { status: 0 };
      },
      output: {
        write(chunk) {
          output += chunk;
        }
      }
    });

    const expectedOutputPath = path.join(workspaceRoot, "dist", "kawaii-vscode-color-0.1.31.vsix");

    assert.deepEqual(result, {
      outputPath: expectedOutputPath,
      exitCode: 0
    });
    assert.equal(fs.existsSync(path.join(workspaceRoot, "dist")), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "npx");
    assert.deepEqual(calls[0].args, [
      "--yes",
      "@vscode/vsce",
      "package",
      "--out",
      expectedOutputPath
    ]);
    assert.equal(calls[0].options.cwd, workspaceRoot);
    assert.match(output, /Local VSIX created at:/);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("createLocalVsix returns package command failures without printing success", () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-vsix-package-fail-"));
  let output = "";

  try {
    fs.writeFileSync(
      path.join(workspaceRoot, "package.json"),
      `${JSON.stringify({ name: "kawaii-vscode-color", version: "0.1.31" }, null, 2)}\n`,
      "utf8"
    );

    const result = packageTools.createLocalVsix({
      workspaceRoot,
      env: {},
      platform: "linux",
      spawnSync() {
        return { status: 7 };
      },
      output: {
        write(chunk) {
          output += chunk;
        }
      }
    });

    assert.equal(result.exitCode, 7);
    assert.equal(output, "");
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
});
