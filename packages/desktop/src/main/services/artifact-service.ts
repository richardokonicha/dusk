import fs from "node:fs/promises";
import path from "node:path";
import { ArtifactMetadata, ArtifactType } from "../../../../shared/dist/src/types/file.js";
import { WorkspaceOrganizer } from "./workspace-organizer";

const ARTIFACTS_DIR = "artifacts";

export class ArtifactService {
  private organizer: WorkspaceOrganizer;

  constructor(organizer: WorkspaceOrganizer) {
    this.organizer = organizer;
  }

  async list(input: { workspaceId: string; agentId?: string }): Promise<ArtifactMetadata[]> {
    const { workspaceId, agentId } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    try {
      const entries = await fs.readdir(workspace.directories.artifacts, { withFileTypes: true });
      const artifacts: ArtifactMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const metadataPath = path.join(workspace.directories.artifacts, entry.name, "metadata.json");
        try {
          const raw = await fs.readFile(metadataPath, "utf-8");
          const metadata: ArtifactMetadata = JSON.parse(raw);
          if (!agentId || metadata.agentId === agentId) {
            artifacts.push(metadata);
          }
        } catch {
          // skip invalid metadata
        }
      }

      artifacts.sort((a, b) => b.createdAt - a.createdAt);
      return artifacts;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async get(input: { artifactId: string }): Promise<{ metadata: ArtifactMetadata; content: string } | null> {
    const { artifactId } = input;
    const workspace = await this.findWorkspaceForArtifact(artifactId);
    if (!workspace) {
      return null;
    }

    const artifactDir = path.join(workspace.directories.artifacts, artifactId);
    const metadataPath = path.join(artifactDir, "metadata.json");
    const contentPath = path.join(artifactDir, "content");

    try {
      const [metadataRaw, content] = await Promise.all([
        fs.readFile(metadataPath, "utf-8"),
        fs.readFile(contentPath, "utf-8"),
      ]);

      return {
        metadata: JSON.parse(metadataRaw) as ArtifactMetadata,
        content,
      };
    } catch {
      return null;
    }
  }

  async save(input: {
    workspaceId: string;
    agentId: string;
    name: string;
    description?: string;
    content: string;
    conversationId?: string;
  }): Promise<ArtifactMetadata> {
    const { workspaceId, agentId, name, description, content, conversationId } = input;
    const workspace = this.organizer.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const extension = name.includes(".") ? name.split(".").pop() || "" : "";
    const type = this.detectArtifactType(name, extension);

    const artifactDir = path.join(workspace.directories.artifacts, id);
    await fs.mkdir(artifactDir, { recursive: true });

    const filePath = path.join(artifactDir, "content");
    const contentBuffer = Buffer.from(content, "utf-8");
    await fs.writeFile(filePath, contentBuffer);

    const metadata: ArtifactMetadata = {
      id,
      workspaceId,
      agentId,
      conversationId: conversationId || null,
      name,
      description: description || null,
      type,
      size: contentBuffer.length,
      mimeType: this.guessMimeType(extension),
      extension,
      filePath,
      createdAt: now,
      updatedAt: now,
    };

    const metadataPath = path.join(artifactDir, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    return metadata;
  }

  async delete(input: { artifactId: string }): Promise<void> {
    const { artifactId } = input;
    const workspace = await this.findWorkspaceForArtifact(artifactId);
    if (!workspace) {
      return;
    }

    const artifactDir = path.join(workspace.directories.artifacts, artifactId);
    try {
      await fs.rm(artifactDir, { recursive: true, force: true });
    } catch {
      // ignore delete errors
    }
  }

  async link(input: { artifactId: string; conversationId: string }): Promise<void> {
    const { artifactId, conversationId } = input;
    const workspace = await this.findWorkspaceForArtifact(artifactId);
    if (!workspace) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    const artifactDir = path.join(workspace.directories.artifacts, artifactId);
    const metadataPath = path.join(artifactDir, "metadata.json");

    try {
      const raw = await fs.readFile(metadataPath, "utf-8");
      const metadata: ArtifactMetadata = JSON.parse(raw);
      metadata.conversationId = conversationId;
      metadata.updatedAt = Date.now();
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
    } catch {
      throw new Error(`Failed to link artifact ${artifactId}`);
    }
  }

  private async findWorkspaceForArtifact(artifactId: string) {
    const duskDir = this.organizer.getDuskDirectory();
    const workspacesDir = path.join(duskDir, "workspaces");

    try {
      const entries = await fs.readdir(workspacesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const workspace = this.organizer.getWorkspace(entry.name);
        if (!workspace) {
          continue;
        }

        const artifactDir = path.join(workspace.directories.artifacts, artifactId);
        try {
          await fs.access(artifactDir);
          return workspace;
        } catch {
          continue;
        }
      }
    } catch {
      // no workspaces
    }

    return null;
  }

  private detectArtifactType(fileName: string, extension: string): ArtifactType {
    const codeExts = ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "go", "rs", "rb", "php"];
    const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"];
    const dataExts = ["json", "csv", "xml", "yaml", "yml", "toml", "sql", "parquet"];
    const audioExts = ["mp3", "wav", "ogg", "flac", "m4a", "aac"];
    const videoExts = ["mp4", "webm", "avi", "mov", "mkv"];
    const archiveExts = ["zip", "tar", "gz", "bz2", "7z", "rar"];

    if (codeExts.includes(extension)) return "code";
    if (imageExts.includes(extension)) return "image";
    if (dataExts.includes(extension)) return "data";
    if (audioExts.includes(extension)) return "audio";
    if (videoExts.includes(extension)) return "video";
    if (archiveExts.includes(extension)) return "archive";

    if (fileName.endsWith(".md") || extension === "md") return "markdown";

    if (["txt", "text"].includes(extension)) return "text";

    return "unknown";
  }

  private guessMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      "js": "text/javascript",
      "ts": "text/typescript",
      "tsx": "text/typescript-jsx",
      "jsx": "text/jsx",
      "py": "text/x-python",
      "json": "application/json",
      "md": "text/markdown",
      "html": "text/html",
      "css": "text/css",
      "txt": "text/plain",
      "csv": "text/csv",
      "xml": "application/xml",
      "yaml": "text/yaml",
      "yml": "text/yaml",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }
}
