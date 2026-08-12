import { useMemo } from "react";

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const highlightSyntax = (code: string, language: string): string => {
  const lang = language.toLowerCase();
  let highlighted = escapeHtml(code);

  if (["javascript", "js", "typescript", "ts"].includes(lang)) {
    highlighted = highlighted
      .replace(/(\/\/.*$)/gm, '<span class="token-comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, '<span class="token-keyword">$1</span>')
      .replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '<span class="token-boolean">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token-string">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="token-string">$1</span>')
      .replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="token-string">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="token-number">$1</span>');
  } else if (["python", "py"].includes(lang)) {
    highlighted = highlighted
      .replace(/(#.*$)/gm, '<span class="token-comment">$1</span>')
      .replace(/("""[\s\S]*?""")/g, '<span class="token-string">$1</span>')
      .replace(/('''[\s\S]*?''')/g, '<span class="token-string">$1</span>')
      .replace(/\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|yield|lambda|pass|break|continue|raise|async|await|True|False|None|and|or|not|in|is)\b/g, '<span class="token-keyword">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token-string">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="token-string">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="token-number">$1</span>');
  } else if (["rust", "rs"].includes(lang)) {
    highlighted = highlighted
      .replace(/(\/\/.*$)/gm, '<span class="token-comment">$1</span>')
      .replace(/\b(fn|let|mut|const|if|else|for|while|loop|match|return|struct|enum|impl|trait|pub|use|mod|crate|self|super|where|type|async|await|move|ref|dyn|static|unsafe|true|false)\b/g, '<span class="token-keyword">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token-string">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="token-string">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="token-number">$1</span>');
  } else if (["go"].includes(lang)) {
    highlighted = highlighted
      .replace(/(\/\/.*$)/gm, '<span class="token-comment">$1</span>')
      .replace(/\b(func|var|const|if|else|for|range|switch|case|default|return|struct|type|interface|map|chan|go|select|package|import|defer|fallthrough|true|false|nil)\b/g, '<span class="token-keyword">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token-string">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="token-string">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="token-number">$1</span>');
  }

  return highlighted;
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const html = useMemo(() => {
    const lines = content.split("\n");
    const result: string[] = [];
    let inCodeBlock = false;
    let codeContent = "";
    let codeLanguage = "";
    let inList = false;
    let listType: "ul" | "ol" = "ul";
    let listItems: string[] = [];
    let listIndex = 0;

    const flushList = () => {
      if (listItems.length === 0) return;
      if (listType === "ul") {
        result.push(`<ul class="list-disc list-inside space-y-1 my-2">${listItems.join("")}</ul>`);
      } else {
        result.push(`<ol class="list-decimal list-inside space-y-1 my-2">${listItems.join("")}</ol>`);
      }
      listItems = [];
      inList = false;
      listIndex = 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (inCodeBlock) {
        if (line.trim() === "```") {
          const highlighted = highlightSyntax(codeContent.trim(), codeLanguage);
          result.push(`<div class="relative group my-2"><pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code class="language-${escapeHtml(codeLanguage)}">${highlighted}</code></pre></div>`);
          codeContent = "";
          codeLanguage = "";
          inCodeBlock = false;
        } else {
          codeContent += line + "\n";
        }
        continue;
      }

      const codeBlockMatch = line.match(/^```(\w*)/);
      if (codeBlockMatch) {
        flushList();
        inCodeBlock = true;
        codeLanguage = codeBlockMatch[1] || "text";
        continue;
      }

      if (line.startsWith("# ")) {
        flushList();
        result.push(`<h1 class="text-xl font-bold mt-4 mb-2">${inlineMarkdown(line.slice(2))}</h1>`);
      } else if (line.startsWith("## ")) {
        flushList();
        result.push(`<h2 class="text-lg font-semibold mt-3 mb-2">${inlineMarkdown(line.slice(3))}</h2>`);
      } else if (line.startsWith("### ")) {
        flushList();
        result.push(`<h3 class="text-base font-medium mt-2 mb-1">${inlineMarkdown(line.slice(4))}</h3>`);
      } else if (line.startsWith("> ")) {
        flushList();
        result.push(`<blockquote class="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground my-2">${inlineMarkdown(line.slice(2))}</blockquote>`);
      } else if (line.match(/^(\s*)[-*]\s/)) {
        const indent = line.match(/^(\s*)/)?.[1] || "";
        const text = line.trim().slice(2);
        if (!inList || listType !== "ul") {
          flushList();
          inList = true;
          listType = "ul";
          listItems = [];
        }
        listItems.push(`<li class="text-sm">${inlineMarkdown(text)}</li>`);
      } else if (line.match(/^(\s*)\d+\.\s/)) {
        const text = line.replace(/^\s*\d+\.\s/, "");
        if (!inList || listType !== "ol") {
          flushList();
          inList = true;
          listType = "ol";
          listItems = [];
          listIndex = 0;
        }
        listIndex++;
        listItems.push(`<li class="text-sm">${inlineMarkdown(text)}</li>`);
      } else if (line.trim() === "") {
        flushList();
      } else {
        flushList();
        result.push(`<p class="text-sm leading-relaxed my-1">${inlineMarkdown(line)}</p>`);
      }
    }

    flushList();

    if (inCodeBlock) {
      const highlighted = highlightSyntax(codeContent.trim(), codeLanguage);
      result.push(`<div class="relative group my-2"><pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code class="language-${escapeHtml(codeLanguage)}">${highlighted}</code></pre></div>`);
    }

    return result.join("\n");
  }, [content]);

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function inlineMarkdown(text: string): string {
  let result = escapeHtml(text);

  result = result.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">$1</code>');
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>');

  return result;
}
