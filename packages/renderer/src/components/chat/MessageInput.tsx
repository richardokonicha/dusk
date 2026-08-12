import React, { useState, useRef, useEffect } from "react";

export interface MessageInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || isStreaming) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="min-h-[40px] max-h-[200px] flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        data-testid="message-input"
      />
      {isStreaming ? (
        <button
          onClick={onStop}
          className="h-10 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
          data-testid="stop-button"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          data-testid="send-button"
        >
          Send
        </button>
      )}
    </div>
  );
}
