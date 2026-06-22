import assert = require("node:assert/strict");
import path = require("node:path");
import test = require("node:test");

const { createSettingsStore } = requireOut<typeof import("../../src/settingsStore")>("settingsStore");

interface WorkspaceMockOptions {
  readonly values?: Record<string, unknown>;
  readonly inspections?: Record<string, ConfigurationInspectionMock>;
  readonly inspect?: false;
  readonly workspaceFile?: unknown;
  readonly workspaceFolders?: unknown[];
}

interface WorkspaceUpdate {
  readonly settingName: string;
  readonly value: unknown;
  readonly target: boolean;
}

interface ConfigurationInspectionMock {
  readonly globalValue?: unknown;
  readonly workspaceValue?: unknown;
}

interface WorkspaceConfigurationMock {
  get(settingName: string): unknown;
  inspect(settingName: string): ConfigurationInspectionMock | undefined;
  update(settingName: string, value: unknown, target: boolean): Promise<void>;
}

interface WorkspaceMock {
  workspaceFile?: unknown;
  workspaceFolders?: readonly unknown[];
  getConfiguration(): WorkspaceConfigurationMock;
}

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

function createWorkspaceMock(options: WorkspaceMockOptions = {}) {
  const updates: WorkspaceUpdate[] = [];
  const configuration: WorkspaceConfigurationMock = {
    get(settingName: string): unknown {
      return options.values ? options.values[settingName] : undefined;
    },
    inspect(settingName: string): ConfigurationInspectionMock | undefined {
      if (options.inspect === false) {
        return undefined;
      }

      return options.inspections ? options.inspections[settingName] : undefined;
    },
    update(settingName: string, value: unknown, target: boolean): Promise<void> {
      updates.push({ settingName, value, target });
      return Promise.resolve();
    }
  };

  const workspace: WorkspaceMock = {
    getConfiguration() {
      return configuration;
    }
  };

  if ("workspaceFile" in options) {
    workspace.workspaceFile = options.workspaceFile;
  }

  if (options.workspaceFolders !== undefined) {
    workspace.workspaceFolders = options.workspaceFolders;
  }

  return {
    workspace,
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

  const result = store.getSettingsObject("workbench.colorCustomizations") as Record<string, Record<string, unknown>>;
  result["[Kawaii VS Code Color]"]!["editor.background"] = "#000000";

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
