import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import type { Message, MessageBlock } from "@/types";
import { ToolResultBlock } from "./ToolResultBlock";
import { ErrorBlock } from "./ErrorBlock";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      data-testid={`message-bubble-${message.id}`}
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      className={cn(
        "rounded-2xl px-4 py-2.5",
        isUser
          ? "rounded-tr-sm bg-primary text-primary-foreground"
          : "rounded-tl-sm border border-border bg-card"
      )}
    >
      <div className="space-y-2">
        {message.blocks.map((block) => (
          <MessageBlock key={block.id} block={block} isUser={isUser} />
        ))}
      </div>
    </motion.div>
  );
}

interface MessageBlockProps {
  block: MessageBlock;
  isUser: boolean;
}

function MessageBlock({ block, isUser }: MessageBlockProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [block.content]);

  switch (block.type) {
    case "text":
      if (isUser) {
        return (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {block.content}
          </p>
        );
      }
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownRenderer content={block.content} />
        </div>
      );
    case "tool":
      return <ToolResultBlock content={block.content} />;
    case "error":
      return <ErrorBlock content={block.content} />;
    case "artifact": {
      const artifact = useMemo(() => {
        try {
          return JSON.parse(block.content);
        } catch {
          return null;
        }
      }, [block.content]);

      const displayContent = artifact?.content || block.content;
      const language = artifact?.language || artifact?.type || "text";

      return (
        <div className="rounded-md border border-border bg-background/50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">
              {artifact?.name || "Artifact"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
                className="h-6 w-6 p-0"
              >
                {showRaw ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </Button>
            </div>
          </div>
          <div className="p-3">
            {showRaw ? (
              <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap break-words">
                {displayContent}
              </pre>
            ) : (
              <MarkdownRenderer content={displayContent} />
            )}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
