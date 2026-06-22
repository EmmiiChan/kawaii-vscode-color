export interface ExtensionGlobalState {
  get<T = unknown>(key: string): T | undefined;
}

export interface ExtensionStorageContext {
  readonly globalState?: ExtensionGlobalState;
  readonly globalStoragePath?: string;
  readonly globalStorageUri?: {
    readonly fsPath?: string;
  };
}

export interface ExtensionStorage {
  getGlobalStoragePath(): string;
  getValue(key: string): unknown;
}

export function createVscodeExtensionStorage(context: ExtensionStorageContext): ExtensionStorage {
  return new VscodeExtensionStorage(context);
}

class VscodeExtensionStorage implements ExtensionStorage {
  constructor(private readonly context: ExtensionStorageContext) {}

  getValue(key: string): unknown {
    return this.context.globalState ? this.context.globalState.get(key) : undefined;
  }

  getGlobalStoragePath(): string {
    if (this.context.globalStorageUri && this.context.globalStorageUri.fsPath) {
      return this.context.globalStorageUri.fsPath;
    }

    if (this.context.globalStoragePath) {
      return this.context.globalStoragePath;
    }

    throw new Error("VS Code extension global storage path is unavailable.");
  }
}
