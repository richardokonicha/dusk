import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor, Type, Zap, RefreshCw, Check } from "lucide-react";
import type { ThemeSettings as ThemeSettingsType } from "@shared/types";

interface ThemeSettingsProps {
  settings?: ThemeSettingsType;
  onUpdateTheme?: (theme: ThemeSettingsType) => Promise<ThemeSettingsType>;
  onSaveStatusChange?: (status: "idle" | "saving" | "saved" | "error") => void;
}

const accentColors = [
  { name: "Emerald", value: "#22c55e" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Slate", value: "#64748b" }
];

const fontSizes = [
  { value: "small", label: "Small", className: "text-xs" },
  { value: "medium", label: "Medium", className: "text-sm" },
  { value: "large", label: "Large", className: "text-base" }
] as const;

const defaultSettings: ThemeSettingsType = {
  mode: "dark",
  accentColor: "#22c55e",
  fontSize: "medium",
  reducedMotion: false
};

export function ThemeSettings({ settings: propSettings, onUpdateTheme, onSaveStatusChange }: ThemeSettingsProps) {
  const [settings, setSettings] = useState<ThemeSettingsType>({
    mode: propSettings?.mode ?? "dark",
    accentColor: propSettings?.accentColor ?? "#22c55e",
    fontSize: propSettings?.fontSize ?? "medium",
    reducedMotion: propSettings?.reducedMotion ?? false
  });
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (partial: Partial<ThemeSettingsType>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    onSaveStatusChange?.("saving");
    setSaving(true);
    try {
      if (onUpdateTheme) {
        await onUpdateTheme(updated);
      } else {
        await window.dusk.ipc.invoke("settings:set", { key: "theme", value: updated });
      }
      onSaveStatusChange?.("saved");
    } catch {
      onSaveStatusChange?.("error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await handleUpdate(defaultSettings);
  };

  const currentFontSize = fontSizes.find((s) => s.value === settings.fontSize);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Theme</h2>
          <p className="mt-1 text-muted-foreground">
            Customize the look and feel of Dusk
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Appearance</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "light", label: "Light", icon: <Sun className="h-5 w-5" /> },
                { value: "dark", label: "Dark", icon: <Moon className="h-5 w-5" /> },
                { value: "system", label: "System", icon: <Monitor className="h-5 w-5" /> },
                { value: "high-contrast", label: "High contrast", icon: <Zap className="h-5 w-5" /> }
              ].map((mode) => (
                <motion.button
                  key={mode.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleUpdate({ mode: mode.value as ThemeSettingsType["mode"] })}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                    settings.mode === mode.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={settings.mode === mode.value ? "text-primary" : "text-muted-foreground"}>
                    {mode.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground">{mode.label}</span>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Accent color</h3>
            <div className="flex flex-wrap gap-3">
              {accentColors.map((color) => (
                <motion.button
                  key={color.value}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleUpdate({ accentColor: color.value })}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                    settings.accentColor === color.value
                      ? "ring-2 ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {settings.accentColor === color.value && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </motion.button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Typography</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Font size</span>
                </div>
                <div className="flex items-center gap-2">
                  {fontSizes.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => handleUpdate({ fontSize: size.value })}
                      className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                        settings.fontSize === size.value
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-foreground hover:bg-accent"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-foreground">Reduced motion</div>
                  <div className="text-xs text-muted-foreground">Minimize animations</div>
                </div>
              </div>
              <button
                onClick={() => handleUpdate({ reducedMotion: !settings.reducedMotion })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.reducedMotion ? "bg-primary" : "bg-secondary"
                }`}
              >
                <motion.div
                  animate={{ x: settings.reducedMotion ? 20 : 2 }}
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                />
              </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Preview</h3>
            <div
              className="rounded-lg border border-border p-4 transition-all"
              style={{ backgroundColor: "var(--bg)", color: "var(--fg)" }}
            >
              <div className={`mb-2 font-semibold ${currentFontSize?.className ?? "text-sm"}`}>
                Preview Text
              </div>
              <div className={`text-muted-foreground ${currentFontSize?.className ?? "text-sm"}`}>
                This is how your text will look with the current settings.
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: settings.accentColor }}
                />
                <span className={`font-medium ${currentFontSize?.className ?? "text-sm"}`}>
                  Accent color
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-full border-2"
                  style={{ borderColor: settings.accentColor }}
                />
                <span className={`text-muted-foreground ${currentFontSize?.className ?? "text-sm"}`}>
                  {settings.mode}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
