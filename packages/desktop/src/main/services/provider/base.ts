import type {
  ProviderRuntimeConfig,
  ModelInfo,
  ChatParams,
  StreamChunk,
  ToolCall,
  ToolDefinition,
  ConnectionResult,
  ChatResult,
} from "../../../../../shared/dist/src/types/provider.js";

export abstract class LLMProvider {
  abstract readonly type: string;
  abstract readonly id: string;
  abstract readonly name: string;

  abstract testConnection(): Promise<ConnectionResult>;
  abstract listModels(): Promise<ModelInfo[]>;
  abstract streamChat(params: ChatParams): AsyncIterable<StreamChunk>;
  abstract chat(params: ChatParams): Promise<ChatResult>;
  abstract supportsTools(): boolean;

  protected runtime: ProviderRuntimeConfig;

  constructor(runtime: ProviderRuntimeConfig) {
    this.runtime = runtime;
  }

  protected getApiURL(): string {
    const base = this.runtime.baseURL;
    if (!base) {
      return "";
    }
    return base.replace(/\/$/, "");
  }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.runtime.extraHeaders,
    };
    if (this.runtime.apiKey) {
      headers["Authorization"] = `Bearer ${this.runtime.apiKey}`;
    }
    return headers;
  }

  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs?: number
  ): Promise<Response> {
    const timeout = timeoutMs || this.runtime.timeout || 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected extractRateLimitInfo(response: Response): {
    retryAfter?: number;
    remaining?: number;
  } {
    const retryAfter = response.headers.get("retry-after");
    const remaining = response.headers.get("x-ratelimit-remaining");

    return {
      retryAfter: retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : undefined,
      remaining: remaining ? Number.parseInt(remaining, 10) : undefined,
    };
  }

  protected shouldRetry(status: number): boolean {
    return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
  }

  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.runtime.maxRetries ?? 2;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const isRetryable = this.isRetryableError(lastError);
          if (!isRetryable) {
            throw lastError;
          }
          const backoffDelay = this.calculateBackoff(attempt, retries);
          await this.sleep(backoffDelay);
        }
      }
    }

    throw lastError || new Error("Operation failed after retries");
  }

  protected isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    if (message.includes("timed out") || message.includes("timeout")) return true;
    if (message.includes("rate limit") || message.includes("429")) return true;
    if (message.includes("502") || message.includes("503") || message.includes("504")) {
      return true;
    }
    if (message.includes("network") || message.includes("connection")) return true;
    return false;
  }

  protected calculateBackoff(attempt: number, maxRetries: number): number {
    const baseDelay = 1000;
    const jitter = Math.random() * 0.3 + 0.7;
    return baseDelay * Math.pow(2, attempt) * jitter;
  }

  protected parseToolCalls(toolCalls: unknown): ToolCall[] {
    if (Array.isArray(toolCalls)) {
      return toolCalls
        .filter((tc): tc is Record<string, unknown> => typeof tc === "object" && tc !== null)
        .map((tc) => {
          const func = (tc.function ?? tc) as {
            name?: string;
            arguments?: string | Record<string, unknown>;
          };
          let args: Record<string, unknown> = {};
          if (typeof func.arguments === "string") {
            try {
              args = JSON.parse(func.arguments);
            } catch {
              args = { raw: func.arguments };
            }
          } else if (func.arguments && typeof func.arguments === "object") {
            args = func.arguments;
          }

          return {
            id: (tc.id as string) || crypto.randomUUID(),
            name: func.name || "unknown",
            arguments: args,
          };
        });
    }
    return [];
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected buildChatBody(params: ChatParams): Record<string, unknown> {
    return {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stop: params.stop,
      tools: params.tools,
      tool_choice: params.toolChoice,
    };
  }
}
