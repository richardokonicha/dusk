import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { AgentConfig, AgentPermissions } from "@shared/types/agent";
import { isValidAgentConfig } from "@shared/utils/validators";

interface AgentConfigFormProps {
  agent?: Partial<AgentConfig>;
  onSave: (config: Omit<AgentConfig, "id">) => void;
  onCancel?: () => void;
  compact?: boolean;
  isSubmitting?: boolean;
}

const agentTypes = [
  { value: "workspace", label: "Workspace" },
  { value: "specialist", label: "Specialist" },
  { value: "task", label: "Task" },
  { value: "orchestrator", label: "Orchestrator" },
  { value: "system", label: "System" },
];

const availableTools = [
  { id: "filesystem", label: "File System", description: "Read and write files" },
  { id: "web_search", label: "Web Search", description: "Search the web" },
  { id: "web_fetch", label: "Web Fetch", description: "Fetch web pages" },
  { id: "code_execution", label: "Code Execution", description: "Run code in sandbox" },
  { id: "database", label: "Database", description: "Query databases" },
  { id: "api_call", label: "API Calls", description: "Make HTTP requests" },
  { id: "shell", label: "Shell", description: "Run shell commands" },
  { id: "git", label: "Git", description: "Git operations" },
];

export function AgentConfigForm({
  agent,
  onSave,
  onCancel,
  compact = false,
  isSubmitting = false,
}: AgentConfigFormProps) {
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [type, setType] = useState<AgentConfig["type"]>(agent?.type ?? "workspace");
  const [model, setModel] = useState(agent?.model ?? "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? "");
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(agent?.maxTokens ?? 4096);
  const [tools, setTools] = useState<string[]>(agent?.tools ?? []);
  const [permissions, setPermissions] = useState<AgentPermissions>(
    agent?.permissions || {
      allowFileRead: true,
      allowFileWrite: false,
      allowNetwork: false,
      maxRequestsPerMinute: 60,
      allowedPaths: [],
      blockedPaths: [],
    }
  );
  const [memory, setMemory] = useState(
    agent?.memory || {
      shortTermMaxMessages: 50,
      longTermEnabled: false,
      longTermDbPath: "",
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (agent) {
      setName(agent.name ?? "");
      setDescription(agent.description ?? "");
      setType(agent.type ?? "workspace");
      setModel(agent.model ?? "");
      setSystemPrompt(agent.systemPrompt ?? "");
      setTemperature(agent.temperature ?? 0.7);
      setMaxTokens(agent.maxTokens ?? 4096);
      setTools(agent.tools ?? []);
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
    }
  }, [agent]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Agent name is required";
    } else if (name.trim().length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }

    if (!systemPrompt.trim()) {
      newErrors.systemPrompt = "System prompt is required";
    } else if (systemPrompt.trim().length > 10000) {
      newErrors.systemPrompt = "System prompt must be 10,000 characters or less";
    }

    if (model && model.length > 100) {
      newErrors.model = "Model name must be 100 characters or less";
    }

    if (temperature < 0 || temperature > 2) {
      newErrors.temperature = "Temperature must be between 0 and 2";
    }

    if (maxTokens < 1 || maxTokens > 100000) {
      newErrors.maxTokens = "Max tokens must be between 1 and 100,000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newTouched = {
      name: true,
      systemPrompt: true,
      model: true,
      temperature: true,
      maxTokens: true,
    };
    setTouched(newTouched);

    if (!validate()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      model: model.trim() || "default",
      systemPrompt: systemPrompt.trim(),
      temperature,
      maxTokens,
      tools,
      permissions,
      memory,
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  const toggleTool = (toolId: string) => {
    setTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId]
    );
  };

  const showFieldError = (field: string): boolean => {
    return touched[field] && !!errors[field];
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-6"}>
      <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Agent name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur("name")}
            placeholder="My Agent"
            className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${showFieldError("name") ? "border-destructive" : "border-border"}`}
          />
          {showFieldError("name") && (
            <p className="mt-1 text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AgentConfig["type"])}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {agentTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do?"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            onBlur={() => handleBlur("model")}
            placeholder="gpt-4o"
            className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${showFieldError("model") ? "border-destructive" : "border-border"}`}
          />
          {showFieldError("model") && (
            <p className="mt-1 text-xs text-destructive">{errors.model}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Max tokens: {maxTokens.toLocaleString()}
          </label>
          <input
            type="range"
            min="256"
            max="32768"
            step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            onBlur={() => handleBlur("maxTokens")}
            className="w-full"
          />
          {showFieldError("maxTokens") && (
            <p className="mt-1 text-xs text-destructive">{errors.maxTokens}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          System prompt <span className="text-destructive">*</span>
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          onBlur={() => handleBlur("systemPrompt")}
          placeholder="You are a helpful assistant..."
          rows={compact ? 3 : 5}
          className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${showFieldError("systemPrompt") ? "border-destructive" : "border-border"}`}
        />
        {showFieldError("systemPrompt") && (
          <p className="mt-1 text-xs text-destructive">{errors.systemPrompt}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {systemPrompt.length.toLocaleString()} / 10,000 characters
        </p>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-foreground">
          Temperature: <span className="text-muted-foreground">{temperature.toFixed(1)}</span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            onBlur={() => handleBlur("temperature")}
            className="flex-1"
          />
          <div className="flex w-24 justify-between text-xs text-muted-foreground">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>
        {showFieldError("temperature") && (
          <p className="mt-1 text-xs text-destructive">{errors.temperature}</p>
        )}
      </div>

      {!compact && (
        <>
          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              Tools
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableTools.map((tool) => (
                <label
                  key={tool.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    tools.includes(tool.id)
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-muted-foreground/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tools.includes(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{tool.label}</p>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              Permissions
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">File Read</p>
                  <p className="text-xs text-muted-foreground">Allow reading files</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissions((prev) => ({ ...prev, allowFileRead: !prev.allowFileRead }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    permissions.allowFileRead ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition duration-200 ${
                      permissions.allowFileRead ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">File Write</p>
                  <p className="text-xs text-muted-foreground">Allow writing files</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissions((prev) => ({ ...prev, allowFileWrite: !prev.allowFileWrite }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    permissions.allowFileWrite ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition duration-200 ${
                      permissions.allowFileWrite ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Network</p>
                  <p className="text-xs text-muted-foreground">Allow network requests</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissions((prev) => ({ ...prev, allowNetwork: !prev.allowNetwork }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    permissions.allowNetwork ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition duration-200 ${
                      permissions.allowNetwork ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Max requests/min
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={permissions.maxRequestsPerMinute}
                  onChange={(e) =>
                    setPermissions((prev) => ({ ...prev, maxRequestsPerMinute: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              Memory
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Short-term memory</p>
                  <p className="text-xs text-muted-foreground">Remember recent messages</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMemory((prev) => ({ ...prev, shortTermMaxMessages: prev.shortTermMaxMessages > 0 ? 0 : 50 }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    memory.shortTermMaxMessages > 0 ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition duration-200 ${
                      memory.shortTermMaxMessages > 0 ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Long-term memory</p>
                  <p className="text-xs text-muted-foreground">Persistent knowledge</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMemory((prev) => ({ ...prev, longTermEnabled: !prev.longTermEnabled }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    memory.longTermEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition duration-200 ${
                      memory.longTermEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {!compact && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Agent"}
          </motion.button>
        </div>
      )}
    </form>
  );
}