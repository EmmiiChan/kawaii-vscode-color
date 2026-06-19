const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const EXTENSION_PATH = path.resolve(__dirname, "..", "..", "src", "extension.js");
const EXPECTED_EDITOR_BACKGROUND_FIT_AREAS = {
  full: { top: "0", right: "auto", bottom: "auto", left: "0", width: "100%", height: "100%" },
  top: { top: "0", right: "auto", bottom: "auto", left: "0", width: "100%", height: "50%" },
  bottom: { top: "auto", right: "auto", bottom: "0", left: "0", width: "100%", height: "50%" },
  left: { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "100%" },
  right: { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "100%" },
  "top-left": { top: "0", right: "auto", bottom: "auto", left: "0", width: "50%", height: "50%" },
  "top-right": { top: "0", right: "0", bottom: "auto", left: "auto", width: "50%", height: "50%" },
  "bottom-left": { top: "auto", right: "auto", bottom: "0", left: "0", width: "50%", height: "50%" },
  "bottom-right": { top: "auto", right: "0", bottom: "0", left: "auto", width: "50%", height: "50%" }
};

test("extension maps every editor background fit option to its CSS area", () => {
  const { getEditorBackgroundFitArea, normalizeEditorBackgroundFit } = loadExtensionInternals();

  for (const [fit, expectedArea] of Object.entries(EXPECTED_EDITOR_BACKGROUND_FIT_AREAS)) {
    assert.equal(normalizeEditorBackgroundFit(fit), fit);
    assert.deepEqual(toPlainObject(getEditorBackgroundFitArea(fit)), expectedArea);
  }

  assert.equal(normalizeEditorBackgroundFit(" Top-Right "), "top-right");
  assert.equal(normalizeEditorBackgroundFit("botton-left"), "bottom-left");
  assert.deepEqual(toPlainObject(getEditorBackgroundFitArea("unknown")), EXPECTED_EDITOR_BACKGROUND_FIT_AREAS.full);
});

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadExtensionInternals() {
  const source = fs.readFileSync(EXTENSION_PATH, "utf8");
  const module = { exports: {} };
  const wrappedSource = `
    (function(exports, require, module, __filename, __dirname) {
      ${source}
      module.exports.__test = {
        getEditorBackgroundFitArea,
        normalizeEditorBackgroundFit
      };
    })
  `;
  const compiled = vm.runInNewContext(wrappedSource, {
    Buffer,
    console,
    process
  }, { filename: EXTENSION_PATH });

  compiled(module.exports, createSandboxRequire(), module, EXTENSION_PATH, path.dirname(EXTENSION_PATH));

  return module.exports.__test;
}

function createSandboxRequire() {
  return function sandboxRequire(request) {
    if (request === "vscode") {
      return createVscodeStub();
    }

    if (request === "./settings") {
      return {
        configureSettingsSync() {},
        openSettings() {}
      };
    }

    if (request === "./emptyEditorLogoStyles") {
      return {
        createEmptyEditorLogoStyles() {
          return "";
        }
      };
    }

    if (request === "./workbenchPatch") {
      return {
        applyWorkbenchPatchScriptTag(html) {
          return html;
        },
        isWorkbenchPatchEnabled() {
          return false;
        },
        removeWorkbenchPatchScriptTag(html) {
          return html;
        },
        resolveWorkbenchPatchPaths() {
          return null;
        }
      };
    }

    return require(request);
  };
}

function createVscodeStub() {
  return {
    commands: {
      executeCommand() {
        return Promise.resolve();
      },
      registerCommand() {
        return { dispose() {} };
      }
    },
    env: {
      appRoot: path.resolve("C:/fake/resources/app")
    },
    window: {
      showErrorMessage() {
        return Promise.resolve();
      },
      showInformationMessage() {
        return Promise.resolve();
      }
    },
    workspace: {
      getConfiguration() {
        return {
          get() {
            return undefined;
          }
        };
      },
      onDidChangeConfiguration() {
        return { dispose() {} };
      }
    }
  };
}
