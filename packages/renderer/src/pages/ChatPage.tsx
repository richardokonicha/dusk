import { useParams } from "react-router-dom";
import { ConversationHeader } from "../features/conversation/ConversationHeader";
import { ChatView } from "../features/chat/ChatView";
import { useChat } from "../hooks/use-chat";
import { Button } from "@/components/ui/button";
import { RotateCcw, MessageSquarePlus } from "lucide-react";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const chat = useChat((conversationId || null) as string | null);

  if (chat.isLoading && chat.messages.length === 0 && conversationId) {
    return (
      <div className="flex h-full flex-col">
        <ConversationHeader
          title="Conversation"
          onDelete={() => {}}
          onShare={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-current border-r-transparent text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chat.error && chat.messages.length === 0 && conversationId) {
    return (
      <div className="flex h-full flex-col">
        <ConversationHeader
          title="Conversation"
          onDelete={() => {}}
          onShare={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-sm text-destructive mb-4">{chat.error}</p>
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={chat.retryLastMessage}
                variant="outline"
                size="sm"
              >
                <RotateCcw size={14} className="mr-1" />
                Retry
              </Button>
              <Button
                onClick={chat.clearError}
                variant="ghost"
                size="sm"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (conversationId && chat.messages.length === 0 && !chat.isLoading && !chat.error) {
    return (
      <div className="flex h-full flex-col">
        <ConversationHeader
          title="Conversation"
          onDelete={() => {}}
          onShare={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquarePlus size={40} className="text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              Type a message below to start the conversation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ConversationHeader
        title="Conversation"
        onDelete={() => {}}
        onShare={() => {}}
      />
      <ChatView
        state={{
          messages: chat.messages,
          isStreaming: chat.isStreaming,
          streamingText: chat.streamingText,
          error: chat.error,
          isLoading: chat.isLoading,
        }}
        conversationId={conversationId || null}
        onSend={chat.sendMessage}
        onStop={chat.stopStreaming}
        onRetry={chat.retryLastMessage}
        onClearError={chat.clearError}
        messagesEndRef={chat.messagesEndRef}
      />
    </div>
  );
}
