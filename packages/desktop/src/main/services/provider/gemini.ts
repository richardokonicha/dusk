import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider } from "./base";
import type {
  ProviderRuntimeConfig,
  ModelInfo,
  ChatParams,
  StreamChunk,
  ConnectionResult,
  ChatResult,
} from "../../../../../shared/dist/src/types/provider.js";

export class GeminiProvider extends LLMProvider {
  readonly type = "gemini";
  readonly id: string;
  readonly name: string;

  private client: GoogleGenerativeAI;

  constructor(runtime: ProviderRuntimeConfig) {
    super(runtime);
    this.id = runtime.id;
    this.name = runtime.name;
    this.client = new GoogleGenerativeAI(runtime.apiKey || "");
  }

  private buildGenerationConfig(params: ChatParams) {
    return {
      temperature: params.temperature,
      maxOutputTokens: params.maxTokens,
      topP: params.topP,
      stopSequences: params.stop,
    };
  }

  private formatHistory(messages: ChatParams["messages"]) {
    const history = messages
      .filter((m) => m.role !== "system" && m.role !== "user")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages.find((m) => m.role === "user");

    return { history, lastMessage: lastMessage?.content || "" };
  }

  async testConnection(): Promise<ConnectionResult> {
    try {
      const start = Date.now();
      await this.executeWithRetry(async () => {
        const model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("Hi");
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
    return this.runtime.models?.map((m) => ({ ...m, provider: this.id })) || [];
  }

  async *streamChat(params: ChatParams): AsyncIterable<StreamChunk> {
    const { history, lastMessage } = this.formatHistory(params.messages);

    const model = this.client.getGenerativeModel({
      model: params.model,
      generationConfig: this.buildGenerationConfig(params),
    });

    try {
      const systemInstruction = params.messages.find((m) => m.role === "system")?.content;
      const chat = model.startChat({
        history,
        systemInstruction: systemInstruction || undefined,
      });
      const result = await this.executeWithRetry(async () => {
        return await chat.sendMessageStream(lastMessage);
      }, this.runtime.maxRetries);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { type: "text", content: text };
        }
      }

      const response = await result.response;
      yield {
        type: "done",
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount || 0,
              completionTokens: response.usageMetadata.candidatesTokenCount || 0,
              totalTokens:
                (response.usageMetadata.promptTokenCount || 0) +
                (response.usageMetadata.candidatesTokenCount || 0),
            }
          : undefined,
      };
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Streaming connection error",
      };
    }
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const { history, lastMessage } = this.formatHistory(params.messages);

    const model = this.client.getGenerativeModel({
      model: params.model,
      generationConfig: this.buildGenerationConfig(params),
    });

    const systemInstruction = params.messages.find((m) => m.role === "system")?.content;
    const chat = model.startChat({
      history,
      systemInstruction: systemInstruction || undefined,
    });
    const result = await this.executeWithRetry(async () => {
      return await chat.sendMessage(lastMessage);
    });

    const response = result.response;
    return {
      content: response.text(),
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens:
              (response.usageMetadata.promptTokenCount || 0) +
              (response.usageMetadata.candidatesTokenCount || 0),
          }
        : undefined,
    };
  }

  supportsTools(): boolean {
    return true;
  }
}
