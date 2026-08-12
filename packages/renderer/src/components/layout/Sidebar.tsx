import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { WorkspaceList } from "../../features/workspace/WorkspaceList";
import { ConversationList } from "../../features/conversation/ConversationList";

export interface SidebarProps {
  workspaces: import("../../types").Workspace[];
  currentWorkspace: import("../../types").Workspace | null;
  onSelectWorkspace: (workspace: import("../../types").Workspace) => void;
  onCreateWorkspace: (name: string, description?: string) => Promise<import("../../types").Workspace>;
  onDeleteWorkspace: (id: string) => Promise<void>;
  conversations: import("../../types").Conversation[];
  currentConversation: import("../../types").Conversation | null;
  onSelectConversation: (conversation: import("../../types").Conversation) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  conversations,
  currentConversation,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
}: SidebarProps & { isOpen: boolean; onToggle: () => void }) {
  return (
    <>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col border-r border-border bg-card overflow-hidden"
          >
            <div className="flex h-14 items-center justify-between px-4 border-b border-border">
              <span className="font-semibold text-lg tracking-tight">Dusk</span>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
              <WorkspaceList
                workspaces={workspaces}
                currentWorkspace={currentWorkspace}
                onSelect={onSelectWorkspace}
                onCreate={onCreateWorkspace}
                onDelete={onDeleteWorkspace}
                isLoading={false}
              />

              {currentWorkspace && (
                <ConversationList
                  conversations={conversations}
                  currentConversation={currentConversation}
                  onSelect={onSelectConversation}
                  onCreate={onCreateConversation}
                  onDelete={onDeleteConversation}
                />
              )}
            </div>

            <div className="p-2 border-t border-border">
              <nav className="space-y-1">
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                  <LayoutDashboard size={18} />
                  Dashboard
                </button>
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Settings size={18} />
                  Settings
                </button>
              </nav>
              <button
                onClick={onToggle}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-2"
              >
                <PanelLeftClose size={18} />
                Collapse
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 48 }}
          className="flex flex-col border-r border-border bg-card items-center py-3"
        >
          <button
            onClick={onToggle}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <PanelLeftOpen size={18} />
          </button>
        </motion.div>
      )}
    </>
  );
}
