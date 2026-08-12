export function isValidWorkspaceName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;
  return /^[a-zA-Z0-9_\-\s]+$/.test(trimmed);
}

export function isValidFilePath(path: unknown): boolean {
  if (typeof path !== "string") return false;
  if (path.length === 0 || path.length > 4096) return false;
  return !path.includes("\0") && !path.includes("\n") && !path.includes("\r");
}

export function isValidProviderConfig(config: unknown): boolean {
  if (typeof config !== "object" || config === null) return false;

  const c = config as Record<string, unknown>;
  if (typeof c.name !== "string" || c.name.length === 0 || c.name.length > 100) return false;
  if (typeof c.type !== "string" || c.type.length === 0) return false;
  if (typeof c.baseUrl !== "string" || c.baseUrl.length === 0) return false;
  if (!c.apiKey && c.apiKey !== "") return false;
  if (!Array.isArray(c.models) || c.models.length === 0) return false;

  const validTypes = ["openai", "anthropic", "google", "ollama", "azure", "custom"];
  if (!validTypes.includes(c.type)) return false;

  try {
    new URL(c.baseUrl);
  } catch {
    return false;
  }

  return true;
}

export function isValidAgentConfig(config: unknown): boolean {
  if (typeof config !== "object" || config === null) return false;

  const c = config as Record<string, unknown>;
  if (typeof c.name !== "string" || c.name.length === 0 || c.name.length > 100) return false;
  if (typeof c.systemPrompt !== "string" || c.systemPrompt.length === 0) return false;
  if (typeof c.model !== "string" || c.model.length === 0) return false;
  if (typeof c.provider !== "string" || c.provider.length === 0) return false;

  if (c.temperature !== undefined && (typeof c.temperature !== "number" || c.temperature < 0 || c.temperature > 2)) {
    return false;
  }
  if (c.topP !== undefined && (typeof c.topP !== "number" || c.topP < 0 || c.topP > 1)) {
    return false;
  }
  if (c.maxTokens !== undefined && (typeof c.maxTokens !== "number" || c.maxTokens < 1)) {
    return false;
  }

  return true;
}

export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeHtmlPreserveTags(input: string, allowedTags: string[] = []): string {
  if (typeof input !== "string") return "";
  if (allowedTags.length === 0) return sanitizeHtml(input);

  const tagPattern = new RegExp(`<(?!/?(${allowedTags.join("|")})[^>]*>)[^>]*>`, "g");
  let sanitized = input.replace(tagPattern, "");
  sanitized = sanitized.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return sanitized;
}
