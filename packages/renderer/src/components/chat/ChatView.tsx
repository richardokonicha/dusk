import React from "react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import type { Message, ChatState } from "@/types";

export interface ChatViewProps {
  messages: Message[];
  state: ChatState;
  onSendMessage: (content: string) => void;
  onStopStreaming: () => void;
}

export function ChatView({ messages, state, onSendMessage, onStopStreaming }: ChatViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {state.isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Assistant is typing...</span>
          </div>
        )}
      </div>
      <div className="border-t border-border p-4">
        <MessageInput
          onSend={onSendMessage}
          onStop={onStopStreaming}
          isStreaming={state.isStreaming}
        />
      </div>
    </div>
  );
}
