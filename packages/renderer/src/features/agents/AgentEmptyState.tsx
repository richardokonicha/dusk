import { motion } from "framer-motion";
import { MessageSquare, Plus, Sparkles } from "lucide-react";

interface AgentEmptyStateProps {
  onCreate?: () => void;
}

export function AgentEmptyState({ onCreate }: AgentEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">No agents yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Create your first agent to automate tasks, answer questions, and power your workspace with AI.
      </p>
      {onCreate && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create your first agent
        </motion.button>
      )}
    </motion.div>
  );
}
