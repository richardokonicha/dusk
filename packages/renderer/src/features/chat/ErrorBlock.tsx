import { useState, useCallback } from "react";
import { AlertTriangle, RotateCcw, ChevronDown, ChevronRight, Copy, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBlockProps {
  content: string;
  onRetry?: () => void;
}

export function ErrorBlock({ content, onRetry }: ErrorBlockProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  }, [content]);

  const handleReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        `Error Report:\n\n${content}\n\nTimestamp: ${new Date().toISOString()}\nContext: Chat conversation`
      );
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch {
      // Silently fail
    }
  }, [content]);

  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
      <AlertTriangle size={16} className="shrink-0 text-destructive mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-destructive-foreground break-words">{content}</p>

        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
          >
            {showDetails ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {showDetails ? "Hide details" : "Show details"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </Button>

          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              <RotateCcw size={12} className="mr-1" />
              Retry
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReport}
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
          >
            <Send size={12} className="mr-1" />
            {feedbackSent ? "Copied to clipboard" : "Report"}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-2">
            <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap break-words text-destructive-foreground/80">
              {content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
