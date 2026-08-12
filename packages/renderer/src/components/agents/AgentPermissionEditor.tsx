import { useState } from "react";
import { motion } from "framer-motion";
import type { AgentPermissions } from "@shared/types/agent";

interface AgentPermissionEditorProps {
  permissions: AgentPermissions;
  onSave: (permissions: AgentPermissions) => Promise<void>;
  readOnly?: boolean;
}

export function AgentPermissionEditor({
  permissions,
  onSave,
  readOnly = false,
}: AgentPermissionEditorProps) {
  const [local, setLocal] = useState<AgentPermissions>(permissions);
  const [isSaving, setIsSaving] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newBlockedPath, setNewBlockedPath] = useState("");

  const togglePermission = (key: keyof AgentPermissions) => {
    if (typeof local[key] === "boolean") {
      setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const addPath = (type: "allowedPaths" | "blockedPaths", value: string, setValue: (v: string) => void) => {
    if (!value.trim()) return;
    setLocal((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), value.trim()],
    }));
    setValue("");
  };

  const removePath = (type: "allowedPaths" | "blockedPaths", index: number) => {
    setLocal((prev) => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(local);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
          <div>
            <p className="text-sm font-medium text-foreground">File Read</p>
            <p className="text-xs text-muted-foreground">Allow reading files</p>
          </div>
          <button
            type="button"
            onClick={() => togglePermission("allowFileRead")}
            disabled={readOnly}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              local.allowFileRead ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                local.allowFileRead ? "translate-x-5" : "translate-x-0"
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
            onClick={() => togglePermission("allowFileWrite")}
            disabled={readOnly}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              local.allowFileWrite ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                local.allowFileWrite ? "translate-x-5" : "translate-x-0"
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
            onClick={() => togglePermission("allowNetwork")}
            disabled={readOnly}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              local.allowNetwork ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                local.allowNetwork ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Max requests per minute
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={local.maxRequestsPerMinute}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, maxRequestsPerMinute: Number(e.target.value) }))
            }
            disabled={readOnly}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Allowed paths
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/workspace/project"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              disabled={readOnly}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPath("allowedPaths", newPath, setNewPath);
                }
              }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => addPath("allowedPaths", newPath, setNewPath)}
              disabled={readOnly || !newPath.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </motion.button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(local.allowedPaths || []).map((path, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {path}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removePath("allowedPaths", index)}
                    className="ml-1 text-primary/70 hover:text-primary"
                  >
                    ×
                  </button>
                )}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Blocked paths
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newBlockedPath}
              onChange={(e) => setNewBlockedPath(e.target.value)}
              placeholder="/workspace/secret"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              disabled={readOnly}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPath("blockedPaths", newBlockedPath, setNewBlockedPath);
                }
              }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => addPath("blockedPaths", newBlockedPath, setNewBlockedPath)}
              disabled={readOnly || !newBlockedPath.trim()}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              Add
            </motion.button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(local.blockedPaths || []).map((path, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
              >
                {path}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removePath("blockedPaths", index)}
                    className="ml-1 text-destructive/70 hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-end pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Permissions"}
          </motion.button>
        </div>
      )}
    </div>
  );
}
