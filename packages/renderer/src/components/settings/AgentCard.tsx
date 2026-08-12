import { motion } from "framer-motion";
import { MessageSquare, Trash2, ExternalLink } from "lucide-react";
import type { Agent, Provider } from "@shared/types";

interface AgentCardProps {
  agent: Agent;
  providers: Provider[];
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AgentCard({ agent, providers, onEdit, onDelete }: AgentCardProps) {
  const provider = providers.find((p) => p.id === agent.providerId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{agent.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{provider?.name ?? "Unknown"}</span>
              <span>·</span>
              <span>{agent.model}</span>
              <span>·</span>
              <span>Temp: {agent.temperature}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
