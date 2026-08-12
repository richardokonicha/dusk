import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, MessageSquare, Settings2, Wifi } from "lucide-react";
import type { Agent, Provider } from "@shared/types";
import { AgentForm } from "./AgentForm";

type AgentType = "workspace" | "task" | "specialist" | "orchestrator" | "system";

interface AgentsSettingsProps {
  agents?: Agent[];
  providers?: Provider[];
  onCreate?: (agent: Omit<Agent, "id" | "createdAt" | "updatedAt">) => Promise<Agent>;
  onUpdate?: (id: string, partial: Partial<Agent>) => Promise<Agent | undefined>;
  onDelete?: (id: string) => Promise<boolean>;
  onSaveStatusChange?: (status: "idle" | "saving" | "saved" | "error") => void;
}

const agentTypes: { value: AgentType; label: string; description: string }[] = [
  { value: "workspace", label: "Workspace", description: "General purpose assistant" },
  { value: "task", label: "Task", description: "Focused on specific tasks" },
  { value: "specialist", label: "Specialist", description: "Domain-specific expert" },
  { value: "orchestrator", label: "Orchestrator", description: "Coordinates other agents" },
  { value: "system", label: "System", description: "System-level operations" }
];

export function AgentsSettings({ agents: propAgents, providers: propProviders, onCreate, onUpdate, onDelete, onSaveStatusChange }: AgentsSettingsProps) {
  const [agents, setAgents] = useState<Agent[]>(propAgents ?? []);
  const [providers] = useState<Provider[]>(propProviders ?? []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notifySave = (status: "idle" | "saving" | "saved" | "error") => {
    onSaveStatusChange?.(status);
  };

  const handleCreate = async (agent: Omit<Agent, "id" | "createdAt" | "updatedAt">) => {
    notifySave("saving");
    setError(null);
    try {
      if (onCreate) {
        const created = await onCreate(agent);
        setAgents((prev) => [...prev, created]);
      }
      setShowForm(false);
      notifySave("saved");
    } catch {
      setError("Failed to create agent");
      notifySave("error");
    }
  };

  const handleUpdate = async (id: string, partial: Partial<Agent>) => {
    notifySave("saving");
    setError(null);
    try {
      if (onUpdate) {
        const updated = await onUpdate(id, partial);
        if (updated) {
          setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
        }
      }
      setEditingId(null);
      notifySave("saved");
    } catch {
      setError("Failed to update agent");
      notifySave("error");
    }
  };

  const handleDelete = async (id: string) => {
    notifySave("saving");
    setError(null);
    try {
      if (onDelete) {
        const success = await onDelete(id);
        if (success) {
          setAgents((prev) => prev.filter((a) => a.id !== id));
        }
      }
      notifySave("saved");
    } catch {
      setError("Failed to delete agent");
      notifySave("error");
    }
  };

  const getProviderName = (providerId: string) => {
    return providers.find((p) => p.id === providerId)?.name ?? "Unknown provider";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Agents</h2>
          <p className="mt-1 text-muted-foreground">
            Configure AI agents with specific prompts and settings
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </motion.button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        <AnimatePresence>
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              {editingId === agent.id ? (
                <AgentForm
                  agent={agent}
                  providers={providers}
                  onSave={(partial) => handleUpdate(agent.id, partial)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{agent.name}</span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {agent.description}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          {getProviderName(agent.providerId)}
                        </span>
                        <span>·</span>
                        <span>{agent.model}</span>
                        <span>·</span>
                        <span>Temp: {agent.temperature}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(agent.id)}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-destructive hover:border-destructive/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {agents.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-1 font-medium text-foreground">No agents configured</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first agent to automate tasks
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Agent
          </button>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Add Agent</h3>
              <AgentForm
                providers={providers}
                onSave={handleCreate}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
