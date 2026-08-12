import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "./CodeBlock";

interface ToolResultBlockProps {
  content: string;
}

type ToolStatus = "success" | "error" | "running" | "pending";

export function ToolResultBlock({ content }: ToolResultBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  let data: {
    name: string;
    status: ToolStatus;
    input?: unknown;
    output?: unknown;
    durationMs?: number;
    error?: string;
    language?: string;
  };

  try {
    data = JSON.parse(content);
  } catch {
    return (
      <div className="rounded-md border border-border bg-background/50 p-3">
        <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap break-words">{content}</pre>
      </div>
    );
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ input: data.input, output: data.output }, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  }, [data.input, data.output]);

  const statusColor =
    data.status === "success"
      ? "text-green-500"
      : data.status === "error"
        ? "text-red-500"
        : data.status === "running"
          ? "text-yellow-500"
          : "text-muted-foreground";

  const statusIcon =
    data.status === "success" ? (
      <CheckCircle2 size={14} className={statusColor} />
    ) : data.status === "error" ? (
      <XCircle size={14} className={statusColor} />
    ) : (
      <Clock size={14} className={statusColor} />
    );

  const borderColor =
    data.status === "success"
      ? "border-green-500/30"
      : data.status === "error"
        ? "border-red-500/30"
        : "border-border";

  const outputString =
    typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2);
  const inputString =
    typeof data.input === "string" ? data.input : JSON.stringify(data.input, null, 2);

  return (
    <div className={`rounded-md border overflow-hidden ${borderColor} bg-background/50`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {statusIcon}
        <span className="text-xs font-medium">{data.name || "Tool Call"}</span>
        {data.durationMs !== undefined && (
          <span className="ml-auto text-xs text-muted-foreground">
            {data.durationMs}ms
          </span>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 py-2 space-y-2">
              {data.input !== undefined && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Input
                  </p>
                  <CodeBlock code={inputString} language={data.language || "json"} />
                </div>
              )}
              {data.output !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Output
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-6 w-6 p-0"
                    >
                      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    </Button>
                  </div>
                  {data.status === "error" ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
                      <p className="text-xs text-destructive whitespace-pre-wrap break-words">
                        {String(data.error || data.output)}
                      </p>
                    </div>
                  ) : (
                    <CodeBlock code={outputString} language={data.language || "json"} />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
