import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentInstance } from "../../agent-runtime/agent-instance";
import type { AgentConfig, LLMClient, Tool, LLMStreamEvent } from "../../../../../../shared/dist/src/types/agent.js";

const createMockLLMClient = (): LLMClient => ({
  stream: vi.fn().mockImplementation(async function* () {
    yield { type: "text_delta", content: "Hello" };
    yield { type: "text_delta", content: " world" };
    yield { type: "done" };
  }),
});

const createMockTool = (): Tool => ({
  name: "test-tool",
  description: "A test tool",
  parameters: { type: "object", properties: {} },
  execute: vi.fn().mockResolvedValue({
    toolCallId: "tc-1",
    name: "test-tool",
    result: "success",
    durationMs: 100,
  }),
});

const createMockConfig = (overrides?: Partial<AgentConfig>): AgentConfig => ({
  id: "agent-1",
  type: "workspace",
  name: "Test Agent",
  description: "A test agent",
  model: "default",
  temperature: 0.7,
  maxTokens: 4096,
  tools: [],
  permissions: {
    allowFileRead: true,
    allowFileWrite: false,
    allowNetwork: false,
    maxRequestsPerMinute: 60,
  },
  memory: {
    shortTermMaxMessages: 50,
    longTermEnabled: false,
  },
  ...overrides,
});

const createMockMemoryStore = () => {
  const messages: Map<string, any[]> = new Map();
  return {
    addMessage: vi.fn().mockImplementation(async (conversationId: string, message: any) => {
      const history = messages.get(conversationId) || [];
      history.push(message);
      messages.set(conversationId, history);
    }),
    addMessages: vi.fn().mockImplementation(async (conversationId: string, msgs: any[]) => {
      const history = messages.get(conversationId) || [];
      for (const msg of msgs) {
        history.push(msg);
      }
      messages.set(conversationId, history);
    }),
    getConversationHistory: vi.fn().mockImplementation(async (conversationId: string) => {
      return messages.get(conversationId) || [];
    }),
  };
};

describe("AgentInstance", () => {
  let instance: AgentInstance;
  let mockLLM: LLMClient;
  let mockTool: Tool;
  let mockMemoryStore: ReturnType<typeof createMockMemoryStore>;

  beforeEach(() => {
    mockLLM = createMockLLMClient();
    mockTool = createMockTool();
    mockMemoryStore = createMockMemoryStore();
  });

  it("creates with initial idle state", () => {
    instance = new AgentInstance(createMockConfig(), mockLLM, [mockTool], mockMemoryStore as any);
    expect(instance.getState()).toBe("idle");
  });

  it("returns config correctly", () => {
    const config = createMockConfig({ id: "custom-agent" });
    instance = new AgentInstance(config, mockLLM, [mockTool], mockMemoryStore as any);
    expect(instance.getConfig().id).toBe("custom-agent");
  });

  it("changes state during invoke", async () => {
    instance = new AgentInstance(createMockConfig(), mockLLM, [mockTool], mockMemoryStore as any);
    const states: string[] = [];
    instance.onStateChange((state) => {
      states.push(state);
    });

    await instance.invoke({ message: "Hello", conversationId: "conv-1" });
    expect(states).toContain("working");
    expect(states).toContain("completed");
    expect(instance.getState()).toBe("completed");
  });

  it("returns result from invoke", async () => {
    instance = new AgentInstance(createMockConfig(), mockLLM, [mockTool], mockMemoryStore as any);
    const result = await instance.invoke({ message: "Hello", conversationId: "default" });
    expect(result.conversationId).toBe("default");
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("stops agent and resets state", async () => {
    instance = new AgentInstance(createMockConfig(), mockLLM, [mockTool], mockMemoryStore as any);
    instance.stop();
    expect(instance.getState()).toBe("idle");
  });

  it("includes system prompt in messages when provided", async () => {
    instance = new AgentInstance(
      createMockConfig({ systemPrompt: "You are helpful." }),
      mockLLM,
      [mockTool],
      mockMemoryStore as any
    );
    await instance.invoke({ message: "Hello" });
    const streamCall = (mockLLM.stream as any).mock.calls[0];
    const messagesPassedToLLM = streamCall[0];
    const systemMessage = messagesPassedToLLM.find((m: any) => m.role === "system");
    expect(systemMessage).toBeDefined();
    expect(systemMessage?.content).toBe("You are helpful.");
  });
});
