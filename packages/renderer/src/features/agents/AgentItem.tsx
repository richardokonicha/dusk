import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, Edit3, Trash2, Settings } from "lucide-react";
import type { AgentConfig } from "@shared/types/agent";
import { AgentStatus } from "../../components/agents/AgentStatus";
import { AgentEdit } from "./AgentEdit";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";

const agentTypeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  workspace: { label: "Workspace", variant: "default" },
  specialist: { label: "Specialist", variant: "secondary" },
  task: { label: "Task", variant: "outline" },
  orchestrator: { label: "Orchestrator", variant: "default" },
  system: { label: "System", variant: "destructive" },
};

interface AgentItemProps {
  agent: AgentConfig;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function AgentItem({
  agent,
  isSelected,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
}: AgentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const typeConfig = agentTypeConfig[agent.type] || agentTypeConfig.workspace;
  const initials = agent.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(agent.id);
    setIsDeleting(false);
    setMenuOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-xl border p-5 transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-muted-foreground/50"
      } ${isDeleting ? "opacity-50" : ""}`}
    >
      {isEditing ? (
        <AgentEdit
          agent={agent}
          onSave={async (updates) => {
            await onUpdate(agent.id, updates);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Avatar
              fallback={initials}
              className={`shrink-0 ${isActive ? "ring-2 ring-primary ring-offset-2" : ""}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-medium text-foreground truncate cursor-pointer"
                  onClick={onSelect}
                >
                  {agent.name}
                </span>
                <Badge variant={typeConfig.variant} className="shrink-0">
                  {typeConfig.label}
                </Badge>
                {isActive && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">
                    Active
                  </span>
                )}
              </div>
              {agent.description && (
                <p
                  className="text-sm text-muted-foreground mt-0.5 truncate cursor-pointer"
                  onClick={onSelect}
                >
                  {agent.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="capitalize">{agent.type}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{agent.model || "default"}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>Temp: {agent.temperature ?? 0.7}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{agent.tools?.length || 0} tools</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AgentStatus status="idle" size="sm" />
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal size={16} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border border-border bg-popover p-1 shadow-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsEditing(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}