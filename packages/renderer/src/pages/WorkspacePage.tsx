import { useParams } from "react-router-dom";
import { useState } from "react";
import { WorkspaceView } from "../features/workspace/WorkspaceView";
import { ConversationItem } from "../features/conversation/ConversationItem";
import { useWorkspace } from "../hooks/use-workspace";
import { useConversations } from "../hooks/use-conversations";
import type { Conversation } from "../types";

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const workspace = useWorkspace();
  const conversations = useConversations(workspaceId || null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const workspaceData = workspace.workspaces.find((w) => w.id === workspaceId) || workspace.currentWorkspace;

  const handleCreateConversation = async () => {
    const newConv = await conversations.createConversation();
    if (newConv) {
      setSelectedConversation(newConv);
    }
  };

  const handleDeleteConversation = (id: string) => {
    conversations.deleteConversation(id);
    if (selectedConversation?.id === id) {
      setSelectedConversation(null);
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <button
            onClick={handleCreateConversation}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <span className="text-sm">+ New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : conversations.error ? (
            <div className="text-center py-6 px-3">
              <p className="text-xs text-destructive">{conversations.error}</p>
              <button
                onClick={() => conversations.createConversation()}
                className="text-xs text-primary hover:underline mt-2"
              >
                Retry
              </button>
            </div>
          ) : conversations.conversations.length === 0 ? (
            <div className="text-center py-8 px-3">
              <p className="text-xs text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Click "+ New Chat" to start</p>
            </div>
          ) : (
            conversations.conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={selectedConversation?.id === conv.id}
                onClick={() => setSelectedConversation(conv)}
                onDelete={() => handleDeleteConversation(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {workspaceData && (
          <div className="border-b border-border px-6 py-3 flex items-center justify-between">
            <h2 className="font-semibold">{workspaceData.name}</h2>
          </div>
        )}
        <WorkspaceView
          workspace={workspaceData}
          onCreateConversation={handleCreateConversation}
          onSelectConversation={(id) => {
            const conv = conversations.conversations.find((c) => c.id === id);
            if (conv) setSelectedConversation(conv);
          }}
        />
      </div>
    </div>
  );
}
