import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Workspace } from "../../types";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSwitch: (id: string) => void;
  onOpenCreate: () => void;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  onSwitch,
  onOpenCreate,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        <span className="flex-1 truncate text-left">
          {currentWorkspace?.name || "Select Workspace"}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-lg"
          >
            <div className="p-1">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => {
                    onSwitch(workspace.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
                    currentWorkspace?.id === workspace.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <span className="truncate">{workspace.name}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreate();
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground mt-1 border-t border-border pt-1"
              >
                <span className="text-xs">+ New Workspace</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
