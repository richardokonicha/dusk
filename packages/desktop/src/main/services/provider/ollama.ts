import { LLMProvider } from "./base";
import type {
  ProviderRuntimeConfig,
  ModelInfo,
  ChatParams,
  StreamChunk,
  ConnectionResult,
  ChatResult,
} from "../../../../../shared/dist/src/types/provider.js";

export class OllamaProvider extends LLMProvider {
  readonly type = "ollama";
  readonly id: string;
  readonly name: string;

  constructor(runtime: ProviderRuntimeConfig) {
    super(runtime);
    this.id = runtime.id;
    this.name = runtime.name;
  }

  private getDefaultBaseURL(): string {
    return this.runtime.baseURL || "http://127.0.0.1:11434";
  }

  protected getApiURL(): string {
    return this.getDefaultBaseURL().replace(/\/$/, "") + "/api";
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const start = Date.now();
      await this.executeWithRetry(async () => {
        const response = await this.fetchWithTimeout(
          `${this.getApiURL()}/tags`,
          {
            method: "GET",
            headers: this.buildHeaders(),
          },
          this.runtime.timeout || 30000
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
          `${this.getApiURL()}/tags`,
          {
            method: "GET",
            headers: this.buildHeaders(),
          },
          this.runtime.timeout || 30000
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) as {
          models: Array<{
            name: string;
            details?: Record<string, unknown>;
          }>;
        };
      });

      return (data.models || []).map((model) => ({
        id: model.name,
        name: model.name,
        provider: this.id,
        supportsStreaming: true,
        supportsTools: true,
      }));
    } catch (error) {
      console.error(`[${this.name}] Failed to list models:`, error);
      return this.runtime.models?.map((m) => ({ ...m, provider: this.id })) || [];
    }
  }

  async *streamChat(params: ChatParams): AsyncIterable<StreamChunk> {
    const body = this.buildOllamaBody(params, true);

    const response = await this.fetchWithTimeout(
      `${this.getApiURL()}/chat`,
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

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body received from Ollama provider");
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
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.message?.content) {
              yield { type: "text", content: data.message.content };
            }

            if (data.message?.tool_calls) {
              for (const tc of data.message.tool_calls) {
                yield {
                  type: "tool_call",
                  toolCall: {
                    id: tc.id || crypto.randomUUID(),
                    name: tc.function?.name || "unknown",
                    arguments: this.parseArguments(tc.function?.arguments || "{}"),
                  },
                } as StreamChunk;
              }
            }

            if (data.done) {
              yield {
                type: "done",
                usage:
                  data.eval_count || data.prompt_eval_count
                    ? {
                        promptTokens: data.prompt_eval_count || 0,
                        completionTokens: data.eval_count || 0,
                        totalTokens:
                          (data.prompt_eval_count || 0) + (data.eval_count || 0),
                      }
                    : undefined,
              };
              break;
            }
          } catch {
            yield { type: "error", content: "Failed to parse Ollama streaming response" };
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
    const body = this.buildOllamaBody(params, false);

    const data = await this.executeWithRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.getApiURL()}/chat`,
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
        message?: { content?: string; tool_calls?: unknown[] };
        eval_count?: number;
        prompt_eval_count?: number;
      };
    });

    const toolCalls = data.message?.tool_calls
      ? this.parseToolCalls(data.message.tool_calls)
      : undefined;

    return {
      content: data.message?.content || "",
      toolCalls,
      usage:
        data.eval_count || data.prompt_eval_count
          ? {
              promptTokens: data.prompt_eval_count || 0,
              completionTokens: data.eval_count || 0,
              totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            }
          : undefined,
    };
  }

  supportsTools(): boolean {
    return true;
  }

  private buildOllamaBody(params: ChatParams, stream: boolean): Record<string, unknown> {
    const messages = params.messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.images?.length ? { images: m.images } : {}),
    }));

    const tools = params.tools?.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    return {
      model: params.model,
      messages,
      stream,
      ...(tools?.length ? { tools } : {}),
      tool_choice: params.toolChoice,
      options: {
        temperature: params.temperature,
        top_p: params.topP,
        stop: params.stop,
        num_predict: params.maxTokens,
      },
    };
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
