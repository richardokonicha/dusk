import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentRuntimeService } from "../agent-runtime/agent-runtime-service";
import type { AgentConfig, LLMClient, AgentEvent, AgentInput, AgentResult } from "../../../../../shared/dist/src/types/agent.js";
import { MemoryStore } from "../agent-runtime/memory-store";

const createMockLLMClient = (): LLMClient => ({
  stream: vi.fn().mockImplementation(async function* () {
    yield { type: "text_delta", content: "Hello" };
    yield { type: "text_delta", content: " world" };
    yield { type: "done" };
  }),
});

const createMockMemoryStore = (): MemoryStore => ({
  addMessage: vi.fn(),
  getConversationHistory: vi.fn().mockReturnValue([]),
  clear: vi.fn(),
  close: vi.fn(),
}) as unknown as MemoryStore;

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

describe("AgentRuntimeService", () => {
  let runtime: AgentRuntimeService;
  let mockLLM: LLMClient;
  let mockMemoryStore: MemoryStore;

  beforeEach(() => {
    mockLLM = createMockLLMClient();
    mockMemoryStore = createMockMemoryStore();
    runtime = new AgentRuntimeService({ llmClient: mockLLM, memoryStore: mockMemoryStore });
    vi.clearAllMocks();
  });

  describe("createAgent", () => {
    it("creates an agent instance", () => {
      const instance = runtime.createAgent(createMockConfig());
      expect(instance).toBeDefined();
    });

    it("returns the created agent", () => {
      const instance = runtime.createAgent(createMockConfig());
      expect(runtime.getAgent("agent-1")).toBe(instance);
    });

    it("stores agent config", () => {
      runtime.createAgent(createMockConfig());
      expect(runtime.getAgentConfig("agent-1")).toBeDefined();
    });

    it("emits state_change events", () => {
      const listener = vi.fn();
      runtime.onEvent(listener);
      runtime.createAgent(createMockConfig());
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("getAgent", () => {
    it("returns agent by id", () => {
      runtime.createAgent(createMockConfig());
      expect(runtime.getAgent("agent-1")).toBeDefined();
    });

    it("returns undefined for unknown agent", () => {
      expect(runtime.getAgent("unknown")).toBeUndefined();
    });
  });

  describe("getAgentConfig", () => {
    it("returns config by id", () => {
      runtime.createAgent(createMockConfig());
      expect(runtime.getAgentConfig("agent-1")).toBeDefined();
    });

    it("returns undefined for unknown agent", () => {
      expect(runtime.getAgentConfig("unknown")).toBeUndefined();
    });
  });

  describe("listAgents", () => {
    it("returns all created agents", () => {
      runtime.createAgent(createMockConfig({ id: "agent-1" }));
      runtime.createAgent(createMockConfig({ id: "agent-2" }));
      const agents = runtime.listAgents();
      expect(agents).toHaveLength(2);
    });

    it("returns empty array when no agents", () => {
      expect(runtime.listAgents()).toHaveLength(0);
    });
  });

  describe("updateAgent", () => {
    it("updates agent config", () => {
      runtime.createAgent(createMockConfig());
      const updated = runtime.updateAgent("agent-1", { name: "Updated Agent" });
      expect(updated).toBeDefined();
      expect(runtime.getAgentConfig("agent-1")?.name).toBe("Updated Agent");
    });

    it("returns undefined for unknown agent", () => {
      const updated = runtime.updateAgent("unknown", { name: "Updated" });
      expect(updated).toBeUndefined();
    });
  });

  describe("deleteAgent", () => {
    it("deletes agent", () => {
      runtime.createAgent(createMockConfig());
      expect(runtime.deleteAgent("agent-1")).toBe(true);
      expect(runtime.getAgent("agent-1")).toBeUndefined();
    });

    it("returns false for unknown agent", () => {
      expect(runtime.deleteAgent("unknown")).toBe(false);
    });
  });

  describe("invoke", () => {
    it("invokes agent and returns result", async () => {
      runtime.createAgent(createMockConfig());
      const result = await runtime.invoke({ message: "Hello" });
      expect(result).toBeDefined();
      expect(result.conversationId).toBeTruthy();
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it("creates default agent if none exists", async () => {
      const result = await runtime.invoke({ message: "Hello" });
      expect(result).toBeDefined();
    });
  });

  describe("invokeStream", () => {
    it("returns async iterable of events", async () => {
      runtime.createAgent(createMockConfig());
      const events: AgentEvent[] = [];
      for await (const event of runtime.invokeStream({ message: "Hello" })) {
        events.push(event);
      }
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("onEvent", () => {
    it("registers event listener", () => {
      const listener = vi.fn();
      const unsubscribe = runtime.onEvent(listener);
      expect(typeof unsubscribe).toBe("function");
    });

    it("unsubscribes event listener", () => {
      const listener = vi.fn();
      const unsubscribe = runtime.onEvent(listener);
      unsubscribe();
      runtime.createAgent(createMockConfig());
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("stopAgent", () => {
    it("stops running agent", () => {
      runtime.createAgent(createMockConfig());
      expect(runtime.stopAgent("agent-1")).toBe(true);
    });

    it("returns false for unknown agent", () => {
      expect(runtime.stopAgent("unknown")).toBe(false);
    });
  });

  describe("shutdown", () => {
    it("cleans up all agents and configs", () => {
      runtime.createAgent(createMockConfig());
      runtime.createAgent(createMockConfig({ id: "agent-2" }));
      runtime.shutdown();
      expect(runtime.listAgents()).toHaveLength(0);
      expect(runtime.getAgent("agent-1")).toBeUndefined();
    });
  });

  describe("createDefaultWorkspaceAgent", () => {
    it("creates default workspace agent", () => {
      const instance = runtime.createDefaultWorkspaceAgent();
      expect(instance).toBeDefined();
      expect(runtime.getAgent("default-workspace")).toBe(instance);
    });
  });
});
