import assert = require("node:assert/strict");
import fs = require("node:fs");
import os = require("node:os");
import path = require("node:path");
import test = require("node:test");

const {
  nodeFileSystem
} = requireOut<typeof import("../../src/extensionHost/adapters/NodeFileSystem")>(
  "extensionHost",
  "adapters",
  "NodeFileSystem"
);
const {
  createVscodeExtensionStorage
} = requireOut<typeof import("../../src/extensionHost/adapters/VscodeExtensionStorage")>(
  "extensionHost",
  "adapters",
  "VscodeExtensionStorage"
);
const {
  WORKBENCH_RELOAD_COMMAND,
  createVscodeNotificationService
} = requireOut<typeof import("../../src/extensionHost/adapters/VscodeNotificationService")>(
  "extensionHost",
  "adapters",
  "VscodeNotificationService"
);

interface NotificationCall {
  readonly method: "error" | "info" | "command";
  readonly message?: string;
  readonly command?: string;
  readonly actionTitle?: string | undefined;
}

function requireOut<TModule>(...segments: readonly string[]): TModule {
  return require(path.join(process.cwd(), "out", "src", ...segments)) as TModule;
}

test("nodeFileSystem delegates text and binary file operations", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kawaii-adapter-"));
  t.after(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  });

  const filePath = path.join(tempRoot, "sample.txt");

  assert.equal(nodeFileSystem.exists(filePath), false);

  nodeFileSystem.writeTextFile(filePath, "adapter content");

  assert.equal(nodeFileSystem.exists(filePath), true);
  assert.equal(nodeFileSystem.readTextFile(filePath), "adapter content");
  assert.equal(nodeFileSystem.readFile(filePath).toString("utf8"), "adapter content");

  const binaryPath = path.join(tempRoot, "binary.bin");
  nodeFileSystem.writeFile(binaryPath, Buffer.from([1, 2, 3]));
  assert.deepEqual(nodeFileSystem.readFile(binaryPath), Buffer.from([1, 2, 3]));
  nodeFileSystem.deleteFile(binaryPath);
  assert.equal(nodeFileSystem.exists(binaryPath), false);
});

test("VscodeExtensionStorage reads global state and resolves storage path fallbacks", () => {
  const readKeys: string[] = [];
  const storage = createVscodeExtensionStorage({
    globalState: {
      get<T = unknown>(key: string): T | undefined {
        readKeys.push(key);
        return (key === "known" ? "stored-value" : undefined) as T | undefined;
      }
    },
    globalStoragePath: path.normalize("C:/fallback-storage"),
    globalStorageUri: {
      fsPath: path.normalize("C:/uri-storage")
    }
  });

  assert.equal(storage.getValue("known"), "stored-value");
  assert.deepEqual(readKeys, ["known"]);
  assert.equal(storage.getGlobalStoragePath(), path.normalize("C:/uri-storage"));

  assert.equal(createVscodeExtensionStorage({
    globalStoragePath: path.normalize("C:/legacy-storage")
  }).getGlobalStoragePath(), path.normalize("C:/legacy-storage"));

  assert.equal(createVscodeExtensionStorage({}).getValue("missing"), undefined);
  assert.throws(
    () => createVscodeExtensionStorage({}).getGlobalStoragePath(),
    /VS Code extension global storage path is unavailable\./
  );
});

test("VscodeNotificationService forwards messages and reload commands after notification action selection", async () => {
  const calls: NotificationCall[] = [];
  let resolveReloadNotification: (selection: { readonly title: string } | undefined) => void = () => undefined;
  const reloadNotification = new Promise<{ readonly title: string } | undefined>((resolve) => {
    resolveReloadNotification = resolve;
  });
  const service = createVscodeNotificationService({
    commands: {
      async executeCommand(command: string): Promise<void> {
        calls.push({ method: "command", command });
      }
    },
    window: {
      async showErrorMessage(message: string): Promise<void> {
        calls.push({ method: "error", message });
      },
      async showInformationMessage(message: string, item?: { readonly title: string }): Promise<unknown> {
        calls.push({ method: "info", message, actionTitle: item ? item.title : undefined });
        if (item) {
          return reloadNotification;
        }
      }
    }
  });

  await service.showErrorMessage("broken");
  await service.showInformationMessage("saved");
  await service.requestWorkbenchReload("reload now", "Reload");

  assert.deepEqual(calls, [
    { method: "error", message: "broken" },
    { method: "info", message: "saved", actionTitle: undefined },
    { method: "info", message: "reload now", actionTitle: "Reload" }
  ]);

  resolveReloadNotification({ title: "Reload" });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(calls, [
    { method: "error", message: "broken" },
    { method: "info", message: "saved", actionTitle: undefined },
    { method: "info", message: "reload now", actionTitle: "Reload" },
    { method: "command", command: WORKBENCH_RELOAD_COMMAND }
  ]);
});

test("VscodeNotificationService does not block on passive information notifications", async () => {
  let resolveInformationMessage: () => void = () => undefined;
  const pendingInformationMessage = new Promise<void>((resolve) => {
    resolveInformationMessage = resolve;
  });
  const service = createVscodeNotificationService({
    commands: {
      async executeCommand(): Promise<void> {}
    },
    window: {
      async showErrorMessage(): Promise<void> {},
      async showInformationMessage(): Promise<unknown> {
        return pendingInformationMessage;
      }
    }
  });

  const result = await Promise.race([
    service.showInformationMessage("not running").then(() => "resolved"),
    new Promise<string>((resolve) => setTimeout(() => resolve("blocked"), 0))
  ]);

  resolveInformationMessage();

  assert.equal(result, "resolved");
});
