import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Rocket, Monitor, BarChart3, Globe, Save } from "lucide-react";
import type { GeneralSettings as GeneralSettingsType } from "@shared/types";

interface GeneralSettingsProps {
  settings?: GeneralSettingsType;
  onUpdateGeneral?: (general: Partial<GeneralSettingsType>) => Promise<GeneralSettingsType>;
  onSaveStatusChange?: (status: "idle" | "saving" | "saved" | "error") => void;
}

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "pt", label: "Portuguese" }
];

export function GeneralSettings({ settings: propSettings, onUpdateGeneral, onSaveStatusChange }: GeneralSettingsProps) {
  const [settings, setSettings] = useState<GeneralSettingsType>({
    autoLaunch: propSettings?.autoLaunch ?? false,
    minimizeToTray: propSettings?.minimizeToTray ?? true,
    notificationsEnabled: propSettings?.notificationsEnabled ?? true,
    telemetryEnabled: propSettings?.telemetryEnabled ?? false
  });
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (partial: Partial<GeneralSettingsType>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    onSaveStatusChange?.("saving");
    setSaving(true);
    try {
      if (onUpdateGeneral) {
        await onUpdateGeneral(updated);
      } else {
        await window.dusk.ipc.invoke("settings:set", { key: "general", value: updated });
      }
      onSaveStatusChange?.("saved");
    } catch {
      onSaveStatusChange?.("error");
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    onSaveStatusChange?.("saving");
    setSaving(true);
    try {
        await window.dusk.ipc.invoke("settings:set", { key: "general.language", value: lang });
      onSaveStatusChange?.("saved");
    } catch {
      onSaveStatusChange?.("error");
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? "bg-primary" : "bg-secondary"
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 2 }}
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">General</h2>
        <p className="mt-1 text-muted-foreground">
          Manage application behavior and preferences
        </p>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Launch at startup</div>
                <div className="text-xs text-muted-foreground">Automatically start Dusk when you log in</div>
              </div>
            </div>
            <Toggle
              enabled={settings.autoLaunch}
              onToggle={() => handleUpdate({ autoLaunch: !settings.autoLaunch })}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Minimize to tray</div>
                <div className="text-xs text-muted-foreground">Keep Dusk running in the background when closed</div>
              </div>
            </div>
            <Toggle
              enabled={settings.minimizeToTray}
              onToggle={() => handleUpdate({ minimizeToTray: !settings.minimizeToTray })}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Notifications</div>
                <div className="text-xs text-muted-foreground">Show desktop notifications</div>
              </div>
            </div>
            <Toggle
              enabled={settings.notificationsEnabled}
              onToggle={() => handleUpdate({ notificationsEnabled: !settings.notificationsEnabled })}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Language</div>
                <div className="text-xs text-muted-foreground">Select your preferred language</div>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Telemetry</div>
                <div className="text-xs text-muted-foreground">Help improve Dusk by sending anonymous usage data</div>
              </div>
            </div>
            <Toggle
              enabled={settings.telemetryEnabled}
              onToggle={() => handleUpdate({ telemetryEnabled: !settings.telemetryEnabled })}
            />
          </div>
        </section>

        {saving && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            <Save className="h-4 w-4 animate-pulse" />
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
}
