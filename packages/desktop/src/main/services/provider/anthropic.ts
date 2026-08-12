import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider } from "./base";
import type {
  ProviderRuntimeConfig,
  ModelInfo,
  ChatParams,
  StreamChunk,
  ConnectionResult,
  ChatResult,
} from "../../../../../shared/dist/src/types/provider.js";

export class AnthropicProvider extends LLMProvider {
  readonly type = "anthropic";
  readonly id: string;
  readonly name: string;

  private client: Anthropic;

  constructor(runtime: ProviderRuntimeConfig) {
    super(runtime);
    this.id = runtime.id;
    this.name = runtime.name;
    this.client = new Anthropic({
      apiKey: runtime.apiKey || "dummy",
      baseURL: runtime.baseURL || "https://api.anthropic.com",
      timeout: runtime.timeout || 60000,
      maxRetries: runtime.maxRetries ?? 2,
      defaultHeaders: runtime.extraHeaders,
    });
  }

  private getMessagesForModel(messages: ChatParams["messages"]) {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        ...(m.images?.length ? { images: m.images } : {}),
      }));
  }

  private getToolsForModel(tools?: ChatParams["tools"]) {
    if (!tools) return undefined;
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
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
      const response = await this.executeWithRetry(async () => {
        return await this.client.models.list();
      });

      if (!response || !response.data) {
        return this.runtime.models?.map((m) => ({ ...m, provider: this.id })) || [];
      }

      return response.data.map((model: { id: string; display_name?: string }) => ({
        id: model.id,
        name: model.display_name || model.id,
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
    const systemMessage = params.messages.find((m) => m.role === "system")?.content;

    const stream = await this.executeWithRetry(async () => {
      return await this.client.messages.stream({
        model: params.model,
        max_tokens: params.maxTokens || 4096,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: this.getMessagesForModel(params.messages),
        temperature: params.temperature,
        top_p: params.topP,
        stop_sequences: params.stop,
        tools: this.getToolsForModel(params.tools),
      });
    });

    try {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", content: event.delta.text };
        } else if (
          event.type === "content_block_start" &&
          event.content_block.type === "tool_use"
        ) {
          yield {
            type: "tool_call",
            toolCall: {
              id: event.content_block.id,
              name: event.content_block.name,
              arguments: (event.content_block.input as Record<string, unknown>) || {},
            },
          };
        } else if (event.type === "message_stop") {
          const message = await stream.finalMessage();
          yield {
            type: "done",
            usage: message.usage
              ? {
                  promptTokens: message.usage.input_tokens,
                  completionTokens: message.usage.output_tokens,
                  totalTokens: message.usage.input_tokens + message.usage.output_tokens,
                }
              : undefined,
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
    const systemMessage = params.messages.find((m) => m.role === "system")?.content;

    const response = await this.executeWithRetry(async () => {
      return await this.client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens || 4096,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: this.getMessagesForModel(params.messages),
        temperature: params.temperature,
        top_p: params.topP,
        stop_sequences: params.stop,
        tools: this.getToolsForModel(params.tools),
      });
    });

    const textContent = response.content
      .filter(
        (block): block is Anthropic.ContentBlock & { type: "text" } =>
          block.type === "text"
      )
      .map((block) => ("text" in block ? (block as { text: string }).text : ""))
      .join("");

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
        block.type === "tool_use"
    );

    return {
      content: textContent,
      toolCalls: toolUseBlocks.map((block) => ({
        id: ("id" in block ? (block as { id: string }).id : crypto.randomUUID()),
        name: "name" in block ? (block as { name: string }).name : "",
        arguments:
          ("input" in block
            ? (block as { input: Record<string, unknown> }).input
            : {}) || {},
      })),
      usage: response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
    };
  }

  supportsTools(): boolean {
    return true;
  }
}
