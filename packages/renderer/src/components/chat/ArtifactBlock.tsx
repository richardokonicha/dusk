import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileCode, Copy, Check, Maximize2, X } from "lucide-react";

interface ArtifactBlockProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export function ArtifactBlock({ content, metadata }: ArtifactBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const artifactType = (metadata?.type as string) || "text";
  const language = (metadata?.language as string) || "plaintext";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-md border border-border bg-background/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium">{artifactType}</span>
          {language && (
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copyToClipboard}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {isExpanded ? <X size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div className={`relative ${isExpanded ? "max-h-96" : "max-h-48"} overflow-auto`}>
        <pre className="text-xs p-3 whitespace-pre-wrap break-words">{content}</pre>
      </div>
    </div>
  );
}
