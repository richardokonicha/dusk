import { useState, useEffect, useCallback } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  FileCode,
  FileText,
  FileJson,
  FileType2,
  Image as ImageIcon,
  File,
} from "lucide-react";

type PreviewMode = "text" | "image" | "pdf" | "code";

interface FilePreviewProps {
  path: string;
  content?: string;
  onClose?: () => void;
  onSave?: (path: string, content: string) => void;
  readOnly?: boolean;
  workspaceId?: string;
}

const syntaxPatterns: Record<string, RegExp[]> = {
  javascript: [
    /\/\/.*/g,
    /\/\*[\s\S]*?\*\//g,
    /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this)\b/g,
    /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g,
    /\b(\d+\.?\d*)\b/g,
    /\/\/.*/g,
  ],
  typescript: [
    /\/\/.*/g,
    /\/\*[\s\S]*?\*\//g,
    /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|interface|type|extends|implements|public|private|protected|readonly|abstract|static)\b/g,
    /\b(string|number|boolean|any|void|null|undefined|never|unknown|object)\b/g,
    /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g,
    /\b(\d+\.?\d*)\b/g,
  ],
  python: [
    /#.*/g,
    /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|lambda|yield|raise|pass|break|continue|and|or|not|in|is|True|False|None|self)\b/g,
    /@\w+/g,
    /f["'](?:[^"\\]|\\.)*["']/g,
    /\b(\d+\.?\d*)\b/g,
  ],
  json: [
    /("(?:[^"\\]|\\.)*")(\s*:)/g,
    /:\s*("(?:[^"\\]|\\.)*")/g,
    /\b(true|false|null)\b/g,
    /\b(\d+\.?\d*)\b/g,
  ],
  html: [
    /&lt;\/?[\w]+&gt;/g,
    /&lt;\/?[\w]+/g,
    /\s[\w-]+=/g,
    /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g,
  ],
  css: [
    /\/\*[\s\S]*?\*\//g,
    /\.[\w-]+/g,
    /\#[\w-]+/g,
    /\b(\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms)?\b/g,
    /\b(import|export|from|media|keyframes|animation|transition|flex|grid|block|inline|relative|absolute)\b/g,
  ],
  bash: [
    /#.*/g,
    /\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|find|chmod|chown|sudo|apt|npm|yarn|pnpm|git|docker|kubectl)\b/g,
    /\$[A-Z_]+/g,
    /\$\([^)]*\)/g,
    /\$\{[^}]+\}/g,
    /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g,
  ],
};

const keywordColors: Record<string, string> = {
  keyword: "#c678dd",
  string: "#98c379",
  number: "#d19a66",
  comment: "#5c6370",
  tag: "#e06c75",
  attribute: "#d19a66",
  punctuation: "#abb2bf",
  function: "#61afef",
  variable: "#e06c75",
};

function highlightSyntax(code: string, language: string): string {
  const patterns = syntaxPatterns[language] || syntaxPatterns.javascript;
  let result = escapeHtml(code);

  const highlights: { start: number; end: number; type: string }[] = [];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(result)) !== null) {
      highlights.push({
        start: match.index,
        end: match.index + match[0].length,
        type: getHighlightType(match[0], language),
      });
    }
  }

  highlights.sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number; type: string }[] = [];
  for (const h of highlights) {
    if (merged.length > 0 && h.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, h.end);
    } else {
      merged.push({ ...h });
    }
  }

  let offset = 0;
  for (const h of merged) {
    const before = result.slice(0, h.start + offset);
    const token = result.slice(h.start + offset, h.end + offset);
    const after = result.slice(h.end + offset);
    const color = getTokenColor(h.type, language);
    result = `${before}<span style="color: ${color}">${token}</span>${after}`;
    offset += `<span style="color: ${color}"></span>`.length;
  }

  return result;
}

