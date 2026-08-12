import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, FolderOpen, FileText, Code, Briefcase, Layers } from "lucide-react";

interface WorkspaceSetupProps {
  onNext: () => void;
  onBack?: () => void;
}

const templates = [
  { id: "blank", label: "Blank", description: "Start from scratch", icon: <FileText className="h-5 w-5" /> },
  { id: "development", label: "Development", description: "Code projects and debugging", icon: <Code className="h-5 w-5" /> },
  { id: "business", label: "Business", description: "Meetings and planning", icon: <Briefcase className="h-5 w-5" /> },
  { id: "general", label: "General", description: "Mixed use workspace", icon: <Layers className="h-5 w-5" /> }
] as const;

type TemplateId = typeof templates[number]["id"];

export function WorkspaceSetup({ onNext, onBack }: WorkspaceSetupProps) {
  const [name, setName] = useState("My Workspace");
  const [description, setDescription] = useState("");
  const [path, setPath] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("blank");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await window.dusk.ipc.invoke("workspace:create", {
        name: name.trim(),
        description: description.trim() || undefined,
        template: selectedTemplate
      });
      onNext();
    } catch {
      setError("Failed to create workspace");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="mb-2 text-2xl font-bold text-foreground">Create your workspace</h2>
        <p className="text-muted-foreground">
          Organize your tasks, notes, and projects in a dedicated workspace.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Default workspace</h3>
              <p className="text-sm text-muted-foreground">
                This will be your primary workspace
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Workspace name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this workspace for?"
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="~/Dusk/workspaces/my-workspace"
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={async () => {
                    try {
                      const result = await window.dusk.ipc.invoke<string>("system:open-path", {});
                      if (result) setPath(result);
                    } catch {
                      setPath("/Users/" + name.replace(/\s+/g, "-").toLowerCase());
                    }
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Browse
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Template</h3>
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedTemplate(template.id)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selectedTemplate === template.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  selectedTemplate === template.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  {template.icon}
                </div>
                <div>
                  <div className="font-medium text-foreground">{template.label}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                Create workspace
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
