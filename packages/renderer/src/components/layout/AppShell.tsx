import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import type { SidebarProps } from "./Sidebar";

interface AppShellProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  sidebar: SidebarProps;
  children: ReactNode;
  rightPanel?: ReactNode;
}

export function AppShell({
  sidebarOpen,
  onToggleSidebar,
  sidebar,
  children,
  rightPanel,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground antialiased">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={onToggleSidebar}
        {...sidebar}
      />
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
        <AnimatePresence>
          {rightPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              {rightPanel}
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
