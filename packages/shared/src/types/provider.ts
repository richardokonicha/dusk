export type ProviderType = "openai" | "anthropic" | "gemini" | "ollama" | "custom" | "fugoku-gateway";

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseURL?: string;
  apiKeyRef?: string;
  models?: ModelInfo[];
  enabled: boolean;
  priority: number;
  timeout: number;
  maxRetries: number;
  extraHeaders?: Record<string, string>;
}

export interface ProviderRuntimeConfig {
  id: string;
  name: string;
  type: ProviderType;
  apiKey: string;
  baseURL?: string;
  apiKeyRef?: string;
  models?: ModelInfo[];
  enabled: boolean;
  priority: number;
  timeout: number;
  maxRetries: number;
  extraHeaders?: Record<string, string>;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision?: boolean;
  contextWindow?: number;
  maxOutputTokens?: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | "required";
}

export interface StreamChunk {
  type: "text" | "tool_call" | "tool_result" | "error" | "done";
  content?: string;
  toolCall?: ToolCall;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ConnectionResult {
  success: boolean;
  latency?: number;
  error?: string;
  models?: ModelInfo[];
}

export interface ChatResult {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface FallbackChain {
  primary: string;
  fallbacks: string[];
}

export interface RouterConfig {
  providers: ProviderRuntimeConfig[];
  fallbackChain?: FallbackChain;
  retryDelay?: number;
  maxRetries?: number;
}
