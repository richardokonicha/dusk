import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Shield, Activity, Brain, Trash2 } from "lucide-react";
import type { AgentConfig, AgentPermissions, AgentEvent } from "@shared/types/agent";
import { AgentStatus } from "../../components/agents/AgentStatus";
import { AgentConfigForm } from "../../components/agents/AgentConfigForm";
import { AgentPermissionEditor } from "../../components/agents/AgentPermissionEditor";
import { AgentActivity } from "../../components/agents/AgentActivity";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar } from "../../components/ui/avatar";
import { formatRelativeTime } from "@shared/utils/format";

interface AgentDetailProps {
  agent: AgentConfig;
  onUpdate: (id: string, updates: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  onDelete: (id: string) => Promise<boolean>;
  onClose: () => void;
}

interface ActivityEvent {
  id: string;
  type: "started" | "completed" | "error" | "message" | "tool_use";
  description: string;
  timestamp: number;
}

export function AgentDetail({ agent, onUpdate, onDelete, onClose }: AgentDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(agent);
  const [permissions, setPermissions] = useState<AgentPermissions>(
    agent.permissions || {
      allowFileRead: true,
      allowFileWrite: false,
      allowNetwork: false,
      maxRequestsPerMinute: 60,
      allowedPaths: [],
      blockedPaths: [],
    }
  );
  const [memory, setMemory] = useState(
    agent.memory || {
      shortTermMaxMessages: 50,
      longTermEnabled: false,
      longTermDbPath: "",
    }
  );
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    setConfig(agent);
    setPermissions(
      agent.permissions || {
        allowFileRead: true,
        allowFileWrite: false,
        allowNetwork: false,
        maxRequestsPerMinute: 60,
        allowedPaths: [],
        blockedPaths: [],
      }
    );
    setMemory(
      agent.memory || {
        shortTermMaxMessages: 50,
        longTermEnabled: false,
        longTermDbPath: "",
      }
    );
  }, [agent]);

  const handleSaveConfig = async (updates: Partial<AgentConfig>) => {
    const updated = await onUpdate(agent.id, updates);
    if (updated) {
      setConfig(updated);
    }
    setIsEditing(false);
  };

  const handleSavePermissions = async (newPermissions: AgentPermissions) => {
    const updated = await onUpdate(agent.id, { permissions: newPermissions });
    if (updated) {
      setPermissions(newPermissions);
    }
  };

  const initials = agent.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    workspace: { label: "Workspace", variant: "default" },
    specialist: { label: "Specialist", variant: "secondary" },
    task: { label: "Task", variant: "outline" },
    orchestrator: { label: "Orchestrator", variant: "default" },
    system: { label: "System", variant: "destructive" },
  };

  const currentTypeConfig = typeConfig[agent.type] || typeConfig.workspace;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <Avatar fallback={initials} className="h-12 w-12 text-lg" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">{config.name}</h2>
                <Badge variant={currentTypeConfig.variant}>{currentTypeConfig.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {config.description || "No description"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Status</span>
            </div>
            <AgentStatus status="idle" size="md" />
            <span className="text-xs text-muted-foreground capitalize">
              {config.type}
            </span>
            <span className="text-xs text-muted-foreground">
              Model: {config.model || "default"}
            </span>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Settings className="h-4 w-4" />
                Configuration
              </h3>
              <div className="rounded-xl border border-border bg-background p-4">
                {isEditing ? (
                  <AgentConfigForm
                    agent={config}
                    onSave={handleSaveConfig}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                        <p className="text-sm text-foreground">{config.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Model</p>
                        <p className="text-sm text-foreground">{config.model || "default"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Temperature</p>
                        <p className="text-sm text-foreground">{config.temperature ?? 0.7}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Max Tokens</p>
                        <p className="text-sm text-foreground">{config.maxTokens?.toLocaleString() || "4,096"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">System Prompt</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{config.systemPrompt || "No system prompt set"}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Edit Configuration
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Shield className="h-4 w-4" />
                Permissions
              </h3>
              <div className="rounded-xl border border-border bg-background p-4">
                <AgentPermissionEditor
                  permissions={permissions}
                  onSave={handleSavePermissions}
                />
              </div>
            </section>

            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Brain className="h-4 w-4" />
                Memory
              </h3>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Short-term memory</p>
                      <p className="text-xs text-muted-foreground">
                        {memory.shortTermMaxMessages > 0 ? `${memory.shortTermMaxMessages} messages` : "Disabled"}
                      </p>
                    </div>
                    <span className={`inline-flex h-2 w-2 rounded-full ${memory.shortTermMaxMessages > 0 ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Long-term memory</p>
                      <p className="text-xs text-muted-foreground">
                        {memory.longTermEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <span className={`inline-flex h-2 w-2 rounded-full ${memory.longTermEnabled ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Activity className="h-4 w-4" />
                Activity
              </h3>
              <div className="rounded-xl border border-border bg-background p-4">
                <AgentActivity
                  agents={[]}
                  events={activityEvents}
                />
              </div>
            </section>

            <section className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <h3 className="text-sm font-medium text-destructive">Delete Agent</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(agent.id)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}