import { motion } from "framer-motion";
import type { SettingsTab } from "@shared/types";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const tabs: { id: SettingsTab; label: string }[] = [
  { id: "providers", label: "Providers" },
  { id: "agents", label: "Agents" },
  { id: "theme", label: "Theme" },
  { id: "general", label: "General" }
];

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-secondary/50 p-1">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onChange(tab.id)}
          className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-lg bg-background shadow-sm"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative">{tab.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
