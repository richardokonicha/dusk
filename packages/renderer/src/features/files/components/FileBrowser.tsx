import { useState, useCallback, useEffect, useMemo } from "react";
import {
  FileText,
  FolderOpen,
  Folder,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  X,
  Search,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";
import type { FileInfo } from "@shared/types/file";
import { FileContextMenu } from "../FileContextMenu";

type ViewMode = "list" | "grid";
type SortField = "name" | "mtime" | "size";
type SortDirection = "asc" | "desc";

interface FileBrowserProps {
  workspaceId: string;
  onFileSelect?: (file: FileInfo) => void;
  onFileCreate?: (name: string) => void;
  onFileDelete?: (file: FileInfo) => void;
  onExport?: () => void;
  onImport?: () => void;
}

export function FileBrowser({
  workspaceId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onExport,
  onImport,
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("/");
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileInfo[]>([]);
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

  const handlePathChange = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newFileName.trim()) return;
    await onFileCreate?.(newFileName);
    setNewFileName("");
    setIsCreating(false);
    loadFiles(currentPath);
  }, [newFileName, onFileCreate, currentPath, loadFiles]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("asc");
      return field;
    });
  }, []);

  const handleFileDelete = useCallback(
    async (file: FileInfo) => {
      await onFileDelete?.(file);
      loadFiles(currentPath);
    },
    [onFileDelete, currentPath, loadFiles]
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
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const items = Array.from(e.dataTransfer.files);
      for (const item of items) {
        const content = await item.text();
        await window.dusk.ipc.invoke("file:write", {
          workspaceId,
          path: `${currentPath}/${item.name}`,
          content,
        });
      }
      loadFiles(currentPath);
    },
    [workspaceId, currentPath, loadFiles]
  );

  const filteredFiles = useMemo(() => {
    let result = [...files];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "mtime") {
        cmp = a.mtime - b.mtime;
      } else if (sortField === "size") {
        cmp = a.size - b.size;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, searchQuery, sortField, sortDirection]);

  const pathParts = currentPath.split("/").filter(Boolean);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-muted-foreground" />;
    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="text-primary" />
    ) : (
      <ArrowDown size={14} className="text-primary" />
    );
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium">Files</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onExport}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Export workspace"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onImport}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Import workspace"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="New file"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
        <button
          onClick={() => handlePathChange("/")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ~
        </button>
        {pathParts.map((part, index) => {
          const partPath = "/" + pathParts.slice(0, index + 1).join("/");
          return (
            <div key={partPath} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-muted-foreground" />
              <button
                onClick={() => handlePathChange(partPath)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {part}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1 border border-border rounded-md">
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-sm p-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="List view"
          >
            <LayoutList size={14} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-sm p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid view"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
        <button
          onClick={() => handleSort("name")}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Sort by name"
        >
          Name {getSortIcon("name")}
        </button>
        <button
          onClick={() => handleSort("mtime")}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Sort by date"
        >
          Date {getSortIcon("mtime")}
        </button>
        <button
          onClick={() => handleSort("size")}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Sort by size"
        >
          Size {getSortIcon("size")}
        </button>
      </div>

      <div
        className={`flex-1 overflow-auto p-2 ${dragOver ? "bg-accent/20" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && filteredFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Folder size={32} className="mb-2 opacity-50" />
            <span className="text-sm">Empty folder</span>
          </div>
        )}

        {viewMode === "list" ? (
          <div className="space-y-0.5">
            {filteredFiles.map((file) => (
              <FileContextMenu key={file.relativePath} file={file} onDelete={() => handleFileDelete(file)}>
                <div
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 group cursor-pointer"
                  onClick={() => {
                    if (file.isDirectory) {
                      handlePathChange(file.relativePath);
                    } else {
                      onFileSelect?.(file);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-file", file.relativePath);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <GripVertical size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  {file.isDirectory ? (
                    <Folder size={16} className="text-blue-400 shrink-0" />
                  ) : (
                    <FileText size={16} className="text-muted-foreground shrink-0" />
                  )}
                  <span className="flex-1 truncate text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {file.isDirectory ? "" : formatSize(file.size)}
                  </span>
                </div>
              </FileContextMenu>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredFiles.map((file) => (
              <FileContextMenu key={file.relativePath} file={file} onDelete={() => handleFileDelete(file)}>
                <div
                  className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 hover:border-border/80 hover:bg-accent/20 transition-colors cursor-pointer"
                  onClick={() => {
                    if (file.isDirectory) {
                      handlePathChange(file.relativePath);
                    } else {
                      onFileSelect?.(file);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-file", file.relativePath);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  {file.isDirectory ? (
                    <Folder size={32} className="text-blue-400" />
                  ) : (
                    <FileText size={32} className="text-muted-foreground" />
                  )}
                  <span className="text-xs text-center truncate w-full">{file.name}</span>
                </div>
              </FileContextMenu>
            ))}
          </div>
        )}
      </div>

      {isCreating && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="File or folder name"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setIsCreating(false);
              }}
            />
            <button
              onClick={handleCreate}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Save size={14} />
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
