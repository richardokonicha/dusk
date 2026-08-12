import { z } from "zod";
import type { ProviderType, ProviderConfig } from "../../../../../shared/dist/src/types/provider.js";

const providerBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(["openai", "anthropic", "gemini", "ollama", "custom"]),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(0),
  timeout: z.number().int().min(1000).max(300000).default(60000),
  maxRetries: z.number().int().min(0).max(10).default(2),
  extraHeaders: z.record(z.string()).optional(),
});

const apiKeyFieldSchema = z.object({
  apiKeyRef: z.string().min(1).max(255),
  apiKey: z.string().optional(),
});

const openaiConfigSchema = providerBaseSchema.extend({
  type: z.literal("openai"),
  baseURL: z.string().url().default("https://api.openai.com/v1"),
  ...apiKeyFieldSchema.shape,
  models: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      provider: z.string(),
      supportsStreaming: z.boolean().default(true),
      supportsTools: z.boolean().default(true),
      contextWindow: z.number().optional(),
      maxOutputTokens: z.number().optional(),
    })
  ).optional(),
});

const anthropicConfigSchema = providerBaseSchema.extend({
  type: z.literal("anthropic"),
  baseURL: z.string().url().default("https://api.anthropic.com"),
  ...apiKeyFieldSchema.shape,
  models: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      provider: z.string(),
      supportsStreaming: z.boolean().default(true),
      supportsTools: z.boolean().default(true),
      contextWindow: z.number().optional(),
    })
  ).optional(),
});

const geminiConfigSchema = providerBaseSchema.extend({
  type: z.literal("gemini"),
  baseURL: z.string().url().default("https://generativelanguage.googleapis.com"),
  ...apiKeyFieldSchema.shape,
  models: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      provider: z.string(),
      supportsStreaming: z.boolean().default(true),
      supportsTools: z.boolean().default(true),
      contextWindow: z.number().optional(),
    })
  ).optional(),
});

const ollamaConfigSchema = providerBaseSchema.extend({
  type: z.literal("ollama"),
  baseURL: z.string().url().default("http://127.0.0.1:11434"),
  apiKeyRef: z.string().optional(),
  apiKey: z.string().optional(),
  models: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      provider: z.string(),
      supportsStreaming: z.boolean().default(true),
      supportsTools: z.boolean().default(true),
    })
  ).optional(),
});

const customConfigSchema = providerBaseSchema.extend({
  type: z.literal("custom"),
  baseURL: z.string().url(),
  ...apiKeyFieldSchema.shape,
  models: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      provider: z.string(),
      supportsStreaming: z.boolean().default(true),
      supportsTools: z.boolean().default(true),
      contextWindow: z.number().optional(),
      maxOutputTokens: z.number().optional(),
    })
  ).optional(),
});

export type ProviderUIConfigSchema = z.infer<
  typeof providerBaseSchema
> & {
  baseURL: string;
  apiKey?: string;
  apiKeyRef?: string;
  models?: Array<{
    id: string;
    name: string;
    provider: string;
    supportsStreaming: boolean;
    supportsTools: boolean;
    contextWindow?: number;
    maxOutputTokens?: number;
  }>;
};

export const providerConfigSchemas = {
  openai: openaiConfigSchema,
  anthropic: anthropicConfigSchema,
  gemini: geminiConfigSchema,
  ollama: ollamaConfigSchema,
  custom: customConfigSchema,
} as const;

export const providerConfigSchema = z.discriminatedUnion("type", [
  openaiConfigSchema,
  anthropicConfigSchema,
  geminiConfigSchema,
  ollamaConfigSchema,
  customConfigSchema,
]);

export interface ProviderFieldDefinition {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "number" | "boolean" | "textarea" | "select" | "tags";
  required: boolean;
  description?: string;
  placeholder?: string;
  default?: string | number | boolean;
}

export interface ProviderTypeMetadata {
  type: ProviderType;
  label: string;
  description: string;
  fields: ProviderFieldDefinition[];
  requiresApiKey: boolean;
  requiresBaseURL: boolean;
  defaultBaseURL: string;
}

