import { useState } from "react";
import { motion } from "framer-motion";
import { useSettings } from "../hooks/use-settings";
import { useProviders } from "../hooks/use-providers";
import { ThemePreview } from "../components/settings/ThemePreview";
import { cn } from "../lib/utils";

type ThemeMode = "light" | "dark" | "system";

const THEME_MODES: { value: ThemeMode; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Use light theme" },
  { value: "dark", label: "Dark", description: "Use dark theme" },
  { value: "system", label: "System", description: "Follow system preference" },
];

const PROVIDER_TYPES = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama" },
  { value: "custom", label: "Custom" },
] as const;

export function SettingsPage() {
  const { settings, updateTheme } = useSettings();
  const { providers, isLoading, error, addProvider, removeProvider, testProvider } = useProviders();
  const [activeTab, setActiveTab] = useState<string>("general");
  const [providerForm, setProviderForm] = useState({
    name: "",
    type: "openai" as "openai" | "anthropic" | "gemini" | "ollama" | "custom",
    apiKey: "",
    baseUrl: "",
  });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentMode = settings?.theme?.mode ?? "system";
  const currentAccent = settings?.theme?.accentColor ?? "#8b5cf6";
  const currentFontSize = settings?.theme?.fontSize ?? "medium";
  const reducedMotion = settings?.theme?.reducedMotion ?? false;

  const handleThemeChange = async (mode: ThemeMode) => {
    await updateTheme({ mode });
  };

  const handleAccentChange = async (accentColor: string) => {
    await updateTheme({ accentColor });
  };

  const handleFontSizeChange = async (fontSize: "small" | "medium" | "large") => {
    await updateTheme({ fontSize });
  };

  const handleReducedMotionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateTheme({ reducedMotion: e.target.checked });
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerForm.name) return;
    await addProvider({
      name: providerForm.name,
      type: providerForm.type,
      apiKey: providerForm.apiKey || undefined,
      baseUrl: providerForm.baseUrl || undefined,
    });
    setProviderForm({ name: "", type: "openai", apiKey: "", baseUrl: "" });
  };

  const handleTestProvider = async (id: string) => {
    setTestingId(id);
    await testProvider(id);
    setTestingId(null);
  };

  const handleDeleteProvider = async (id: string) => {
    setDeletingId(id);
    await removeProvider(id);
    setDeletingId(null);
  };

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-56 border-r border-border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Settings
        </h2>
        <nav className="space-y-1">
          {["General", "Appearance", "Models", "API Keys", "Advanced"].map(
            (item, i) => (
              <button
                key={item}
                onClick={() => setActiveTab(item.toLowerCase())}
                className={cn(
                  "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                  activeTab === item.toLowerCase()
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                {item}
              </button>
            )
          )}
        </nav>
      </div>

      <div className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          {activeTab === "general" && (
            <>
              <h1 className="text-2xl font-bold mb-6">General Settings</h1>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Application Name</label>
                  <input
                    type="text"
                    defaultValue="Dusk"
                    className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <select
                    value={currentMode}
                    onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
                    className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {THEME_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <select className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">Auto-save conversations</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically save your conversations as you type
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">Send on Enter</p>
                    <p className="text-xs text-muted-foreground">
                      Send messages when pressing Enter instead of Shift+Enter
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
              </div>
            </>
          )}

          {activeTab === "appearance" && (
            <>
              <h1 className="text-2xl font-bold mb-6">Appearance</h1>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Theme Mode</label>
                  <div className="grid grid-cols-3 gap-3">
                    {THEME_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => handleThemeChange(mode.value)}
                        className={cn(
                          "rounded-lg border-2 p-4 text-left transition-colors",
                          currentMode === mode.value
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50"
                        )}
                      >
                        <div className="font-medium text-sm">{mode.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {mode.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <ThemePreview
                  mode={currentMode}
                  accentColor={currentAccent}
                  fontSize={currentFontSize}
                />

                <div className="space-y-3">
                  <label className="text-sm font-medium">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentAccent}
                      onChange={(e) => handleAccentChange(e.target.value)}
                      className="h-10 w-16 rounded-md border border-border bg-background p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {currentAccent}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Font Size</label>
                  <div className="flex items-center gap-3">
                    {(["small", "medium", "large"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        className={cn(
                          "rounded-lg border-2 px-4 py-2 text-sm transition-colors capitalize",
                          currentFontSize === size
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">Reduced Motion</p>
                    <p className="text-xs text-muted-foreground">
                      Minimize animations throughout the interface
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={handleReducedMotionChange}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "models" && (
            <>
              <h1 className="text-2xl font-bold mb-6">Models & Providers</h1>
              <div className="space-y-6">
                <form onSubmit={handleAddProvider} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Provider Name</label>
                      <input
                        type="text"
                        value={providerForm.name}
                        onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="My Provider"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <select
                        value={providerForm.type}
                        onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value as typeof providerForm.type })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {PROVIDER_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">API Key</label>
                      <input
                        type="password"
                        value={providerForm.apiKey}
                        onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="sk-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Base URL</label>
                      <input
                        type="text"
                        value={providerForm.baseUrl}
                        onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Add Provider
                  </button>
                </form>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Configured Providers
                  </h3>
                  {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {!isLoading && providers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No providers configured yet.</p>
                  )}
                  <div className="space-y-2">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {provider.type} {provider.enabled ? "• Enabled" : "• Disabled"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestProvider(provider.id)}
                            disabled={testingId === provider.id}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                          >
                            {testingId === provider.id ? "Testing..." : "Test"}
                          </button>
                          {deletingId === provider.id ? (
                            <span className="text-xs text-muted-foreground">Deleting...</span>
                          ) : (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete provider "${provider.name}"?`)) {
                                  handleDeleteProvider(provider.id);
                                }
                              }}
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