function getHighlightType(token: string, language: string): string {
  if (/^\s+$/.test(token)) return "punctuation";
  if (token.startsWith("//") || token.startsWith("#") || token.startsWith("/*")) return "comment";
  if (/^["'`]/.test(token)) return "string";
  if (/^\d+\.?\d*$/.test(token)) return "number";
  if (language === "html" && /^&lt;\/?/.test(token)) return "tag";
  if (language === "html" && /^\s[\w-]+=/.test(token)) return "attribute";
  if (language === "css" && /^\./.test(token)) return "class";
  if (language === "css" && /^\#/.test(token)) return "id";
  if (language === "bash" && /^\$/.test(token)) return "variable";
  if (language === "json" && /^".*"$/.test(token) && /:"/.test(token)) return "attribute";
  if (language === "json" && /^".*"$/.test(token)) return "string";
  if (["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "async", "await", "try", "catch", "def", "class", "import", "from", "with", "lambda", "yield", "raise", "pass", "break", "continue", "and", "or", "not", "in", "is", "True", "False", "None", "self"].includes(token.replace(/[^a-zA-Z]/g, ""))) return "keyword";
  if (language === "javascript" || language === "typescript") {
    if (/^(const|let|var|function|return|if|else|for|while|class|import|export|async|await|try|catch|new|this|interface|type|extends|string|number|boolean|any|void|null|undefined|never|unknown|object)$/.test(token.replace(/[^a-zA-Z]/g, ""))) return "keyword";
  }
  return "punctuation";
}

function getTokenColor(type: string, _language: string): string {
  return keywordColors[type] || keywordColors.punctuation;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() || "";
  switch (extension) {
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
      return <FileCode size={20} className="text-yellow-400" />;
    case "json":
      return <FileJson size={20} className="text-green-400" />;
    case "md":
      return <FileType2 size={20} className="text-blue-400" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <ImageIcon size={20} className="text-purple-400" />;
    default:
      return <FileText size={20} className="text-muted-foreground" />;
  }
}

function getLanguage(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    yaml: "yaml",
    yml: "yaml",
    json: "json",
    md: "markdown",
    html: "html",
    css: "css",
    sql: "sql",
    sh: "bash",
    toml: "toml",
    xml: "xml",
  };
  return langMap[extension] || "plaintext";
}

function isImage(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"].includes(extension);
}

function isPdf(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

export function FilePreview({
  path,
  content = "",
  onClose,
  onSave,
  readOnly = false,
  workspaceId,
}: FilePreviewProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const extension = path.split(".").pop()?.toLowerCase() || "";
  const language = getLanguage(path);
  const isImageFile = isImage(path);
  const isPdfFile = isPdf(path);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(path, editedContent);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = useCallback(async () => {
    const blob = new Blob([editedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editedContent, path]);

  const lineCount = editedContent.split("\n").length;

  const getPreviewMode = (): PreviewMode => {
    if (isImageFile) return "image";
    if (isPdfFile) return "pdf";
    if (["javascript", "typescript", "python", "json", "html", "css", "bash", "sql", "yaml", "markdown"].includes(language)) {
      return "code";
    }
    return "text";
  };

  const previewMode = getPreviewMode();

  const renderPreview = () => {
    if (previewMode === "image" && !imageError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-black/5 p-4">
          <img
            src={`file://${path}`}
            alt={path}
            className="max-w-full max-h-full object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (previewMode === "pdf") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <File size={48} className="mb-3 opacity-50" />
          <p className="text-sm">PDF Preview</p>
          <p className="text-xs mt-1">PDF rendering is not available in this view</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto">
        {previewMode === "code" ? (
          <pre
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed focus:outline-none"
            style={{ minHeight: "100%" }}
            dangerouslySetInnerHTML={{
              __html: highlightSyntax(editedContent, language) + "\n",
            }}
          />
        ) : (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            readOnly={readOnly}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed focus:outline-none"
            spellCheck={false}
            style={{ minHeight: "100%" }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex h-full flex-col rounded-lg border border-border bg-card ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {getFileIcon(path)}
          <span className="text-sm font-medium truncate">{path}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {lineCount} lines
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <button
                onClick={handleCopy}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Copy"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || editedContent === content}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                title="Save"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleDownload}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Download"
              >
                <Download size={16} />
              </button>
            </>
          )}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {renderPreview()}
    </div>
  );
}
