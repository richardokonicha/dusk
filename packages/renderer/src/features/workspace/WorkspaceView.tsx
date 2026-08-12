import { motion } from "framer-motion";
import { FolderOpen, Plus } from "lucide-react";
import type { Workspace } from "../../types";

interface WorkspaceViewProps {
  workspace: Workspace | null;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
}

export function WorkspaceView({
  workspace,
  onCreateConversation,
  onSelectConversation,
}: WorkspaceViewProps) {
  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FolderOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No workspace selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a workspace or create a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {workspace.description}
            </p>
          )}
        </div>
        <button
          onClick={onCreateConversation}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => onSelectConversation(`conv-${i}`)}
              className="rounded-xl border border-border bg-card p-4 text-left hover:border-muted-foreground/50 transition-colors"
            >
              <h3 className="font-medium mb-1">Conversation {i}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                This is a sample conversation in your workspace. Click to open
                the chat.
              </p>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
