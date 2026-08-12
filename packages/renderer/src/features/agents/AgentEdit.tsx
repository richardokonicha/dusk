import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import type { AgentConfig } from "@shared/types/agent";
import { AgentConfigForm } from "../../components/agents/AgentConfigForm";
import { Button } from "../../components/ui/button";

interface AgentEditProps {
  agent: AgentConfig;
  onSave: (updates: Partial<AgentConfig>) => Promise<void>;
  onDelete?: (id: string) => Promise<boolean>;
  onCancel: () => void;
}

export function AgentEdit({ agent, onSave, onDelete, onCancel }: AgentEditProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (updates: Partial<AgentConfig>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(agent.id);
    } catch {
      setError("Failed to delete agent");
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border border-border bg-background p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Edit Agent</h3>
        <button
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <AgentConfigForm
        agent={agent}
        onSave={handleSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
      {onDelete && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <h4 className="text-sm font-medium text-destructive">Delete Agent</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