export const providerTypeMetadata: Record<ProviderType, ProviderTypeMetadata> = {
  openai: {
    type: "openai",
    label: "OpenAI",
    description: "OpenAI API-compatible provider (GPT-4, o1, etc.)",
    requiresApiKey: true,
    requiresBaseURL: false,
    defaultBaseURL: "https://api.openai.com/v1",
    fields: [
      { key: "name", label: "Provider Name", type: "text", required: true, placeholder: "My OpenAI" },
      { key: "baseURL", label: "Base URL", type: "url", required: false, placeholder: "https://api.openai.com/v1", default: "https://api.openai.com/v1" },
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "sk-..." },
      { key: "apiKeyRef", label: "Secure Key Reference", type: "text", required: false, placeholder: "key-ref-1" },
      { key: "timeout", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
      { key: "maxRetries", label: "Max Retries", type: "number", required: false, placeholder: "2", default: 2 },
      { key: "priority", label: "Priority", type: "number", required: false, placeholder: "0", default: 0 },
      { key: "extraHeaders", label: "Extra Headers", type: "text", required: false, placeholder: '{"X-Custom": "value"}' },
      { key: "enabled", label: "Enabled", type: "boolean", required: false, default: true },
    ],
  },
  anthropic: {
    type: "anthropic",
    label: "Anthropic",
    description: "Anthropic Claude models (Claude 3, Claude 3.5, etc.)",
    requiresApiKey: true,
    requiresBaseURL: false,
    defaultBaseURL: "https://api.anthropic.com",
    fields: [
      { key: "name", label: "Provider Name", type: "text", required: true, placeholder: "My Anthropic" },
      { key: "baseURL", label: "Base URL", type: "url", required: false, placeholder: "https://api.anthropic.com", default: "https://api.anthropic.com" },
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "sk-ant-..." },
      { key: "apiKeyRef", label: "Secure Key Reference", type: "text", required: false, placeholder: "key-ref-1" },
      { key: "timeout", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
      { key: "maxRetries", label: "Max Retries", type: "number", required: false, placeholder: "2", default: 2 },
      { key: "priority", label: "Priority", type: "number", required: false, placeholder: "0", default: 0 },
      { key: "extraHeaders", label: "Extra Headers", type: "text", required: false, placeholder: '{"X-Custom": "value"}' },
      { key: "enabled", label: "Enabled", type: "boolean", required: false, default: true },
    ],
  },
  gemini: {
    type: "gemini",
    label: "Gemini",
    description: "Google Gemini models (Gemini 1.5, Gemini 2.0, etc.)",
    requiresApiKey: true,
    requiresBaseURL: false,
    defaultBaseURL: "https://generativelanguage.googleapis.com",
    fields: [
      { key: "name", label: "Provider Name", type: "text", required: true, placeholder: "My Gemini" },
      { key: "baseURL", label: "Base URL", type: "url", required: false, placeholder: "https://generativelanguage.googleapis.com", default: "https://generativelanguage.googleapis.com" },
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "AI..." },
      { key: "apiKeyRef", label: "Secure Key Reference", type: "text", required: false, placeholder: "key-ref-1" },
      { key: "timeout", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
      { key: "maxRetries", label: "Max Retries", type: "number", required: false, placeholder: "2", default: 2 },
      { key: "priority", label: "Priority", type: "number", required: false, placeholder: "0", default: 0 },
      { key: "extraHeaders", label: "Extra Headers", type: "text", required: false, placeholder: '{"X-Custom": "value"}' },
      { key: "enabled", label: "Enabled", type: "boolean", required: false, default: true },
    ],
  },
  ollama: {
    type: "ollama",
    label: "Ollama",
    description: "Local Ollama server for self-hosted models",
    requiresApiKey: false,
    requiresBaseURL: false,
    defaultBaseURL: "http://127.0.0.1:11434",
    fields: [
      { key: "name", label: "Provider Name", type: "text", required: true, placeholder: "Local Ollama" },
      { key: "baseURL", label: "Base URL", type: "url", required: false, placeholder: "http://127.0.0.1:11434", default: "http://127.0.0.1:11434" },
      { key: "timeout", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
      { key: "maxRetries", label: "Max Retries", type: "number", required: false, placeholder: "2", default: 2 },
      { key: "priority", label: "Priority", type: "number", required: false, placeholder: "0", default: 0 },
      { key: "extraHeaders", label: "Extra Headers", type: "text", required: false, placeholder: '{"X-Custom": "value"}' },
      { key: "enabled", label: "Enabled", type: "boolean", required: false, default: true },
    ],
  },
  custom: {
    type: "custom",
    label: "Custom",
    description: "Custom OpenAI-compatible API endpoint",
    requiresApiKey: true,
    requiresBaseURL: true,
    defaultBaseURL: "",
    fields: [
      { key: "name", label: "Provider Name", type: "text", required: true, placeholder: "My Custom Provider" },
      { key: "baseURL", label: "Base URL", type: "url", required: true, placeholder: "https://api.example.com/v1" },
      { key: "apiKey", label: "API Key", type: "password", required: false, placeholder: "key-or-token" },
      { key: "apiKeyRef", label: "Secure Key Reference", type: "text", required: false, placeholder: "key-ref-1" },
      { key: "timeout", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
      { key: "maxRetries", label: "Max Retries", type: "number", required: false, placeholder: "2", default: 2 },
      { key: "priority", label: "Priority", type: "number", required: false, placeholder: "0", default: 0 },
      { key: "extraHeaders", label: "Extra Headers", type: "text", required: false, placeholder: '{"X-Custom": "value"}' },
      { key: "enabled", label: "Enabled", type: "boolean", required: false, default: true },
    ],
  },
  "fugoku-gateway": {
    type: "fugoku-gateway",
    label: "Fugoku Gateway",
    description: "Fugoku's managed gateway for provider routing",
    requiresApiKey: true,
    requiresBaseURL: false,
    defaultBaseURL: "https://gateway.fugoku.ai/v1",
    fields: [
      { key: "name", label: "Provider Name", type: "text", required: true, placeholder: "Fugoku Gateway" },
      { key: "baseURL", label: "Base URL", type: "url", required: false, placeholder: "https://gateway.fugoku.ai/v1", default: "https://gateway.fugoku.ai/v1" },
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "fk-..." },
      { key: "apiKeyRef", label: "Secure Key Reference", type: "text", required: false, placeholder: "key-ref-1" },
      { key: "timeout", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
      { key: "maxRetries", label: "Max Retries", type: "number", required: false, placeholder: "2", default: 2 },
      { key: "priority", label: "Priority", type: "number", required: false, placeholder: "0", default: 0 },
      { key: "extraHeaders", label: "Extra Headers", type: "text", required: false, placeholder: '{"X-Custom": "value"}' },
      { key: "enabled", label: "Enabled", type: "boolean", required: false, default: true },
    ],
  },
};

export function getProviderConfigSchema(type: ProviderType): z.ZodType<ProviderConfig> {
  return providerConfigSchema as z.ZodType<ProviderConfig>;
}

export function getProviderFields(type: ProviderType): ProviderFieldDefinition[] {
  return providerTypeMetadata[type]?.fields ?? providerTypeMetadata.openai.fields;
}

export function getProviderDefaults(type: ProviderType): Partial<ProviderConfig> {
  const metadata = providerTypeMetadata[type];
  if (!metadata) return {};

  return {
    type,
    baseURL: metadata.defaultBaseURL,
    enabled: true,
    priority: 0,
    timeout: 60000,
    maxRetries: 2,
  };
}

export function getProviderTypeOptions(): Array<{ type: ProviderType; label: string; description: string }> {
  return Object.values(providerTypeMetadata).map((m) => ({
    type: m.type,
    label: m.label,
    description: m.description,
  }));
}
