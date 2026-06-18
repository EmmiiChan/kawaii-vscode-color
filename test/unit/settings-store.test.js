const assert = require("node:assert/strict");
const test = require("node:test");

const { createSettingsStore } = require("../../src/settingsStore");

function createWorkspaceMock(options = {}) {
  const updates = [];
  const configuration = {
    get(settingName) {
      return options.values ? options.values[settingName] : undefined;
    },
    inspect(settingName) {
      if (options.inspect === false) {
        return undefined;
      }

      return options.inspections ? options.inspections[settingName] : undefined;
    },
    update(settingName, value, target) {
      updates.push({ settingName, value, target });
      return Promise.resolve();
    }
  };

  return {
    workspace: {
      workspaceFile: options.workspaceFile,
      workspaceFolders: options.workspaceFolders,
      getConfiguration() {
        return configuration;
      }
    },
    updates
  };
}

test("getSettingsObject reads and clones configuration objects", () => {
  const source = { "[Kawaii VS Code Color]": { "editor.background": "#31202b" } };
  const { workspace } = createWorkspaceMock({
    values: {
      "workbench.colorCustomizations": source
    }
  });
  const store = createSettingsStore(workspace);

  const result = store.getSettingsObject("workbench.colorCustomizations");
  result["[Kawaii VS Code Color]"]["editor.background"] = "#000000";

  assert.deepEqual(source, { "[Kawaii VS Code Color]": { "editor.background": "#31202b" } });
});

test("getSettingsObject returns empty object for invalid values", () => {
  const { workspace } = createWorkspaceMock({
    values: {
      array: [],
      missing: undefined,
      text: "bad"
    }
  });
  const store = createSettingsStore(workspace);

  assert.deepEqual(store.getSettingsObject("array"), {});
  assert.deepEqual(store.getSettingsObject("missing"), {});
  assert.deepEqual(store.getSettingsObject("text"), {});
});

test("getTargetSettingsObject reads global and workspace inspection values", () => {
  const { workspace } = createWorkspaceMock({
    inspections: {
      "editor.tokenColorCustomizations": {
        globalValue: { global: true },
        workspaceValue: { workspace: true }
      }
    }
  });
  const store = createSettingsStore(workspace);

  assert.deepEqual(store.getTargetSettingsObject("editor.tokenColorCustomizations", true), { global: true });
  assert.deepEqual(store.getTargetSettingsObject("editor.tokenColorCustomizations", false), { workspace: true });
});

test("getTargetSettingsObject safely returns empty object when inspection is missing", () => {
  const { workspace } = createWorkspaceMock({ inspect: false });
  const store = createSettingsStore(workspace);

  assert.deepEqual(store.getTargetSettingsObject("workbench.colorCustomizations", true), {});
  assert.deepEqual(store.getTargetSettingsObject("workbench.colorCustomizations", false), {});
});

test("updateSetting writes undefined for empty objects", async () => {
  const { workspace, updates } = createWorkspaceMock();
  const store = createSettingsStore(workspace);

  await store.updateSetting("workbench.colorCustomizations", {}, true);

  assert.deepEqual(updates, [
    { settingName: "workbench.colorCustomizations", value: undefined, target: true }
  ]);
});

test("updateSetting writes global and workspace targets", async () => {
  const { workspace, updates } = createWorkspaceMock();
  const store = createSettingsStore(workspace);

  await store.updateGlobalSetting("workbench.colorCustomizations", { global: true });
  await store.updateSetting("workbench.colorCustomizations", { workspace: true }, false);

  assert.deepEqual(updates, [
    { settingName: "workbench.colorCustomizations", value: { global: true }, target: true },
    { settingName: "workbench.colorCustomizations", value: { workspace: true }, target: false }
  ]);
});

test("updateSetting preserves scalar values instead of treating them as empty settings", async () => {
  const { workspace, updates } = createWorkspaceMock();
  const store = createSettingsStore(workspace);

  await store.updateGlobalSetting("kawaii_synthwave.disableGlow", false);
  await store.updateGlobalSetting("kawaii_synthwave.brightness", 0);

  assert.deepEqual(updates, [
    { settingName: "kawaii_synthwave.disableGlow", value: false, target: true },
    { settingName: "kawaii_synthwave.brightness", value: 0, target: true }
  ]);
});

test("canUpdateWorkspaceSettings detects workspace targets", () => {
  assert.equal(createSettingsStore(createWorkspaceMock({ workspaceFile: { path: "project.code-workspace" } }).workspace).canUpdateWorkspaceSettings(), true);
  assert.equal(createSettingsStore(createWorkspaceMock({ workspaceFolders: [{ uri: "file:///project" }] }).workspace).canUpdateWorkspaceSettings(), true);
  assert.equal(createSettingsStore(createWorkspaceMock({ workspaceFolders: [] }).workspace).canUpdateWorkspaceSettings(), false);
  assert.equal(createSettingsStore(createWorkspaceMock().workspace).canUpdateWorkspaceSettings(), false);
});
