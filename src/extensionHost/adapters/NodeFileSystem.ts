import fs = require("fs");

export interface ExtensionFileSystem {
  deleteFile(filePath: string): void;
  exists(filePath: string): boolean;
  readFile(filePath: string): Buffer;
  readTextFile(filePath: string): string;
  writeFile(filePath: string, content: Buffer): void;
  writeTextFile(filePath: string, content: string): void;
}

export const nodeFileSystem: ExtensionFileSystem = {
  deleteFile(filePath: string): void {
    fs.unlinkSync(filePath);
  },
  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  },
  readFile(filePath: string): Buffer {
    return fs.readFileSync(filePath);
  },
  readTextFile(filePath: string): string {
    return fs.readFileSync(filePath, "utf-8");
  },
  writeFile(filePath: string, content: Buffer): void {
    fs.writeFileSync(filePath, content);
  },
  writeTextFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, "utf-8");
  }
};
