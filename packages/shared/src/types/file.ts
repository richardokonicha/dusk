export interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  size: number;
  mtime: number;
  isDirectory: boolean;
  extension: string;
  mimeType: string;
}

export interface FileEvent {
  type: "add" | "change" | "unlink" | "addDir" | "unlinkDir";
  path: string;
  relativePath: string;
  mtime: number;
  size: number;
}

export interface ArtifactMetadata {
  id: string;
  workspaceId: string;
  agentId: string;
  conversationId: string | null;
  name: string;
  description: string | null;
  type: ArtifactType;
  size: number;
  mimeType: string;
  extension: string;
  filePath: string;
  createdAt: number;
  updatedAt: number;
}

export interface Artifact {
  id: string;
  workspaceId: string;
  agentId: string;
  conversationId: string | null;
  name: string;
  description: string | null;
  type: ArtifactType;
  content: string;
  metadata: {
    size: number;
    mimeType: string;
    extension: string;
  };
  createdAt: number;
  updatedAt: number;
}

export type ArtifactType =
  | "code"
  | "text"
  | "markdown"
  | "json"
  | "yaml"
  | "image"
  | "audio"
  | "video"
  | "data"
  | "binary"
  | "archive"
  | "unknown";

export interface WorkspaceStructure {
  id: string;
  name: string;
  rootPath: string;
  directories: {
    conversations: string;
    artifacts: string;
    files: string;
    projects: string;
  };
  metadata: WorkspaceMetadata;
}

export interface WorkspaceMetadata {
  version: string;
  createdAt: number;
  updatedAt: number;
  settings: Record<string, unknown>;
}

export interface WorkspaceExport {
  workspaceId: string;
  name: string;
  exportedAt: number;
  files: ExportedFile[];
}

export interface ExportedFile {
  path: string;
  content: Buffer | string;
  mode?: number;
}
