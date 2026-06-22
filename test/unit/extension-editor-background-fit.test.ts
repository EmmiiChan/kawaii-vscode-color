import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const {
  getEditorBackgroundFitArea,
  normalizeEditorBackgroundFit
} = requireOut<typeof import("../../src/extensionHost/services/NeonEffectService")>(
  "extensionHost",
  "services",
  "NeonEffectService"
);

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

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("extension maps every editor background fit option to its CSS area", () => {
  for (const [fit, expectedArea] of Object.entries(EXPECTED_EDITOR_BACKGROUND_FIT_AREAS)) {
    assert.equal(normalizeEditorBackgroundFit(fit), fit);
    assert.deepEqual(toPlainObject(getEditorBackgroundFitArea(fit)), expectedArea);
  }

  assert.equal(normalizeEditorBackgroundFit(" Top-Right "), "top-right");
  assert.equal(normalizeEditorBackgroundFit("botton-left"), "bottom-left");
  assert.deepEqual(toPlainObject(getEditorBackgroundFitArea("unknown")), EXPECTED_EDITOR_BACKGROUND_FIT_AREAS.full);
});

function toPlainObject(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}
