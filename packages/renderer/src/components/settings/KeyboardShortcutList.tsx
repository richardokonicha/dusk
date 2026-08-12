import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";

const shortcuts = [
  { key: "⌘N", description: "Create new task" },
  { key: "⌘/", description: "Toggle command palette" },
  { key: "⌘K", description: "Quick search" },
  { key: "⌘B", description: "Toggle sidebar" },
  { key: "⌘,", description: "Open settings" },
  { key: "⌘W", description: "Close current tab" },
  { key: "⌘⇧N", description: "New workspace" },
  { key: "⌘⇧P", description: "Switch project" }
];

interface KeyboardShortcutListProps {
  onClose?: () => void;
}

export function KeyboardShortcutList({ onClose }: KeyboardShortcutListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Keyboard className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
      </div>
      <div className="grid gap-3">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.key}
            className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-2.5"
          >
            <span className="text-sm text-foreground">{shortcut.description}</span>
            <kbd className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-mono text-muted-foreground">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
