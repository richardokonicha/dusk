import { useState, useCallback } from "react";
import {
  FileCode,
  FileText,
  FileJson,
  MoreVertical,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";
import type { ArtifactMetadata, ArtifactType } from "@shared/types/file";
import { FileIcon } from "../FileIcon";

interface ArtifactCardProps {
  artifact: ArtifactMetadata;
  onSelect?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onOpenConversation?: () => void;
}

const typeLabels: Record<ArtifactType, string> = {
  code: "Code",
  text: "Text",
  markdown: "Markdown",
  json: "JSON",
  yaml: "YAML",
  image: "Image",
  audio: "Audio",
  video: "Video",
  data: "Data",
  binary: "Binary",
  archive: "Archive",
  unknown: "Unknown",
};

export function ArtifactCard({ artifact, onSelect, onDelete, onCopy, onOpenConversation }: ArtifactCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(artifact.name);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  }, [artifact.name, onCopy]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPreviewContent = (): string => {
    if (artifact.type === "image") {
      return artifact.filePath;
    }
    return artifact.description || `${typeLabels[artifact.type]} artifact`;
  };

  const isImage = artifact.type === "image";

  return (
    <>
      <div
        onClick={onSelect}
        className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 hover:border-border/80 hover:bg-accent/20 transition-colors cursor-pointer"
      >
        <div className="mt-0.5">
          {isImage ? (
            <div className="w-12 h-12 rounded-md border border-border overflow-hidden bg-muted/30 flex items-center justify-center">
              <img
                src={artifact.filePath}
                alt={artifact.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <FileIcon fileName={artifact.name} size={24} className="text-purple-400" />
            </div>
          ) : (
            <FileIcon fileName={artifact.name} size={24} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate">{artifact.name}</h4>
            <span className="text-xs text-muted-foreground shrink-0">
              {artifact.extension.toUpperCase()}
            </span>
          </div>
          {artifact.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {artifact.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatSize(artifact.size)}</span>
            <span>{formatDate(artifact.createdAt)}</span>
            <span className="capitalize">{typeLabels[artifact.type]}</span>
            {artifact.agentId && (
              <span className="truncate max-w-[100px]">Agent: {artifact.agentId}</span>
            )}
          </div>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground transition-all"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-48 rounded-md border border-border bg-card shadow-lg">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy name"}
                </button>
                {onOpenConversation && artifact.conversationId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenConversation();
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <MessageSquare size={14} />
                    Open conversation
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
