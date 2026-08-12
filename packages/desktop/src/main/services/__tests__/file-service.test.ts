import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { FileService } from "../file-service";
import type { WorkspaceStructure } from "../../../../../shared/dist/src/types/file.js";

const createMockWorkspace = (id: string, rootPath: string): WorkspaceStructure => ({
  id,
  name: `Workspace ${id}`,
  rootPath,
  directories: {
    conversations: `${rootPath}/conversations`,
    artifacts: `${rootPath}/artifacts`,
    files: `${rootPath}/files`,
    projects: `${rootPath}/projects`,
  },
  metadata: {
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {},
  },
});

const createMockOrganizer = (workspaces: Map<string, WorkspaceStructure>) => ({
  getWorkspace: vi.fn((id: string) => workspaces.get(id)),
});

describe("FileService", () => {
  let service: FileService;
  let mockOrganizer: ReturnType<typeof createMockOrganizer>;
  let workspaces: Map<string, WorkspaceStructure>;

  beforeEach(() => {
    workspaces = new Map();
    mockOrganizer = createMockOrganizer(workspaces);
    service = new FileService(mockOrganizer as any);
  });

  describe("list", () => {
    it("returns files for a workspace", async () => {
      const rootPath = "/tmp/workspace-1";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));

      await fs.mkdir(rootPath, { recursive: true });
      await fs.writeFile(path.join(rootPath, "file1.txt"), "hello");
      await fs.writeFile(path.join(rootPath, "file2.txt"), "world");

      const result = await service.list({ workspaceId: "ws-1", path: "" });
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.name).sort()).toEqual(["file1.txt", "file2.txt"]);
    });

    it("returns empty array when workspace not found", async () => {
      await expect(service.list({ workspaceId: "non-existent", path: "/" })).rejects.toThrow("Workspace non-existent not found");
    });

    it("throws error for path traversal", async () => {
      workspaces.set("ws-1", createMockWorkspace("ws-1", "/tmp/workspace-1"));
      await expect(service.list({ workspaceId: "ws-1", path: "../../../etc" })).rejects.toThrow("Path traversal not allowed");
    });
  });

  describe("read", () => {
    it("reads file content", async () => {
      const rootPath = "/tmp/workspace-read-1";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });
      await fs.writeFile(path.join(rootPath, "test.txt"), "hello");

      const result = await service.read({ workspaceId: "ws-1", path: "test.txt" });
      expect(result).toBe("hello");
    });

    it("throws error when workspace not found", async () => {
      await expect(service.read({ workspaceId: "non-existent", path: "test.txt" })).rejects.toThrow("Workspace non-existent not found");
    });

    it("throws error when file not found", async () => {
      const rootPath = "/tmp/workspace-read-2";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });

      await expect(service.read({ workspaceId: "ws-1", path: "missing.txt" })).rejects.toThrow("File not found");
    });
  });

  describe("write", () => {
    it("writes file content", async () => {
      const rootPath = "/tmp/workspace-write-1";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });

      await expect(service.write({ workspaceId: "ws-1", path: "test.txt", content: "hello" })).resolves.toBeUndefined();
      const content = await fs.readFile(path.join(rootPath, "test.txt"), "utf-8");
      expect(content).toBe("hello");
    });

    it("throws error when workspace not found", async () => {
      await expect(service.write({ workspaceId: "non-existent", path: "test.txt", content: "hello" })).rejects.toThrow("Workspace non-existent not found");
    });

    it("throws error for path traversal", async () => {
      const rootPath = "/tmp/workspace-write-2";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });

      await expect(service.write({ workspaceId: "ws-1", path: "../../../etc/passwd", content: "malicious" })).rejects.toThrow("Path traversal not allowed");
    });
  });

  describe("delete", () => {
    it("deletes a file", async () => {
      const rootPath = "/tmp/workspace-delete-1";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });
      await fs.writeFile(path.join(rootPath, "test.txt"), "hello");

      await expect(service.delete({ workspaceId: "ws-1", path: "test.txt" })).resolves.toBeUndefined();
      await expect(fs.readFile(path.join(rootPath, "test.txt"))).rejects.toThrow();
    });

    it("throws error when workspace not found", async () => {
      await expect(service.delete({ workspaceId: "non-existent", path: "test.txt" })).rejects.toThrow("Workspace non-existent not found");
    });
  });

  describe("createDir", () => {
    it("creates a directory", async () => {
      const rootPath = "/tmp/workspace-dir-1";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });

      await expect(service.createDir({ workspaceId: "ws-1", path: "newdir" })).resolves.toBeUndefined();
      await expect(fs.stat(path.join(rootPath, "newdir"))).resolves.toBeDefined();
    });
  });

  describe("getFileInfo", () => {
    it("returns file info", async () => {
      const rootPath = "/tmp/workspace-info-1";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });
      await fs.writeFile(path.join(rootPath, "test.txt"), "hello");

      const result = await service.getFileInfo({ workspaceId: "ws-1", path: "test.txt" });
      expect(result).toBeDefined();
      expect(result.name).toBe("test.txt");
    });

    it("throws error when file not found", async () => {
      const rootPath = "/tmp/workspace-info-2";
      workspaces.set("ws-1", createMockWorkspace("ws-1", rootPath));
      await fs.mkdir(rootPath, { recursive: true });

      await expect(service.getFileInfo({ workspaceId: "ws-1", path: "missing.txt" })).rejects.toThrow("File not found");
    });
  });
});
