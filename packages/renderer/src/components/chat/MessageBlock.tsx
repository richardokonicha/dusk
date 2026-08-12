import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { ArtifactBlock } from "../chat/ArtifactBlock";
import type { MessageBlock as MessageBlockType } from "../../types";

interface MessageBlockProps {
  block: MessageBlockType;
}

export function MessageBlock({ block }: MessageBlockProps) {
  switch (block.type) {
    case "text":
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {block.content}
        </p>
      );
    case "tool":
      return <ToolResultBlock content={block.content} />;
    case "error":
      return <ErrorBlock content={block.content} />;
    case "artifact":
      return <ArtifactBlock content={block.content} metadata={block.metadata} />;
    default:
      return null;
  }
}

function ToolResultBlock({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return (
      <div className="rounded-md border border-border bg-background/50 p-3">
        <pre className="text-xs overflow-auto max-h-48">{content}</pre>
      </div>
    );
  }

  const statusIcon =
    data.status === "success" ? (
      <CheckCircle2 size={14} className="text-green-500" />
    ) : (
      <XCircle size={14} className="text-red-500" />
    );

  return (
    <div className="rounded-md border border-border bg-background/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {statusIcon}
        <span className="text-xs font-medium">{String(data.name || "Tool")}</span>
        {data.durationMs !== undefined && (
          <span className="ml-auto text-xs text-muted-foreground">
            {String(data.durationMs)}ms
          </span>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 py-2 space-y-2">
              {data.input ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                  <pre className="text-xs overflow-auto max-h-32 rounded bg-background p-2">
                    {JSON.stringify(data.input, null, 2) as string}
                  </pre>
                </div>
              ) : null}
              {data.output ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                  <pre className="text-xs overflow-auto max-h-32 rounded bg-background p-2">
                    {JSON.stringify(data.output, null, 2) as string}
                  </pre>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { AlertTriangle } from "lucide-react";

function ErrorBlock({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
      <AlertTriangle size={16} className="shrink-0 text-destructive mt-0.5" />
      <p className="text-sm text-destructive-foreground break-words">{content}</p>
    </div>
  );
}
