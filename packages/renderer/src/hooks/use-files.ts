import { useState, useCallback, useEffect, useRef } from "react";
import type { FileInfo, FileEvent, ArtifactMetadata, Artifact } from "@shared/types/file";

const CHANNELS = {
  FILE_LIST: "file:list",
  FILE_READ: "file:read",
  FILE_WRITE: "file:write",
  FILE_DELETE: "file:delete",
  FILE_CREATE_DIR: "file:create-dir",
  FILE_WATCH: "file:watch",
  FILE_WATCH_EVENT: "file:watch:event",
  ARTIFACT_LIST: "artifact:list",
  ARTIFACT_GET: "artifact:get",
  ARTIFACT_SAVE: "artifact:save",
  ARTIFACT_DELETE: "artifact:delete",
  ARTIFACT_LINK: "artifact:link",
  WORKSPACE_EXPORT: "workspace:export",
  WORKSPACE_IMPORT: "workspace:import",
};

export function useFiles(workspaceId: string | null) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentFile, setCurrentFile] = useState<{ path: string; content: string; info: FileInfo } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileEvents, setFileEvents] = useState<FileEvent[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactMetadata[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  const loadFiles = useCallback(
    async (relativePath: string = "/") => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);

      try {
        const result = await window.dusk.ipc.invoke<{ success: boolean; data: FileInfo[]; error?: { code: string; message: string } }>(
          CHANNELS.FILE_LIST,
          { workspaceId, path: relativePath }
        );
        if (result.success) {
          setFiles(result.data || []);
        } else {
          setError(result.error?.message || "Failed to list files");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const readFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);

      try {
        const result = await window.dusk.ipc.invoke<{ success: boolean; data: { content: string; info: FileInfo }; error?: { code: string; message: string } }>(
          CHANNELS.FILE_READ,
          { workspaceId, path: filePath }
        );
        if (result.success && result.data) {
          setCurrentFile({ path: result.data.info.relativePath, content: result.data.content, info: result.data.info });
        } else {
          setError(result.error?.message || "Failed to read file");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const writeFile = useCallback(
    async (filePath: string, content: string) => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);

      try {
        const result = await window.dusk.ipc.invoke<{ success: boolean; data: FileInfo; error?: { code: string; message: string } }>(
          CHANNELS.FILE_WRITE,
          { workspaceId, path: filePath, content }
        );
        if (result.success) {
          setCurrentFile((prev) =>
            prev && prev.path === filePath ? { ...prev, content } : prev
          );
          setFiles((prev) =>
            prev.map((f) =>
              f.relativePath === filePath ? { ...f, size: content.length, mtime: Date.now() } : f
            )
          );
          return result.data;
        } else {
          setError(result.error?.message || "Failed to write file");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const deleteFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);

      try {
        const result = await window.dusk.ipc.invoke<{ success: boolean; error?: { code: string; message: string } }>(
          CHANNELS.FILE_DELETE,
          { workspaceId, path: filePath }
        );
        if (result.success) {
          setFiles((prev) => prev.filter((f) => f.path !== filePath && f.relativePath !== filePath));
          setCurrentFile((prev) => (prev && prev.path === filePath ? null : prev));
        } else {
          setError(result.error?.message || "Failed to delete file");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const createDirectory = useCallback(
    async (dirPath: string) => {
      if (!workspaceId) return;
      setLoading(true);
      setError(null);

      try {
        const result = await window.dusk.ipc.invoke<{ success: boolean; error?: { code: string; message: string } }>(
          CHANNELS.FILE_CREATE_DIR,
          { workspaceId, path: dirPath }
        );
        if (!result.success) {
          setError(result.error?.message || "Failed to create directory");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const watchWorkspace = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const cleanup = await window.dusk.ipc.invoke<() => void>(
        CHANNELS.FILE_WATCH,
        { workspaceId }
      );

      const onFileEvent = (data: unknown) => {
        const eventData = data as FileEvent;
        setFileEvents((prev) => [eventData, ...prev].slice(0, 100));
        setFiles((prev) => {
          const exists = prev.some((f) => f.path === eventData.path || f.relativePath === eventData.path);
          if (eventData.type === "unlink" || eventData.type === "unlinkDir") {
            return prev.filter((f) => f.path !== eventData.path && f.relativePath !== eventData.path);
          }
          if (eventData.type === "add" || eventData.type === "addDir") {
            if (!exists) {
              return [
                ...prev,
                {
                  name: eventData.path.split("/").pop() || "",
                  path: eventData.path,
                  relativePath: eventData.relativePath || eventData.path,
                  size: eventData.size,
                  mtime: eventData.mtime,
                  isDirectory: eventData.type === "addDir",
                  extension: eventData.path.split(".").pop() || "",
                  mimeType: "application/octet-stream",
                },
              ];
            }
          }
          if (eventData.type === "change") {
            return prev.map((f) =>
              f.path === eventData.path || f.relativePath === eventData.path
                ? { ...f, size: eventData.size, mtime: eventData.mtime }
                : f
            );
          }
          return prev;
        });
      };

      const removeListener = window.dusk.ipc.on(CHANNELS.FILE_WATCH_EVENT, onFileEvent);
      cleanupRef.current = () => {
        removeListener?.();
        if (typeof cleanup === "function") {
          cleanup();
        }
      };
    } catch {
      // watcher not supported
    }
  }, [workspaceId]);

  const exportWorkspace = useCallback(async () => {
    if (!workspaceId) return null;
    setLoading(true);
    setError(null);

    try {
      const result = await window.dusk.ipc.invoke<{ success: boolean; data: ArrayBuffer; error?: { code: string; message: string } }>(
        CHANNELS.WORKSPACE_EXPORT,
        { workspaceId }
      );
      if (result.success && result.data) {
        return result.data;
      } else {
        setError(result.error?.message || "Failed to export workspace");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    return null;
  }, [workspaceId]);

  const importWorkspace = useCallback(
    async (data: Uint8Array) => {
      setLoading(true);
      setError(null);

      try {
        const result = await window.dusk.ipc.invoke<{ success: boolean; data: { workspaceId: string; imported: number; files: string[] }; error?: { code: string; message: string } }>(
          CHANNELS.WORKSPACE_IMPORT,
          { data }
        );
        if (result.success) {
          return result.data;
        } else {
          setError(result.error?.message || "Failed to import workspace");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
      return null;
    },
    []
  );

  const loadArtifacts = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const result = await window.dusk.ipc.invoke<{ success: boolean; data: ArtifactMetadata[] }>(
        CHANNELS.ARTIFACT_LIST,
        { workspaceId }
      );
      if (result.success) {
        setArtifacts(result.data || []);
      }
    } catch {
      // ignore
    }
  }, [workspaceId]);

  const saveArtifact = useCallback(
    async (artifactId: string, artifact: Partial<Artifact>) => {
      if (!workspaceId) return;
      try {
        await window.dusk.ipc.invoke(CHANNELS.ARTIFACT_SAVE, {
          workspaceId,
          artifactId,
          artifact,
        });
        loadArtifacts();
      } catch {
        // ignore
      }
    },
    [workspaceId, loadArtifacts]
  );

  const deleteArtifact = useCallback(
    async (artifactId: string) => {
      if (!workspaceId) return;
      try {
        await window.dusk.ipc.invoke(CHANNELS.ARTIFACT_DELETE, {
          workspaceId,
          artifactId,
        });
        setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
      } catch {
        // ignore
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    if (workspaceId) {
      loadFiles();
      loadArtifacts();
    }
  }, [workspaceId, loadFiles, loadArtifacts]);

  useEffect(() => {
    let mounted = true;
    if (workspaceId) {
      watchWorkspace().then(() => {
        if (!mounted) {
          cleanupRef.current?.();
        }
      });
    }
    return () => {
      mounted = false;
      cleanupRef.current?.();
    };
  }, [workspaceId, watchWorkspace]);

  return {
    files,
    currentFile,
    loading,
    error,
    fileEvents,
    artifacts,
    loadFiles,
    readFile,
    writeFile,
    deleteFile,
    createDirectory,
    watchWorkspace,
    exportWorkspace,
    importWorkspace,
    loadArtifacts,
    saveArtifact,
    deleteArtifact,
    clearError: () => setError(null),
    clearFileEvents: () => setFileEvents([]),
  };
}
