import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ExternalLink, Check, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import type { Provider, ProviderType } from "@shared/types";
import { ProviderForm } from "./ProviderForm";

interface ProvidersSettingsProps {
  providers?: Provider[];
  onCreate?: (provider: Omit<Provider, "id" | "createdAt" | "updatedAt">) => Promise<Provider>;
  onUpdate?: (id: string, partial: Partial<Provider>) => Promise<Provider | undefined>;
  onDelete?: (id: string) => Promise<boolean>;
  onSaveStatusChange?: (status: "idle" | "saving" | "saved" | "error") => void;
}

const providerMeta: Record<ProviderType, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "#10a37f" },
  anthropic: { label: "Anthropic", color: "#d4a27f" },
  ollama: { label: "Ollama", color: "#ffffff" },
  azure: { label: "Azure", color: "#0078d4" },
  custom: { label: "Custom", color: "#8b5cf6" }
};

export function ProvidersSettings({ providers: propProviders, onCreate, onUpdate, onDelete, onSaveStatusChange }: ProvidersSettingsProps) {
  const [providers, setProviders] = useState<Provider[]>(propProviders ?? []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; models?: string[]; error?: string }>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifySave = (status: "idle" | "saving" | "saved" | "error") => {
    onSaveStatusChange?.(status);
  };

  const handleCreate = async (provider: Omit<Provider, "id" | "createdAt" | "updatedAt">) => {
    notifySave("saving");
    setError(null);
    try {
      if (onCreate) {
        const created = await onCreate(provider);
        setProviders((prev) => [...prev, created]);
      }
      setShowForm(false);
      notifySave("saved");
    } catch {
      setError("Failed to create provider");
      notifySave("error");
    }
  };

  const handleUpdate = async (id: string, partial: Partial<Provider>) => {
    notifySave("saving");
    setError(null);
    try {
      if (onUpdate) {
        const updated = await onUpdate(id, partial);
        if (updated) {
          setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
        }
      }
      setEditingId(null);
      notifySave("saved");
    } catch {
      setError("Failed to update provider");
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
          setProviders((prev) => prev.filter((p) => p.id !== id));
        }
      }
      notifySave("saved");
    } catch {
      setError("Failed to delete provider");
      notifySave("error");
    }
  };

  const handleTest = async (provider: Provider) => {
    setTestingId(provider.id);
    setTestResults((prev) => ({ ...prev, [provider.id]: { success: false } }));
    try {
      const result = await window.dusk.ipc.invoke<{ success: boolean; models?: string[]; error?: string }>("provider:testConnection", {
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey
      });
      setTestResults((prev) => ({ ...prev, [provider.id]: result }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: { success: false, error: "Connection failed" }
      }));
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-secondary" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Providers</h2>
          <p className="mt-1 text-muted-foreground">
            Manage your AI provider connections
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </motion.button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {providers.map((provider) => {
            const meta = providerMeta[provider.type];
            const testResult = testResults[provider.id];
            const isTesting = testingId === provider.id;

            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-border bg-card p-5"
              >
                {editingId === provider.id ? (
                  <ProviderForm
                    provider={provider}
                    onSave={(partial) => handleUpdate(provider.id, partial)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                      >
                        <ProviderIcon type={provider.type} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{provider.name}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${meta.color}15`,
                              color: meta.color
                            }}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {provider.baseUrl}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {testResult?.success !== undefined ? (
                              testResult.success ? (
                                <Wifi className="h-3 w-3 text-green-400" />
                              ) : (
                                <WifiOff className="h-3 w-3 text-red-400" />
                              )
                            ) : (
                              <WifiOff className="h-3 w-3" />
                            )}
                            {testResult?.success ? "Connected" : testResult?.success === false ? "Disconnected" : "Not tested"}
                          </span>
                          <span>·</span>
                          <span>{provider.models.length} models</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest(provider)}
                        disabled={isTesting}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        {isTesting ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Testing
                          </span>
                        ) : (
                          "Test"
                        )}
                      </button>
                      <button
                        onClick={() => setEditingId(provider.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-destructive hover:border-destructive/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={`mt-4 rounded-lg border p-3 text-sm ${
                      testResult.success
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span>
                        {testResult.success ? "Connected successfully" : testResult.error}
                      </span>
                      {testResult.success && testResult.models && testResult.models.length > 0 && (
                        <span className="text-muted-foreground">
                          ({testResult.models.length} models)
                        </span>
                      )}
                    </div>
                    {testResult.success && testResult.models && testResult.models.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {testResult.models.slice(0, 6).map((model) => (
                          <span
                            key={model}
                            className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-300"
                          >
                            {model}
                          </span>
                        ))}
                        {testResult.models.length > 6 && (
                          <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-300">
                            +{testResult.models.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {providers.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-1 font-medium text-foreground">No providers configured</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add your first AI provider to get started
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Provider
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
              <h3 className="mb-4 text-lg font-semibold text-foreground">Add Provider</h3>
              <ProviderForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProviderIcon({ type }: { type: ProviderType }) {
  if (type === "openai") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" />
      </svg>
    );
  }
  if (type === "anthropic") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M17.304 3.541l-5.296 9.369H6.524l5.296-9.369h5.484zM6.96 13.378l5.152 2.684 5.288-2.684h-3.312L12.112 21l-5.152-7.622h3.312z" />
      </svg>
    );
  }
  if (type === "ollama") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    );
  }
  if (type === "azure") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M5.5 3.5l13.5 17L5.5 3.5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6v6H9z" />
    </svg>
  );
}
