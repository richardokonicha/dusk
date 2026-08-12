import { useState } from "react";
import { useRoutes } from "react-router-dom";
import { router } from "./routes";
import { useWorkspace } from "./hooks/use-workspace";
import { useConversations } from "./hooks/use-conversations";
import { useTheme } from "./hooks/use-theme";
import { useOnboarding } from "./hooks/use-onboarding";
import { ThemeProvider } from "./components/theme-provider";
import { AppShell } from "./components/layout/AppShell";
import { AgentActivity } from "./components/agents/AgentActivity";
import { Panel } from "./components/layout/Panel";
import { Onboarding } from "./features/welcome/Onboarding";

const mockAgents = [
  {
    id: "agent-1",
    name: "Assistant",
    status: "idle" as const,
    lastActivity: new Date().toISOString(),
  },
  {
    id: "agent-2",
    name: "Coder",
    status: "working" as const,
    lastActivity: new Date().toISOString(),
  },
];

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const workspace = useWorkspace();
  const conversations = useConversations(workspace.currentWorkspace?.id || null);
  const { resolvedTheme } = useTheme();
  const onboarding = useOnboarding();

  const element = useRoutes(router.routes);

  if (onboarding.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Starting Dusk...</p>
        </div>
      </div>
    );
  }

  const needsOnboarding = onboarding.isFirstRun && !onboarding.status?.completed && !onboarding.status?.skipped;

  if (needsOnboarding) {
    return (
      <Onboarding
        onComplete={() => onboarding.complete()}
        onSkip={() => onboarding.skip()}
      />
    );
  }

  const handleSelectWorkspace = async (ws: { id: string }) => {
    await workspace.switchWorkspace(ws.id);
    setSelectedConversationId(null);
  };

  const handleSelectConversation = (conversation: { id: string }) => {
    setSelectedConversationId(conversation.id);
  };

  const handleCreateConversation = () => {
    conversations.createConversation("New Conversation").then((conversation) => {
      if (conversation) {
        setSelectedConversationId(conversation.id);
      }
    });
  };

  const rightPanel = (
    <Panel title="Agents">
      <AgentActivity agents={mockAgents} />
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Info
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model</span>
            <span className="font-medium">GPT-4o</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tokens</span>
            <span className="font-medium">1,234</span>
          </div>
        </div>
      </div>
    </Panel>
  );

  const currentConversation = conversations.conversations.find((c) => c.id === selectedConversationId) || null;

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      sidebar={{
        workspaces: workspace.workspaces,
        currentWorkspace: workspace.currentWorkspace,
        onSelectWorkspace: handleSelectWorkspace,
        onCreateWorkspace: workspace.createWorkspace,
        onDeleteWorkspace: workspace.deleteWorkspace,
        conversations: conversations.conversations,
        currentConversation,
        onSelectConversation: handleSelectConversation,
        onCreateConversation: handleCreateConversation,
        onDeleteConversation: (id) => conversations.deleteConversation(id),
      }}
      rightPanel={rightPanel}
    >
      {element || (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="dusk-theme">
      <AppContent />
    </ThemeProvider>
  );
}
