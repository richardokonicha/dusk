import fs from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import archiver from "archiver";
import { FileInfo, FileEvent } from "../../../../shared/dist/src/types/file.js";
import { WorkspaceOrganizer } from "./workspace-organizer";
import type { IpcMainInvokeEvent } from "electron";

const WATCH_DEBOUNCE_MS = 100;

export class FileService {
  private organizer: WorkspaceOrganizer;
  private watchers: Map<string, chokidar.FSWatcher> = new Map();

  constructor(organizer: WorkspaceOrganizer) {
    this.organizer = organizer;
  }

  async list(input: { workspaceId: string; path?: string }): Promise<FileInfo[]> {
    const { workspaceId, path: filePath = "/" } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const resolvedPath = path.resolve(workspace.rootPath, filePath);
    if (!resolvedPath.startsWith(workspace.rootPath)) {
      throw new Error("Path traversal not allowed");
    }

    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        const entryPath = path.join(resolvedPath, entry.name);
        const relative = path.relative(workspace.rootPath, entryPath).replace(/\\/g, "/");

        try {
          const stats = await fs.stat(entryPath);
          files.push({
            name: entry.name,
            path: entryPath,
            relativePath: relative,
            size: stats.size,
            mtime: stats.mtimeMs,
            isDirectory: entry.isDirectory(),
            extension: entry.name.includes(".") ? entry.name.split(".").pop() ?? "" : "",
            mimeType: entry.isDirectory() ? "inode/directory" : this.guessMimeType(entry.name),
          });
        } catch {
          continue;
        }
      }

      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return files;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async read(input: { workspaceId: string; path: string }): Promise<string> {
    const { workspaceId, path: filePath } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const resolvedPath = path.resolve(workspace.rootPath, filePath);
    if (!resolvedPath.startsWith(workspace.rootPath)) {
      throw new Error("Path traversal not allowed");
    }

    try {
      return await fs.readFile(resolvedPath, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  async write(input: { workspaceId: string; path: string; content: string; encoding?: string }): Promise<void> {
    const { workspaceId, path: filePath, content, encoding = "utf8" } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const resolvedPath = path.resolve(workspace.rootPath, filePath);
    if (!resolvedPath.startsWith(workspace.rootPath)) {
      throw new Error("Path traversal not allowed");
    }

    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

    const finalContent = encoding === "base64" ? Buffer.from(content, "base64") : content;
    await fs.writeFile(resolvedPath, finalContent, encoding === "base64" ? undefined : "utf-8");
  }

  async delete(input: { workspaceId: string; path: string }): Promise<void> {
    const { workspaceId, path: filePath } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const resolvedPath = path.resolve(workspace.rootPath, filePath);
    if (!resolvedPath.startsWith(workspace.rootPath)) {
      throw new Error("Path traversal not allowed");
    }

    try {
      await fs.rm(resolvedPath, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
  }

  async createDir(input: { workspaceId: string; path: string }): Promise<void> {
    const { workspaceId, path: dirPath } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const resolvedPath = path.resolve(workspace.rootPath, dirPath);
    if (!resolvedPath.startsWith(workspace.rootPath)) {
      throw new Error("Path traversal not allowed");
    }

    await fs.mkdir(resolvedPath, { recursive: true });
  }

  async getFileInfo(input: { workspaceId: string; path: string }): Promise<FileInfo> {
    const { workspaceId, path: filePath } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const resolvedPath = path.resolve(workspace.rootPath, filePath);
    if (!resolvedPath.startsWith(workspace.rootPath)) {
      throw new Error("Path traversal not allowed");
    }

    try {
      const stats = await fs.stat(resolvedPath);
      const relative = path.relative(workspace.rootPath, resolvedPath).replace(/\\/g, "/");
      const extension = path.basename(resolvedPath).includes(".")
        ? path.basename(resolvedPath).split(".").pop() ?? ""
        : "";

      return {
        name: path.basename(resolvedPath),
        path: resolvedPath,
        relativePath: relative,
        size: stats.size,
        mtime: stats.mtimeMs,
        isDirectory: stats.isDirectory(),
        extension,
        mimeType: stats.isDirectory() ? "inode/directory" : this.guessMimeType(resolvedPath),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  async *watch(event: IpcMainInvokeEvent, input: { workspaceId: string; path?: string }): AsyncGenerator<FileEvent> {
    const { workspaceId } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const watcher = chokidar.watch(workspace.rootPath, {
      ignored: /(^|[\/\\])\../,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: WATCH_DEBOUNCE_MS,
        pollInterval: WATCH_DEBOUNCE_MS,
      },
    });

    this.watchers.set(workspaceId, watcher);

    watcher.on("all", async (eventType, eventPath) => {
      try {
        const relativePath = path.relative(workspace.rootPath, eventPath).replace(/\\/g, "/");
        let size = 0;
        let mtime = Date.now();

        try {
          const stats = await fs.stat(eventPath);
          size = stats.size;
          mtime = stats.mtimeMs;
        } catch {
          size = 0;
        }

        const fileEvent: FileEvent = {
          type: eventType as FileEvent["type"],
          path: eventPath,
          relativePath,
          mtime,
          size,
        };

        event.sender.send("file:watch:event", {
          channel: "file:watch:event",
          data: fileEvent,
          timestamp: Date.now(),
        });
      } catch {
        // ignore watcher errors
      }
    });

    watcher.on("error", () => {
      // watcher error - will be handled by all events not firing
    });

    for await (const _ of event.sender as any) {
      // keep alive while connected
    }
  }

  async exportWorkspace(input: { workspaceId: string }): Promise<Buffer> {
    const { workspaceId } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const files = await this.collectFiles(workspace.rootPath, "");

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      archive.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);

      for (const file of files) {
        archive.append(file.content, { name: file.path });
      }

      archive.finalize();
    });
  }

  async importWorkspace(input: { workspaceId: string; data: Uint8Array }): Promise<{ imported: number; files: string[] }> {
    const { workspaceId, data } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const AdmZip = require("adm-zip");
    const zip = new AdmZip(Buffer.from(data));
    const entries = zip.getEntries();

    const imported: string[] = [];

    for (const entry of entries) {
      if (entry.entryName.endsWith("/")) {
        continue;
      }

      const targetPath = path.resolve(workspace.rootPath, entry.entryName);
      if (!targetPath.startsWith(workspace.rootPath)) {
        continue;
      }

      const dir = path.dirname(targetPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(targetPath, entry.getData());
      imported.push(entry.entryName);
    }

    return { imported: imported.length, files: imported };
  }

  private async collectFiles(
    rootPath: string,
    relativePath: string
  ): Promise<Array<{ path: string; content: Buffer }>> {
    const fullPath = path.join(rootPath, relativePath);
    const files: Array<{ path: string; content: Buffer }> = [];

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryRelativePath = relativePath
          ? path.join(relativePath, entry.name)
          : entry.name;

        if (entry.isDirectory()) {
          const subFiles = await this.collectFiles(rootPath, entryRelativePath);
          files.push(...subFiles);
        } else {
          const content = await fs.readFile(path.join(fullPath, entry.name));
          files.push({
            path: entryRelativePath.replace(/\\/g, "/"),
            content,
          });
        }
      }
    } catch {
      // skip unreadable directories
    }

    return files;
  }

  private guessMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".json": "application/json",
      ".js": "text/javascript",
      "": "text/typescript",
      ".tsx": "text/typescript-jsx",
      ".jsx": "text/jsx",
      ".html": "text/html",
      ".css": "text/css",
      ".py": "text/x-python",
      ".yaml": "text/yaml",
      ".yml": "text/yaml",
      ".xml": "application/xml",
      ".csv": "text/csv",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".zip": "application/zip",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}
