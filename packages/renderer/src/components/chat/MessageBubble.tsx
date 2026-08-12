import React from "react";
import type { Message, MessageBlock } from "@/types";

export interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-bubble-${message.id}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
              ? "bg-muted text-muted-foreground"
              : "bg-secondary text-secondary-foreground"
        }`}
      >
        {message.blocks.map((block: MessageBlock) => (
          <div key={block.id}>
            {block.type === "text" && <p className="whitespace-pre-wrap text-sm">{block.content}</p>}
            {block.type === "tool" && (
              <pre className="mt-2 rounded-md bg-black/20 p-2 text-xs overflow-x-auto">
                {block.content}
              </pre>
            )}
            {block.type === "error" && (
              <p className="text-destructive text-sm">{block.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
