import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProviderService } from "../../provider/provider-service";
import { OpenAIProvider } from "../../provider/openai";
import type { ProviderConfig, ProviderRuntimeConfig, ConnectionResult, ModelInfo } from "../../../../../../shared/dist/src/types/provider.js";

const createMockSecureStorage = () => ({
  get: vi.fn().mockResolvedValue(""),
  set: vi.fn(),
  delete: vi.fn().mockReturnValue(true),
  has: vi.fn().mockReturnValue(false),
  listKeys: vi.fn().mockReturnValue([]),
  initialize: vi.fn().mockResolvedValue(undefined),
});

const createMockRuntime = (overrides?: Partial<ProviderRuntimeConfig>): ProviderRuntimeConfig => ({
  id: "provider-1",
  name: "Test Provider",
  type: "openai",
  apiKey: "sk-test",
  baseURL: "https://api.openai.com/v1",
  models: [{ id: "gpt-4", name: "GPT-4", provider: "provider-1", supportsStreaming: true, supportsTools: true, contextWindow: 128000, maxOutputTokens: 4096 }],
  enabled: true,
  priority: 0,
  timeout: 30000,
  maxRetries: 3,
  ...overrides,
});

describe("ProviderService", () => {
  let service: ProviderService;
  let mockStorage: ReturnType<typeof createMockSecureStorage>;

  beforeEach(() => {
    mockStorage = createMockSecureStorage();
    service = new ProviderService(mockStorage as any);
  });

  it("registers a provider", async () => {
    const config: ProviderConfig = {
      id: "p1",
      name: "OpenAI",
      type: "openai",
      baseURL: "https://api.openai.com/v1",
      enabled: true,
      priority: 0,
      timeout: 30000,
      maxRetries: 3,
    };
    await service.registerProvider(config);
    const provider = service.tryGet("p1");
    expect(provider).toBeDefined();
    expect(provider?.id).toBe("p1");
  });

  it("lists registered providers", async () => {
    await service.registerProvider({ id: "p1", name: "OpenAI", type: "openai", baseURL: "https://api.openai.com/v1", enabled: true, priority: 0, timeout: 30000, maxRetries: 3 });
    await service.registerProvider({ id: "p2", name: "Anthropic", type: "anthropic", baseURL: "https://api.anthropic.com", enabled: true, priority: 0, timeout: 30000, maxRetries: 3 });
    const providers = service.list();
    expect(providers).toHaveLength(2);
  });

  it("filters providers by type", async () => {
    await service.registerProvider({ id: "p1", name: "OpenAI", type: "openai", baseURL: "https://api.openai.com/v1", enabled: true, priority: 0, timeout: 30000, maxRetries: 3 });
    await service.registerProvider({ id: "p2", name: "Anthropic", type: "anthropic", baseURL: "https://api.anthropic.com", enabled: true, priority: 0, timeout: 30000, maxRetries: 3 });
    const openaiProviders = service.list({ type: "openai" });
    expect(openaiProviders).toHaveLength(1);
    expect(openaiProviders[0].type).toBe("openai");
  });

  it("filters providers by enabled status", async () => {
    await service.registerProvider({ id: "p1", name: "OpenAI", type: "openai", baseURL: "https://api.openai.com/v1", enabled: true, priority: 0, timeout: 30000, maxRetries: 3 });
    await service.registerProvider({ id: "p2", name: "Anthropic", type: "anthropic", baseURL: "https://api.anthropic.com", enabled: false, priority: 0, timeout: 30000, maxRetries: 3 });
    const disabled = service.list({ enabled: false });
    expect(disabled).toHaveLength(1);
  });

  it("unregisters a provider", async () => {
    await service.registerProvider({ id: "p1", name: "OpenAI", type: "openai", baseURL: "https://api.openai.com/v1", enabled: true, priority: 0, timeout: 30000, maxRetries: 3 });
    service.unregisterProvider("p1");
    expect(service.tryGet("p1")).toBeUndefined();
    expect(service.list()).toHaveLength(0);
  });

  it("throws when getting non-existent provider", () => {
    expect(() => service.get("non-existent")).toThrow("Provider not found: non-existent");
  });

  it("returns undefined when tryGet non-existent provider", () => {
    expect(service.tryGet("non-existent")).toBeUndefined();
  });

  it("validates provider config and throws on invalid type", async () => {
    const config = {
      id: "p1",
      name: "Test",
      type: "invalid-type" as any,
      baseURL: "",
      enabled: true,
      priority: 0,
      timeout: 30000,
      maxRetries: 3,
    };
    await expect(service.registerProvider(config)).rejects.toThrow("Invalid provider type");
  });

  it("validates provider config and throws on missing id", async () => {
    const config = {
      id: "",
      name: "Test",
      type: "openai" as const,
      baseURL: "",
      enabled: true,
      priority: 0,
      timeout: 30000,
      maxRetries: 3,
    };
    await expect(service.registerProvider(config)).rejects.toThrow("Provider id is required");
  });

  it("validates timeout range", async () => {
    const config = {
      id: "p1",
      name: "Test",
      type: "openai" as const,
      baseURL: "",
      enabled: true,
      priority: 0,
      timeout: 500,
      maxRetries: 3,
    };
    await expect(service.registerProvider(config)).rejects.toThrow("Timeout must be between");
  });

  it("throws on duplicate provider id", async () => {
    const config: ProviderConfig = {
      id: "p1",
      name: "OpenAI",
      type: "openai",
      baseURL: "https://api.openai.com/v1",
      enabled: true,
      priority: 0,
      timeout: 30000,
      maxRetries: 3,
    };
    await service.registerProvider(config);
    await expect(service.registerProvider(config)).rejects.toThrow("already registered");
  });

  it("returns error when testing non-existent provider", async () => {
    const result: ConnectionResult = await service.testConnection("non-existent");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Provider not found: non-existent");
  });

  it("returns empty models for non-existent provider via listModels", async () => {
    try {
      await service.listModels("non-existent");
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe("Provider not found: non-existent");
    }
  });

  it("returns provider info from listWithInfo", async () => {
    await service.registerProvider({ id: "p1", name: "OpenAI", type: "openai", baseURL: "https://api.openai.com/v1", enabled: true, priority: 0, timeout: 30000, maxRetries: 3 });
    const info = service.listWithInfo();
    expect(info).toHaveLength(1);
    expect(info[0].id).toBe("p1");
    expect(info[0].name).toBe("OpenAI");
    expect(info[0].type).toBe("openai");
    expect(info[0].enabled).toBe(true);
  });
});

describe("OpenAIProvider", () => {
  it("has correct type and id", () => {
    const runtime = createMockRuntime();
    const provider = new OpenAIProvider(runtime);
    expect(provider.type).toBe("openai");
    expect(provider.id).toBe("provider-1");
  });

  it("supports tools", () => {
    const runtime = createMockRuntime();
    const provider = new OpenAIProvider(runtime);
    expect(provider.supportsTools()).toBe(true);
  });

  it("constructs API URL correctly", () => {
    const runtime = createMockRuntime({ baseURL: "https://api.openai.com/v1/" });
    const provider = new OpenAIProvider(runtime);
    const apiURL = (provider as any).getApiURL();
    expect(apiURL).toBe("https://api.openai.com/v1");
  });

  it("uses default base URL when not provided", () => {
    const runtime = createMockRuntime({ baseURL: undefined });
    const provider = new OpenAIProvider(runtime);
    const apiURL = (provider as any).getApiURL();
    expect(apiURL).toBe("https://api.openai.com/v1");
  });
});
