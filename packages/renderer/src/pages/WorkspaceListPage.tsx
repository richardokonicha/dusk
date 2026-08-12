import { useWorkspace } from "../hooks/use-workspace";
import { motion } from "framer-motion";
import { FolderOpen } from "lucide-react";

export function WorkspaceListPage() {
  const workspace = useWorkspace();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <FolderOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-2">Welcome to Dusk</h1>
          <p className="text-muted-foreground">
            Select a workspace to get started, or create a new one.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {workspace.workspaces.map((ws, index) => (
            <motion.button
              key={ws.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => workspace.switchWorkspace(ws.id)}
              className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                workspace.currentWorkspace?.id === ws.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <FolderOpen size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{ws.name}</h3>
                {ws.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {ws.description}
                  </p>
                )}
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
