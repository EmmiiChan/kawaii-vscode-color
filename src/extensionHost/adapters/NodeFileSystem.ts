import fs = require("fs");

export interface ExtensionFileSystem {
  exists(filePath: string): boolean;
  readFile(filePath: string): Buffer;
  readTextFile(filePath: string): string;
  writeTextFile(filePath: string, content: string): void;
}

export const nodeFileSystem: ExtensionFileSystem = {
  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  },
  readFile(filePath: string): Buffer {
    return fs.readFileSync(filePath);
  },
  readTextFile(filePath: string): string {
    return fs.readFileSync(filePath, "utf-8");
  },
  writeTextFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, "utf-8");
  }
};
