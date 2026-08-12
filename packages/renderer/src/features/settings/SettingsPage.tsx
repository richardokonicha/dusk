import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plus, ArrowLeft, Menu, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { ProvidersSettings } from "./ProvidersSettings";
import { AgentsSettings } from "./AgentsSettings";
import { ThemeSettings } from "./ThemeSettings";
import { GeneralSettings } from "./GeneralSettings";
import type { SettingsTab } from "@shared/types";

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "providers", label: "Providers", icon: <Settings className="h-4 w-4" /> },
  { id: "agents", label: "Agents", icon: <Settings className="h-4 w-4" /> },
  { id: "theme", label: "Theme", icon: <Settings className="h-4 w-4" /> },
  { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> }
];

interface SettingsPageProps {
  initialTab?: SettingsTab;
  onBack?: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SettingsPage({ initialTab = "providers", onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSaveStatus("idle");
    setError(null);
  };

  const showSaveIndicator = (status: SaveStatus) => {
    setSaveStatus(status);
    if (status === "saved" || status === "error") {
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background">
      {onBack && (
        <div className="flex items-center border-b border-border px-4 lg:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      )}

      <div className="flex h-full flex-1">
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
          <div className="flex h-14 items-center px-6 border-b border-border">
            <span className="font-semibold text-foreground">Settings</span>
          </div>
          <nav className="flex-1 p-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
            <span className="font-semibold text-foreground">Settings</span>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </header>

          <AnimatePresence>
            {mobileOpen && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-border bg-card px-4 py-2 md:hidden"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>

          <main className="flex-1 overflow-auto">
            <div className="flex items-center justify-between px-6 pt-6">
              <div />
              <AnimatePresence mode="wait">
                {saveStatus !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                      saveStatus === "saving"
                        ? "bg-muted text-muted-foreground"
                        : saveStatus === "saved"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {saveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {saveStatus === "saved" && <Check className="h-3 w-3" />}
                    {saveStatus === "error" && <AlertCircle className="h-3 w-3" />}
                    {saveStatus === "saving" && "Saving..."}
                    {saveStatus === "saved" && "Saved"}
                    {saveStatus === "error" && "Error saving"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {activeTab === "providers" && (
                <ProvidersSettings onSaveStatusChange={showSaveIndicator} />
              )}
              {activeTab === "agents" && (
                <AgentsSettings onSaveStatusChange={showSaveIndicator} />
              )}
              {activeTab === "theme" && (
                <ThemeSettings onSaveStatusChange={showSaveIndicator} />
              )}
              {activeTab === "general" && (
                <GeneralSettings onSaveStatusChange={showSaveIndicator} />
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
