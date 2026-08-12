import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { WorkspaceStructure, WorkspaceMetadata } from "../../../../shared/dist/src/types/file.js";

const DUSK_METADATA_VERSION = "1.0.0";

export class WorkspaceOrganizer {
  private duskDirectory: string;
  private workspaces: Map<string, WorkspaceStructure> = new Map();

  constructor(duskDirectory?: string) {
    this.duskDirectory = duskDirectory || path.join(os.homedir(), ".dusk");
  }

  getDuskDirectory(): string {
    return this.duskDirectory;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.duskDirectory, { recursive: true });
    await fs.mkdir(path.join(this.duskDirectory, "workspaces"), { recursive: true });
  }

  async createWorkspace(workspaceId: string, name: string, customPath?: string): Promise<WorkspaceStructure> {
    if (this.workspaces.has(workspaceId)) {
      return this.workspaces.get(workspaceId)!;
    }

    const rootPath = customPath || path.join(this.duskDirectory, "workspaces", workspaceId);
    const structure: WorkspaceStructure = {
      id: workspaceId,
      name,
      rootPath,
      directories: {
        conversations: path.join(rootPath, "conversations"),
        artifacts: path.join(rootPath, "artifacts"),
        files: path.join(rootPath, "files"),
        projects: path.join(rootPath, "projects"),
      },
      metadata: this.createMetadata(),
    };

    await fs.mkdir(rootPath, { recursive: true });
    await fs.mkdir(structure.directories.conversations, { recursive: true });
    await fs.mkdir(structure.directories.artifacts, { recursive: true });
    await fs.mkdir(structure.directories.files, { recursive: true });
    await fs.mkdir(structure.directories.projects, { recursive: true });

    await this.writeMetadata(workspaceId, structure);

    this.workspaces.set(workspaceId, structure);
    return structure;
  }

  async loadWorkspace(workspaceId: string): Promise<WorkspaceStructure | null> {
    if (this.workspaces.has(workspaceId)) {
      return this.workspaces.get(workspaceId)!;
    }

    const metadataPath = path.join(this.duskDirectory, "workspaces", workspaceId, ".dusk", "metadata.json");
    try {
      const raw = await fs.readFile(metadataPath, "utf-8");
      const structure: WorkspaceStructure = JSON.parse(raw);
      this.workspaces.set(workspaceId, structure);
      return structure;
    } catch {
      return null;
    }
  }

  getWorkspace(workspaceId: string): WorkspaceStructure | undefined {
    return this.workspaces.get(workspaceId);
  }

  async validateWorkspacePath(workspaceId: string): Promise<{ valid: boolean; path: string; error?: string }> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return { valid: false, path: "", error: `Workspace ${workspaceId} not found` };
    }

    try {
      await fs.access(workspace.rootPath);
      return { valid: true, path: workspace.rootPath };
    } catch (error) {
      return {
        valid: false,
        path: workspace.rootPath,
        error: `Workspace directory inaccessible: ${(error as Error).message}`,
      };
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return;
    }

    try {
      await fs.rm(workspace.rootPath, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }

    this.workspaces.delete(workspaceId);
  }

  async listWorkspaces(workspaceId?: string): Promise<WorkspaceStructure[]> {
    const workspacesDir = path.join(this.duskDirectory, "workspaces");
    const workspaces: WorkspaceStructure[] = [];

    try {
      const entries = await fs.readdir(workspacesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const workspace = await this.loadWorkspace(entry.name);
        if (workspace) {
          workspaces.push(workspace);
        }
      }
    } catch {
      // no workspaces directory yet
    }

    return workspaces;
  }

  private createMetadata(): WorkspaceMetadata {
    return {
      version: DUSK_METADATA_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {},
    };
  }

  private async writeMetadata(workspaceId: string, structure: WorkspaceStructure): Promise<void> {
    const metadataDir = path.join(structure.rootPath, ".dusk");
    await fs.mkdir(metadataDir, { recursive: true });
    const metadataPath = path.join(metadataDir, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(structure, null, 2), "utf-8");
  }

  async updateWorkspace(_workspaceId: string, _updates: Record<string, unknown>): Promise<unknown> {
    throw new Error("updateWorkspace not implemented");
  }

  async listConversations(_workspaceId: string): Promise<unknown[]> {
    return [];
  }

  async createConversation(_workspaceId: string, _title?: string): Promise<unknown> {
    throw new Error("createConversation not implemented");
  }

  async getConversation(_conversationId: string): Promise<unknown> {
    throw new Error("getConversation not implemented");
  }

  async deleteConversation(_conversationId: string): Promise<void> {
    throw new Error("deleteConversation not implemented");
  }

  async createMessage(conversationId: string, content: string, role: string): Promise<unknown> {
    throw new Error("createMessage not implemented");
  }

  async listMessages(_conversationId: string, _limit?: number, _offset?: number): Promise<unknown[]> {
    return [];
  }

  async streamMessage(conversationId: string, content: string, role: string, checkpoint?: Record<string, unknown>): Promise<unknown> {
    throw new Error("streamMessage not implemented");
  }
}
