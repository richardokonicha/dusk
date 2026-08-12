import { useState, useRef, useEffect, useCallback } from "react";
import { Send, StopCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}

const MAX_LENGTH = 32000;

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  maxLength = MAX_LENGTH,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, [content]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = content.trim();
      if (!trimmed || isStreaming || disabled) return;
      if (trimmed.length > maxLength) return;
      onSend(trimmed);
      setContent("");
    },
    [content, isStreaming, disabled, onSend, maxLength]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const charCount = content.length;
  const isOverLimit = charCount > maxLength;
  const canSend = content.trim().length > 0 && !isStreaming && !disabled && !isOverLimit;

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          <div
            className={cn(
              "flex items-end gap-2 rounded-xl border transition-colors",
              isOverLimit
                ? "border-destructive focus-within:ring-2 focus-within:ring-destructive/50"
                : "border-border focus-within:ring-2 focus-within:ring-ring",
              "bg-card"
            )}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= maxLength + 100) {
                  setContent(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={placeholder}
              disabled={disabled || isStreaming}
              rows={1}
              aria-label="Message input"
              className={cn(
                "flex-1 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none resize-none disabled:opacity-50",
                "min-h-[44px] max-h-[200px]"
              )}
            />
            <div className="pb-3 pr-3 flex items-center gap-1 shrink-0">
              {isStreaming ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onStop}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Stop generating"
                >
                  <StopCircle size={18} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSend}
                  className="h-8 w-8 p-0"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-center text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd> to send,{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Shift+Enter</kbd> for new line
          </p>
          <div className="flex items-center gap-2">
            {isOverLimit && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle size={12} />
                Over limit
              </span>
            )}
            <span
              className={cn(
                "text-xs",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {charCount}/{maxLength.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
