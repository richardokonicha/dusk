import type {
  LLMClient,
  LLMMessage,
  LLMStreamEvent,
  ToolDefinition as AgentToolDefinition,
} from "../../../../../shared/dist/src/types/agent.js";
import type {
  ChatParams,
  StreamChunk,
} from "../../../../../shared/dist/src/types/provider.js";
import { ProviderRouter } from "../provider/provider-router";

export class LLMRouterClient implements LLMClient {
  constructor(
    private providerRouter: ProviderRouter,
    private model: string = ""
  ) {}

  async *stream(
    messages: LLMMessage[],
    tools?: AgentToolDefinition[]
  ): AsyncIterable<LLMStreamEvent> {
    const chatMessages: ChatParams["messages"] = messages.map((m) => ({
      role: m.role as ChatParams["messages"][number]["role"],
      content: m.content,
    }));

    const chatTools = tools?.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.parameters as { type: "object"; properties: Record<string, unknown>; required?: string[] },
    }));

    const chatParams: ChatParams = {
      model: this.model,
      messages: chatMessages,
    };

    if (chatTools && chatTools.length > 0) {
      chatParams.tools = chatTools;
    }

    const stream = await this.providerRouter.streamChat(chatParams);
    for await (const chunk of stream) {
      if (chunk.type === "tool_result") {
        continue;
      }
      yield this.mapChunk(chunk);
    }
  }

  private mapChunk(chunk: StreamChunk): LLMStreamEvent {
    switch (chunk.type) {
      case "text":
        return { type: "text_delta", content: chunk.content };
      case "done":
        return {
          type: "done",
          usage: chunk.usage
            ? {
                promptTokens: chunk.usage.promptTokens,
                completionTokens: chunk.usage.completionTokens,
              }
            : undefined,
        };
      case "error":
        return { type: "error", content: chunk.content };
      case "tool_call":
        return { type: "tool_call", toolCall: chunk.toolCall };
      default:
        return { type: "done" };
    }
  }
}
