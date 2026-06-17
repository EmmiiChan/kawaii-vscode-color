const path = require("node:path");
const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
  files: "test/integration/**/*.test.js",
  extensionDevelopmentPath: __dirname,
  workspaceFolder: path.join(__dirname, "test", "fixtures", "workspace"),
  launchArgs: ["--disable-workspace-trust"],
  mocha: {
    timeout: 20000,
  },
});
