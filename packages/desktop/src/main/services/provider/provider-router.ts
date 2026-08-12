import { LLMProvider } from "./base";
import { ProviderFactory } from "./provider-factory";
import type {
  ProviderRuntimeConfig,
  ChatParams,
  StreamChunk,
  ConnectionResult,
  ChatResult,
  RouterConfig,
  FallbackChain,
} from "../../../../../shared/dist/src/types/provider.js";

export class ProviderRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private runtimes: Map<string, ProviderRuntimeConfig> = new Map();
  private fallbackChain: FallbackChain | undefined;
  private retryDelay: number;
  private maxRetries: number;

  constructor(config: RouterConfig) {
    this.fallbackChain = config.fallbackChain;
    this.retryDelay = config.retryDelay || 1000;
    this.maxRetries = config.maxRetries || 3;

    for (const runtime of config.providers) {
      const provider = ProviderFactory.create(runtime);
      this.runtimes.set(provider.id, runtime);
      this.registerProvider(provider);
    }
  }

  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  listProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  async testAll(): Promise<Map<string, ConnectionResult>> {
    const results = new Map<string, ConnectionResult>();
    for (const [id, provider] of this.providers) {
      results.set(id, await provider.testConnection());
    }
    return results;
  }

  async streamChat(
    params: ChatParams,
    preferredProvider?: string
  ): Promise<AsyncIterable<StreamChunk>> {
    const providerId = preferredProvider || this.resolveProvider(params.model);

    const chain = this.getFallbackChain(providerId);
    let lastError: Error | undefined;

    for (const pid of chain) {
      const p = this.providers.get(pid);
      if (!p) continue;

      try {
        return p.streamChat(params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    const err = lastError || new Error("All providers failed to initialize streaming");
    const errorMsg = err.message;

    return {
      async *[Symbol.asyncIterator]() {
        yield {
          type: "error",
          content: errorMsg,
        } as StreamChunk;
      },
    };
  }

  async chat(params: ChatParams, preferredProvider?: string): Promise<ChatResult> {
    const providerId = preferredProvider || this.resolveProvider(params.model);
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const chain = this.getFallbackChain(providerId);
    let lastError: Error | undefined;

    for (const pid of chain) {
      const p = this.providers.get(pid);
      if (!p) continue;

      try {
        return await p.chat(params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw lastError || new Error("All providers failed");
  }

  private resolveProvider(_modelId: string): string {
    const enabledRuntimes = Array.from(this.runtimes.values()).filter((r) => r.enabled);

    if (enabledRuntimes.length === 0) {
      throw new Error("No enabled providers available");
    }

    enabledRuntimes.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.name.localeCompare(b.name);
    });

    const runtime = enabledRuntimes[0];
    if (!runtime) {
      throw new Error("No providers available");
    }
    return runtime.id;
  }

  private getFallbackChain(providerId: string): string[] {
    const chain = [providerId];
    if (this.fallbackChain?.primary === providerId) {
      chain.push(...this.fallbackChain.fallbacks);
    }
    return chain;
  }
}
