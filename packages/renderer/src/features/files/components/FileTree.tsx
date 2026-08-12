import { useState, useCallback, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, Trash2, GripVertical } from "lucide-react";
import type { FileInfo } from "@shared/types/file";
import { FileIcon } from "../FileIcon";
import { FileContextMenu } from "../FileContextMenu";

interface FileTreeProps {
  workspaceId: string;
  currentPath: string;
  onPathChange: (path: string) => void;
  onFileSelect?: (file: FileInfo) => void;
  onFileDelete?: (file: FileInfo) => void;
  selectedFile?: FileInfo | null;
}

export function FileTree({
  workspaceId,
  currentPath,
  onPathChange,
  onFileSelect,
  onFileDelete,
  selectedFile,
}: FileTreeProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["/"]));
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadFiles = useCallback(
    async (path: string) => {
      setLoading(true);
      try {
        const result = await window.dusk.ipc.invoke<{ success: boolean; data: FileInfo[] }>(
          "file:list",
          { workspaceId, path }
        );
        if (result.success) {
          setFiles(result.data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath, loadFiles]);

  const toggleDir = useCallback(
    (dirPath: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(dirPath)) {
          next.delete(dirPath);
        } else {
          next.add(dirPath);
          loadFiles(dirPath);
        }
        return next;
      });
    },
    [loadFiles]
  );

  const handleSelect = useCallback(
    (file: FileInfo) => {
      if (file.isDirectory) {
        toggleDir(file.relativePath);
        onPathChange(file.relativePath);
      } else {
        onFileSelect?.(file);
      }
    },
    [toggleDir, onPathChange, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetDir: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const items = Array.from(e.dataTransfer.files);
      for (const item of items) {
        const content = await item.text();
        await window.dusk.ipc.invoke("file:write", {
          workspaceId,
          path: `${targetDir}/${item.name}`,
          content,
        });
      }
      loadFiles(targetDir);
    },
    [workspaceId, loadFiles]
  );

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  return (
    <div
      className={`space-y-0.5 ${dragOver ? "bg-accent/20" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {loading && (
        <div className="flex items-center justify-center py-4">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      )}
      {sortedFiles.map((file) => {
        const isSelected = selectedFile?.relativePath === file.relativePath;
        return (
          <FileContextMenu key={file.relativePath} file={file} onDelete={() => onFileDelete?.(file)}>
            <div
              className={`flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-accent/50 group cursor-pointer ${
                isSelected ? "bg-accent" : ""
              }`}
              style={{ paddingLeft: `${16 + 8}px` }}
              onClick={() => handleSelect(file)}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-file", file.relativePath);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDrop={(e) => {
                if (file.isDirectory) {
                  handleDrop(e, file.relativePath);
                }
              }}
            >
              {file.isDirectory ? (
                expandedDirs.has(file.relativePath) ? (
                  <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                )
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <GripVertical
                size={14}
                className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0"
              />
              <FileIcon fileName={file.name} isDirectory={file.isDirectory} size={16} />
              <span className="flex-1 truncate text-sm">{file.name}</span>
              {isSelected && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              {!file.isDirectory && onFileDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(file);
                  }}
                  className="rounded p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </FileContextMenu>
        );
      })}
      {sortedFiles.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <span className="text-sm">Empty folder</span>
        </div>
      )}
    </div>
  );
}
