import type { ProviderRuntimeConfig, ProviderType } from "../../../../../shared/dist/src/types/provider.js";
import { LLMProvider } from "./base";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { CustomProvider } from "./custom";

export class ProviderFactory {
  static create(runtime: ProviderRuntimeConfig): LLMProvider {
    switch (runtime.type) {
      case "openai":
        return new OpenAIProvider(runtime);
      case "anthropic":
        return new AnthropicProvider(runtime);
      case "gemini":
        return new GeminiProvider(runtime);
      case "ollama":
        return new OllamaProvider(runtime);
      case "custom":
        return new CustomProvider(runtime);
      default:
        throw new Error(
          `Unknown provider type: ${runtime.type as string}. ` +
            `Valid types: openai, anthropic, gemini, ollama, custom`
        );
    }
  }

  static createFromType(
    type: ProviderType,
    runtime: Omit<ProviderRuntimeConfig, "type">
  ): LLMProvider {
    return ProviderFactory.create({ ...runtime, type });
  }

  static getSupportedTypes(): ProviderType[] {
    return ["openai", "anthropic", "gemini", "ollama", "custom"];
  }

  static validateType(type: string): type is ProviderType {
    return ProviderFactory.getSupportedTypes().includes(type as ProviderType);
  }

  static getDefaultBaseURL(type: ProviderType): string {
    switch (type) {
      case "openai":
        return "https://api.openai.com/v1";
      case "anthropic":
        return "https://api.anthropic.com";
      case "gemini":
        return "https://generativelanguage.googleapis.com";
      case "ollama":
        return "http://127.0.0.1:11434";
      case "custom":
        return "";
      default:
        return "";
    }
  }

  static getProviderClass(type: ProviderType): new (runtime: ProviderRuntimeConfig) => LLMProvider {
    switch (type) {
      case "openai":
        return OpenAIProvider;
      case "anthropic":
        return AnthropicProvider;
      case "gemini":
        return GeminiProvider;
      case "ollama":
        return OllamaProvider;
      case "custom":
        return CustomProvider;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}
