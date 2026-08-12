interface LinkResult {
  url: string;
  text?: string;
}

export function renderMarkdown(text: string): string {
  if (typeof text !== "string") return "";

  let html = text;

  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  html = html
    .replace(/^#{1,6}\s+(.+)$/gm, (match, content) => {
      const level = match.match(/^#{1,6}/)?.[0].length || 1;
      return `<h${level}>${content}</h${level}>`;
    });

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || "";
    return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
  });

  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul>${match.trim()}</ul>`);

  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/(?:\r?\n){2,}/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, "");

  return html;
}

export function highlightCode(code: string, language?: string): string {
  const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const langClass = language ? ` class="language-${language}"` : "";
  return `<pre><code${langClass}>${escaped}</code></pre>`;
}

export function extractLinks(text: string): LinkResult[] {
  if (typeof text !== "string") return [];

  const results: LinkResult[] = [];
  const mdPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = mdPattern.exec(text)) !== null) {
    results.push({
      text: match[1],
      url: match[2]
    });
  }

  const urlPattern = /(?<![^\s])https?:\/\/[^\s)]+/g;
  while ((match = urlPattern.exec(text)) !== null) {
    const exists = results.some(r => r.url === match![0]);
    if (!exists) {
      results.push({ url: match[0] });
    }
  }

  return results;
}
