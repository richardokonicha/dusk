import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FolderOpen,
  Trash2,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import type { Workspace } from "../../types";
import { WorkspaceCreate } from "./WorkspaceCreate";

interface WorkspaceListProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelect: (workspace: Workspace) => void;
  onCreate: (name: string, description?: string) => Promise<Workspace>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}

export function WorkspaceList({
  workspaces,
  currentWorkspace,
  onSelect,
  onCreate,
  onDelete,
  isLoading,
}: WorkspaceListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Workspaces
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      <AnimatePresence>
        {workspaces.map((workspace) => (
          <motion.div
            key={workspace.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="group relative"
          >
            <button
              onClick={() => onSelect(workspace)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                currentWorkspace?.id === workspace.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <FolderOpen size={16} className="shrink-0" />
              <span className="flex-1 truncate text-left">{workspace.name}</span>
              {currentWorkspace?.id === workspace.id && (
                <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
              )}
            </button>

            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === workspace.id ? null : workspace.id);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>

            <AnimatePresence>
              {menuOpenId === workspace.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-border bg-popover p-1 shadow-md"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(workspace.id);
                      setMenuOpenId(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoading && (
        <div className="px-2 py-1">
          <div className="h-2 w-16 animate-pulse rounded bg-muted" />
        </div>
      )}

      <WorkspaceCreate
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (name: string, description?: string) => {
          await onCreate(name, description);
          setShowCreate(false);
        }}
      />
    </div>
  );
}
