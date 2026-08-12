import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import type { Provider, ProviderType } from "@shared/types";

interface ProviderFormProps {
  provider?: Provider;
  onSave: (partial: Omit<Provider, "id" | "createdAt" | "updatedAt">) => void;
  onCancel?: () => void;
}

const providerTypes: { value: ProviderType; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "ollama", label: "Ollama" },
  { value: "azure", label: "Azure OpenAI" },
  { value: "custom", label: "Custom" }
];

const defaultBaseUrls: Record<ProviderType, string> = {
  openai: "https://api.openai.com",
  anthropic: "https://api.anthropic.com",
  ollama: "http://localhost:11434",
  azure: "https://your-resource.openai.azure.com",
  custom: "https://api.example.com"
};

export function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const [name, setName] = useState(provider?.name ?? "");
  const [type, setType] = useState<ProviderType>(provider?.type ?? "openai");
  const [apiKey, setApiKey] = useState(provider?.apiKey ?? "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? defaultBaseUrls[type]);
  const [selectedModel, setSelectedModel] = useState<string>(provider?.models[0] ?? "");
  const [availableModels, setAvailableModels] = useState<string[]>(provider?.models ?? []);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; models?: string[]; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setBaseUrl(defaultBaseUrls[type]);
    setSelectedModel("");
    setAvailableModels([]);
    setTestResult(null);
  }, [type]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Provider name is required";
    if (!baseUrl.trim()) newErrors.baseUrl = "Base URL is required";
    if (!apiKey.trim()) newErrors.apiKey = "API key is required";
    try {
      new URL(baseUrl);
    } catch {
      newErrors.baseUrl = "Please enter a valid URL";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.dusk.ipc.invoke<{ success: boolean; models?: string[]; error?: string }>("provider:testConnection", {
        type,
        baseUrl,
        apiKey
      });
      setTestResult(result);
      if (result.success && result.models) {
        setAvailableModels(result.models);
        if (!selectedModel && result.models.length > 0) {
          setSelectedModel(result.models[0]);
        }
      }
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    onSave({
      name,
      type,
      apiKey,
      baseUrl,
      models: availableModels.length > 0 ? availableModels : testResult?.models ?? provider?.models ?? []
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Provider name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: "" })); }}
          placeholder="My Provider"
          className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${errors.name ? "border-destructive" : "border-border"}`}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Provider type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ProviderType)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {providerTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          API base URL <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => { setBaseUrl(e.target.value); setErrors((prev) => ({ ...prev, baseUrl: "" })); }}
          placeholder="https://api.openai.com"
          className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${errors.baseUrl ? "border-destructive" : "border-border"}`}
        />
        {errors.baseUrl && <p className="mt-1 text-xs text-destructive">{errors.baseUrl}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          API key <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setErrors((prev) => ({ ...prev, apiKey: "" })); }}
            placeholder="sk-..."
            className={`w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${errors.apiKey ? "border-destructive" : "border-border"}`}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.apiKey && <p className="mt-1 text-xs text-destructive">{errors.apiKey}</p>}
      </div>

      {(availableModels.length > 0 || testResult?.models) && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select a model</option>
            {(availableModels.length > 0 ? availableModels : testResult?.models ?? []).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTest}
          disabled={!apiKey || testing}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test connection"
          )}
        </button>
        {type === "openai" && (
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
              <AlertCircle className="h-4 w-4" />
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

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save Provider
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}
