import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, ExternalLink, Loader2 } from "lucide-react";
import type { ProviderType } from "@shared/types";

const providerTypes: { value: ProviderType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "openai",
    label: "OpenAI",
    description: "GPT-4o, GPT-4, GPT-3.5 and more",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" /></svg>
  },
  {
    value: "anthropic",
    label: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3 Opus",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M17.304 3.541l-5.296 9.369H6.524l5.296-9.369h5.484zM6.96 13.378l5.152 2.684 5.288-2.684h-3.312L12.112 21l-5.152-7.622h3.312z" /></svg>
  },
  {
    value: "ollama",
    label: "Ollama",
    description: "Run models locally on your machine",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
  },
  {
    value: "azure",
    label: "Azure OpenAI",
    description: "Enterprise-grade OpenAI models on Azure",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M5.5 3.5l13.5 17L5.5 3.5z" /></svg>
  },
  {
    value: "custom",
    label: "Custom",
    description: "OpenAI-compatible API endpoint",
    icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" /></svg>
  }
];

const defaultBaseUrls: Record<ProviderType, string> = {
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
  ollama: "http://localhost:11434",
  azure: "https://your-resource.openai.azure.com",
  custom: "https://api.example.com"
};

interface ProviderSetupProps {
  onNext: () => void;
  onBack?: () => void;
}

export function ProviderSetup({ onNext, onBack }: ProviderSetupProps) {
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null);
  const [providerName, setProviderName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; models?: string[]; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleTypeSelect = (type: ProviderType) => {
    setSelectedType(type);
    setProviderName(providerTypes.find((p) => p.value === type)?.label ?? "");
    setBaseUrl(defaultBaseUrls[type]);
    setTestResult(null);
    setError("");
  };

  const handleTest = async () => {
    if (!selectedType || !apiKey || !baseUrl) return;
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const result = await window.dusk.ipc.invoke<{ success: boolean; models?: string[]; error?: string }>("provider:testConnection", {
        type: selectedType,
        baseUrl,
        apiKey
      });
      setTestResult(result);
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedType || !providerName || !apiKey) return;
    setSaving(true);
    setError("");
    try {
      await window.dusk.ipc.invoke("provider:add", {
        name: providerName,
        type: selectedType,
        apiKey,
        baseUrl,
        models: testResult?.models ?? []
      });
      onNext();
    } catch {
      setError("Failed to save provider");
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Connect a provider</h2>
        <p className="text-muted-foreground">
          Choose your AI provider to get started. You can add more later in settings.
        </p>
      </motion.div>

      {!selectedType ? (
        <div className="grid gap-3">
          {providerTypes.map((type) => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleTypeSelect(type.value)}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-card/80"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {type.icon}
              </div>
              <div>
                <div className="font-medium text-foreground">{type.label}</div>
                <div className="text-sm text-muted-foreground">{type.description}</div>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {providerTypes.find((p) => p.value === selectedType)?.icon}
            </div>
            <div>
              <div className="font-medium text-foreground">
                {providerTypes.find((p) => p.value === selectedType)?.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {providerTypes.find((p) => p.value === selectedType)?.description}
              </div>
            </div>
            <button
              onClick={() => { setSelectedType(null); setTestResult(null); setError(""); }}
              className="ml-auto text-sm text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Provider name
              </label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="My OpenAI Provider"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                API base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                API key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTest}
                disabled={!apiKey || !baseUrl || testing}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test connection"
                )}
              </motion.button>
              {selectedType === "openai" && (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  Get API key <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border p-3 text-sm ${
                  testResult.success
                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  <span>
                    {testResult.success ? "Connected successfully" : testResult.error}
                  </span>
                  {testResult.success && testResult.models && testResult.models.length > 0 && (
                    <span className="text-muted-foreground">
                      ({testResult.models.length} models found)
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4">
            {onBack && (
              <button
                onClick={() => { setSelectedType(null); setTestResult(null); setError(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={!providerName || !apiKey || !testResult?.success || saving}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
