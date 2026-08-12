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

export class CustomProvider extends LLMProvider {
  readonly type = "custom";
  readonly id: string;
  readonly name: string;

  private client: OpenAI;

  constructor(runtime: ProviderRuntimeConfig) {
    super(runtime);
    this.id = runtime.id;
    this.name = runtime.name;
    this.client = new OpenAI({
      apiKey: runtime.apiKey || "dummy",
      baseURL: runtime.baseURL,
      timeout: runtime.timeout || 60000,
      maxRetries: runtime.maxRetries ?? 2,
      defaultHeaders: runtime.extraHeaders,
    });
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const start = Date.now();
      await this.executeWithRetry(async () => {
        await this.client.models.list();
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
      const models = await this.executeWithRetry(async () => {
        return await this.client.models.list();
      });

      if (!models || !models.data) {
        return this.runtime.models?.map((m) => ({ ...m, provider: this.id })) || [];
      }

      return models.data.map((model) => ({
        id: model.id,
        name: model.id,
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
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.images?.length ? { images: m.images } : {}),
      })),
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stop: params.stop,
      stream: true,
      tools: params.tools?.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
      tool_choice: params.toolChoice,
    });

    try {
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield { type: "text", content: delta.content };
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name && tc.function?.arguments !== undefined) {
              yield {
                type: "tool_call",
                toolCall: {
                  id: tc.id || crypto.randomUUID(),
                  name: tc.function.name,
                  arguments: this.parseArguments(tc.function.arguments || "{}"),
                },
              } as StreamChunk;
            }
          }
        }

        if (chunk.choices[0]?.finish_reason) {
          yield {
            type: "done",
            finishReason: chunk.choices[0].finish_reason,
          };
        }
      }
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Streaming connection error",
      };
    }
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const response = await this.executeWithRetry(async () => {
      return await this.client.chat.completions.create({
        model: params.model,
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.images?.length ? { images: m.images } : {}),
        })),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        top_p: params.topP,
        stop: params.stop,
        stream: false,
        tools: params.tools?.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          },
        })),
        tool_choice: params.toolChoice,
      });
    });

    const choice = response.choices[0];
    const message = choice.message;

    const toolCalls = message.tool_calls
      ? this.parseToolCalls(message.tool_calls)
      : undefined;

    return {
      content: message.content || "",
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      finishReason: choice.finish_reason,
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
