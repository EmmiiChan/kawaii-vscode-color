"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_REMOTE_THEMES_URL
} = require("./build-color-theme");
const {
  parseCliOptions
} = require("./update-theme-color-packs");

test("parseCliOptions defaults to the configured GitHub themes URL", () => {
  assert.deepEqual(parseCliOptions([]), {
    dryRun: false,
    githubThemesUrl: DEFAULT_REMOTE_THEMES_URL
  });
});

test("parseCliOptions accepts dry-run and a custom GitHub themes URL", () => {
  const githubThemesUrl = "https://github.com/example/kawaii-vscode-color/tree/main/themes";

  assert.deepEqual(parseCliOptions(["--dry-run", githubThemesUrl]), {
    dryRun: true,
    githubThemesUrl
  });
});

test("parseCliOptions rejects unknown options and multiple GitHub URLs", () => {
  assert.throws(
    () => parseCliOptions(["--unknown"]),
    /Unknown option/
  );
  assert.throws(
    () => parseCliOptions([
      "https://github.com/example/one/tree/main/themes",
      "https://github.com/example/two/tree/main/themes"
    ]),
    /at most one GitHub themes URL/
  );
});
