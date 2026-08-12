import { z } from "zod";

export const PathSchema = z
  .string()
  .min(1, "Path must not be empty")
  .refine((path) => !path.includes("\0"), "Path must not contain null bytes")
  .refine((path) => !path.includes("\\0"), "Path must not contain null bytes");

export function validateFilePath(path: string, allowedRoots: string[]): { valid: boolean; reason?: string } {
  if (!path || typeof path !== "string") {
    return { valid: false, reason: "Path must be a non-empty string" };
  }

  if (path.includes("\0") || path.includes("\\0")) {
    return { valid: false, reason: "Path must not contain null bytes" };
  }

  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/");

  for (const segment of segments) {
    if (segment === "..") {
      return { valid: false, reason: "Path traversal detected: '..' is not allowed" };
    }
  }

  const isInside = allowedRoots.some((root) => {
    const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
    return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`);
  });

  if (!isInside) {
    return { valid: false, reason: `Path is outside allowed directories: ${path}` };
  }

  return { valid: true };
}

export function sanitizeString(input: string, maxLength = 10000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .slice(0, maxLength);
}

export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const AgentConfigSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  model: z.string().min(1),
  systemPrompt: z.string().max(50000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(100000).optional(),
  topP: z.number().min(0).max(1).optional(),
  tools: z.array(z.string()).optional(),
  permissions: z.object({
    fileRead: z.boolean().default(true),
    fileWrite: z.boolean().default(false),
    fileDelete: z.boolean().default(false),
    networkOutbound: z.boolean().default(true),
    systemExecute: z.boolean().default(false),
  }).default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const ProviderConfigSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(["openai", "anthropic", "google", "ollama", "custom", "fugoku"]),
  apiKey: z.string().min(1).max(500),
  endpoint: z.string().url().optional(),
  models: z.array(z.string()).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  enabled: z.boolean().default(true),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const SettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.string().max(10).default("en"),
  fontSize: z.number().min(10).max(24).default(14),
  sendOnEnter: z.enum(["enter", "shift+enter", "ctrl+enter"]).default("enter"),
  spellCheck: z.boolean().default(true),
  telemetry: z.boolean().default(false),
  autoUpdate: z.boolean().default(true),
});

export type Settings = z.infer<typeof SettingsSchema>;
