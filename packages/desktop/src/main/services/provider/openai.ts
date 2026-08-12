import OpenAI from "openai";
import { LLMProvider } from "./base";
import type {
  ProviderRuntimeConfig,
  ModelInfo,
  ChatParams,
  StreamChunk,
  ConnectionResult,
  ChatResult,
} from "../../../../../shared/dist/src/types/provider.js";

export class OpenAIProvider extends LLMProvider {
  readonly type = "openai";
  readonly id: string;
  readonly name: string;

  private client: OpenAI;

  constructor(runtime: ProviderRuntimeConfig) {
    super(runtime);
    this.id = runtime.id;
    this.name = runtime.name;
    this.client = new OpenAI({
      apiKey: runtime.apiKey || "dummy",
      baseURL: runtime.baseURL || "https://api.openai.com/v1",
      timeout: runtime.timeout || 60000,
      maxRetries: runtime.maxRetries ?? 2,
      defaultHeaders: runtime.extraHeaders,
    });
  }

  private getDefaultBaseURL(): string {
    return this.runtime.baseURL || "https://api.openai.com/v1";
  }

  protected getApiURL(): string {
    return this.getDefaultBaseURL().replace(/\/$/, "");
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const start = Date.now();
      await this.executeWithRetry(async () => {
        const response = await this.fetchWithTimeout(
          `${this.getApiURL()}/models`,
          {
            method: "GET",
            headers: this.buildHeaders(),
          },
          this.runtime.timeout || 30000
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return response;
      });

      return {
        success: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const data = await this.executeWithRetry(async () => {
        const response = await this.fetchWithTimeout(
          `${this.getApiURL()}/models`,
          {
            method: "GET",
            headers: this.buildHeaders(),
          },
          this.runtime.timeout || 30000
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return (await response.json()) as {
          data: Array<{
            id: string;
            owned_by?: string;
          }>;
        };
      });

      return (data.data || []).map((model) => ({
        id: model.id,
        name: model.id,
        provider: this.id,
        supportsStreaming: true,
        supportsTools: true,
        contextWindow: 128000,
        maxOutputTokens: 4096,
      }));
    } catch (error) {
      if (this.runtime.models) {
        return this.runtime.models.map((m) => ({
          id: m.id,
          name: m.name,
          provider: this.id,
          supportsStreaming: m.supportsStreaming,
          supportsTools: m.supportsTools,
          contextWindow: m.contextWindow,
          maxOutputTokens: m.maxOutputTokens,
        }));
      }
      return [];
    }
  }

  async *streamChat(params: ChatParams): AsyncIterable<StreamChunk> {
    const body = this.buildChatBody(params);
    body.stream = true;

    const response = await this.fetchWithTimeout(
      `${this.getApiURL()}/chat/completions`,
      {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      },
      this.runtime.timeout || 60000
    );

    if (!response.ok) {
      const errorData = await response.text();
      const rateLimitInfo = this.extractRateLimitInfo(response);
      if (this.shouldRetry(response.status) && rateLimitInfo.retryAfter !== undefined) {
        throw new Error(
          `HTTP ${response.status}: ${errorData}. Retry after ${rateLimitInfo.retryAfter}ms`
        );
      }
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body received from OpenAI provider");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || line.trim() === "data: [DONE]") continue;
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.choices?.[0]?.delta?.content) {
              yield { type: "text", content: data.choices[0].delta.content };
            }

            if (data.choices?.[0]?.delta?.tool_calls) {
              for (const tc of data.choices[0].delta.tool_calls) {
                if (tc.function?.name && tc.function?.arguments !== undefined) {
                  yield {
                    type: "tool_call",
                    toolCall: {
                      id: tc.id || crypto.randomUUID(),
                      name: tc.function.name,
                      arguments: this.parseArguments(tc.function.arguments),
                    },
                  } as StreamChunk;
                }
              }
            }

            if (data.choices?.[0]?.finish_reason) {
              yield {
                type: "done",
                finishReason: data.choices[0].finish_reason,
                usage: data.usage
                  ? {
                      promptTokens: data.usage.prompt_tokens,
                      completionTokens: data.usage.completion_tokens,
                      totalTokens: data.usage.total_tokens,
                    }
                  : undefined,
              };
            }
          } catch {
            yield { type: "error", content: "Failed to parse streaming response chunk" };
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield {
          type: "error",
          content: `Streaming timed out after ${this.runtime.timeout || 60000}ms`,
        };
      } else {
        yield {
          type: "error",
          content:
            error instanceof Error ? error.message : "Streaming connection error",
        };
      }
    } finally {
      reader.releaseLock();
    }
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const body = this.buildChatBody(params);

    const data = await this.executeWithRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.getApiURL()}/chat/completions`,
        {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
        },
        this.runtime.timeout || 60000
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      return (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
            tool_calls?: unknown[];
          };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
    });

    const choice = data.choices?.[0];
    const toolCalls = choice?.message?.tool_calls
      ? this.parseToolCalls(choice.message.tool_calls)
      : undefined;

    return {
      content: choice?.message?.content || "",
      toolCalls,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
      finishReason: choice?.finish_reason,
    };
  }

  supportsTools(): boolean {
    return true;
  }

  private parseArguments(args: string | Record<string, unknown>): Record<string, unknown> {
    if (typeof args === "string") {
      try {
        return JSON.parse(args || "{}");
      } catch {
        return { raw: args };
      }
    }
    return args;
  }
}
