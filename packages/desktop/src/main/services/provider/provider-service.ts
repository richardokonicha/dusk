import type {
  ProviderConfig,
  ProviderRuntimeConfig,
  ModelInfo,
  ChatParams,
  StreamChunk,
  ConnectionResult,
  ChatResult,
  ProviderType,
} from "../../../../../shared/dist/src/types/provider.js";
import { LLMProvider } from "./base";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { CustomProvider } from "./custom";
import { ProviderRouter } from "./provider-router";
import { SecureStorageService } from "../secure-storage";
import { ProviderFactory } from "./provider-factory";

export interface ProviderFilter {
  type?: ProviderType;
  enabled?: boolean;
  supportsTools?: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;
  priority: number;
  models?: ModelInfo[];
}

export class ProviderService {
  private providers: Map<string, LLMProvider> = new Map();
  private runtimes: Map<string, ProviderRuntimeConfig> = new Map();
  private router: ProviderRouter | null = null;
  private secureStorage: SecureStorageService;

  constructor(secureStorage: SecureStorageService) {
    this.secureStorage = secureStorage;
  }

  validateConfig(config: ProviderConfig): void {
    if (!config.id || typeof config.id !== "string") {
      throw new Error("Provider id is required and must be a string");
    }

    if (!config.name || typeof config.name !== "string") {
      throw new Error("Provider name is required and must be a string");
    }

    const validTypes: ProviderType[] = [
      "openai",
      "anthropic",
      "gemini",
      "ollama",
      "custom",
    ];
    if (!validTypes.includes(config.type)) {
      throw new Error(
        `Invalid provider type: ${config.type}. Valid types: ${validTypes.join(", ")}`
      );
    }

    if (config.baseURL && typeof config.baseURL !== "string") {
      throw new Error("baseURL must be a string");
    }

    if (config.timeout !== undefined && (config.timeout < 1000 || config.timeout > 300000)) {
      throw new Error("Timeout must be between 1000ms and 300000ms");
    }

    if (config.maxRetries !== undefined && config.maxRetries < 0) {
      throw new Error("maxRetries must be non-negative");
    }
  }

  async registerProvider(config: ProviderConfig): Promise<void> {
    this.validateConfig(config);

    if (this.providers.has(config.id)) {
      throw new Error(`Provider with id "${config.id}" is already registered`);
    }

    const apiKey = config.apiKeyRef
      ? (await this.secureStorage.get(config.apiKeyRef)) || ""
      : "";

    const runtime = this.toRuntimeConfig(config, apiKey);
    const provider = ProviderFactory.create(runtime);

    this.providers.set(config.id, provider);
    this.runtimes.set(config.id, runtime);
    this.updateRouter();
  }

  async updateProvider(id: string, config: Partial<ProviderConfig>): Promise<void> {
    const existing = this.runtimes.get(id);
    if (!existing) {
      throw new Error(`Provider with id "${id}" not found`);
    }

    const mergedConfig: ProviderConfig = {
      id,
      name: config.name ?? existing.name,
      type: config.type ?? existing.type,
      baseURL: config.baseURL ?? existing.baseURL,
      apiKeyRef: config.apiKeyRef ?? existing.apiKeyRef,
      models: config.models ?? existing.models,
      enabled: config.enabled ?? existing.enabled,
      priority: config.priority ?? existing.priority,
      timeout: config.timeout ?? existing.timeout,
      maxRetries: config.maxRetries ?? existing.maxRetries,
      extraHeaders: config.extraHeaders ?? existing.extraHeaders,
    };

    this.validateConfig(mergedConfig);

    let apiKey = existing.apiKey;
    if (config.apiKeyRef && config.apiKeyRef !== existing.apiKeyRef) {
      apiKey = (await this.secureStorage.get(config.apiKeyRef)) || "";
    }

    const runtime = this.toRuntimeConfig(mergedConfig, apiKey);
    const provider = ProviderFactory.create(runtime);

    this.providers.set(id, provider);
    this.runtimes.set(id, runtime);
    this.updateRouter();
  }

  unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.runtimes.delete(id);
    this.updateRouter();
  }

  get(id: string): LLMProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }
    return provider;
  }

  tryGet(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  list(filter?: ProviderFilter): LLMProvider[] {
    let providers = Array.from(this.providers.values());

    if (filter?.type) {
      providers = providers.filter((p) => p.type === filter.type);
    }

    if (filter?.enabled !== undefined) {
      const runtime = this.runtimes.get(
        providers[0]?.id ?? ""
      );
      if (runtime) {
        providers = providers.filter((p) => {
          const r = this.runtimes.get(p.id);
          return r?.enabled === filter!.enabled;
        });
      }
    }

    if (filter?.supportsTools !== undefined) {
      providers = providers.filter((p) => p.supportsTools() === filter.supportsTools);
    }

    return providers;
  }

  listWithInfo(filter?: ProviderFilter): ProviderInfo[] {
    return this.list(filter).map((provider) => {
      const runtime = this.runtimes.get(provider.id);
      return {
        id: provider.id,
        name: provider.name,
        type: provider.type as ProviderType,
        enabled: runtime?.enabled ?? false,
        priority: runtime?.priority ?? 0,
        models: runtime?.models,
      };
    });
  }

  async testConnection(id: string, timeoutMs: number = 30000): Promise<ConnectionResult> {
    const provider = this.tryGet(id);
    if (!provider) {
      return { success: false, error: `Provider not found: ${id}` };
    }

    const runtime = this.runtimes.get(id);
    if (runtime && timeoutMs !== runtime.timeout) {
      const originalTimeout = runtime.timeout;
      runtime.timeout = timeoutMs;
      try {
        return await provider.testConnection();
      } finally {
        runtime.timeout = originalTimeout;
      }
    }

    return provider.testConnection();
  }

  async testAll(timeoutMs?: number): Promise<Map<string, ConnectionResult>> {
    const results = new Map<string, ConnectionResult>();
    for (const [id] of this.runtimes) {
      results.set(id, await this.testConnection(id, timeoutMs));
    }
    return results;
  }

  async listModels(id: string): Promise<ModelInfo[]> {
    const provider = this.tryGet(id);
    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }
    return provider.listModels();
  }

  async listAllModels(): Promise<Map<string, ModelInfo[]>> {
    const results = new Map<string, ModelInfo[]>();
    for (const [id, provider] of this.providers) {
      try {
        results.set(id, await provider.listModels());
      } catch (error) {
        results.set(id, []);
      }
    }
    return results;
  }

  getRouter(): ProviderRouter {
    if (!this.router) {
      this.updateRouter();
    }
    return this.router!;
  }

  getRuntimeConfig(id: string): ProviderRuntimeConfig | undefined {
    return this.runtimes.get(id);
  }

  async streamChat(
    params: ChatParams,
    preferredProvider?: string
  ): Promise<AsyncIterable<StreamChunk>> {
    try {
      return await this.getRouter().streamChat(params, preferredProvider);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to initiate streaming chat";
      return {
        async *[Symbol.asyncIterator]() {
          yield {
            type: "error",
            content: message,
          } as StreamChunk;
        },
      };
    }
  }

  async chat(
    params: ChatParams,
    preferredProvider?: string
  ): Promise<ChatResult> {
    try {
      return await this.getRouter().chat(params, preferredProvider);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete chat";
      return {
        content: "",
        finishReason: "error",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  private updateRouter(): void {
    const runtimes = Array.from(this.runtimes.values()).filter((r) => r.enabled);
    this.router = new ProviderRouter({
      providers: runtimes,
    });
  }

  private toRuntimeConfig(config: ProviderConfig, apiKey: string): ProviderRuntimeConfig {
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      apiKey,
      baseURL: config.baseURL,
      models: config.models,
      enabled: config.enabled,
      priority: config.priority,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      extraHeaders: config.extraHeaders,
    };
  }
}
