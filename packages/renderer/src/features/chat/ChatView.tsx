import { useEffect, useCallback } from "react";
import type { ChatState } from "@/types";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RotateCcw, X, MessageSquarePlus } from "lucide-react";

interface ChatViewProps {
  state: ChatState;
  conversationId: string | null;
  onSend: (content: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onClearError: () => void;
  messagesEndRef: React.Ref<HTMLDivElement>;
}

export function ChatView({
  state,
  conversationId,
  onSend,
  onStop,
  onRetry,
  onClearError,
  messagesEndRef,
}: ChatViewProps) {
  const scrollToTop = useCallback(() => {
    const ref = messagesEndRef as React.RefObject<HTMLDivElement | null>;
    const container = ref.current?.parentElement;
    container?.scrollTo({ top: 0, behavior: "smooth" });
  }, [messagesEndRef]);

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquarePlus size={40} className="text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a conversation or start a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-6 py-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Conversation
        </h2>
        <div className="flex items-center gap-2">
          {state.isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Streaming
            </span>
          )}
          {state.messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="h-7 text-xs"
            >
              Top
            </Button>
          )}
        </div>
      </div>

      {state.error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-2 flex items-center justify-between gap-3">
          <p className="text-sm text-destructive flex-1">{state.error}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-7 text-xs text-destructive hover:text-destructive"
            >
              <RotateCcw size={12} className="mr-1" />
              Retry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearError}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <X size={12} />
            </Button>
          </div>
        </div>
      )}

      {state.isLoading && state.messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-3xl space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                {i % 2 === 0 ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary" />
                )}
                <div className={`rounded-2xl px-4 py-3 space-y-2 ${i % 2 === 0 ? "rounded-tr-sm bg-primary/20" : "rounded-tl-sm border border-border bg-card"}`}>
                  <div className="space-y-1.5">
                    <div className="h-3 bg-muted rounded animate-pulse w-32" />
                    <div className="h-3 bg-muted rounded animate-pulse w-48" />
                    <div className="h-3 bg-muted rounded animate-pulse w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <MessageList
          messages={state.messages}
          isStreaming={state.isStreaming}
          streamingText={state.streamingText}
          messagesEndRef={messagesEndRef}
          isLoading={state.isLoading}
          onRetry={onRetry}
          onStop={onStop}
        />
      )}

      <MessageInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={state.isStreaming}
      />
    </div>
  );
}
