import { vi } from "vitest";
import type { Provider } from "@shared/types";

export function createMockProvider(overrides?: Partial<Provider>): Provider {
  return {
    id: "provider-1",
    name: "Test Provider",
    type: "openai",
    apiKey: "test-api-key",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4", "gpt-3.5-turbo"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export const mockProviderService = {
  list: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue(createMockProvider()),
  update: vi.fn().mockResolvedValue(createMockProvider()),
  delete: vi.fn().mockResolvedValue(true),
  test: vi.fn().mockResolvedValue(true),
  getModels: vi.fn().mockResolvedValue(["gpt-4", "gpt-3.5-turbo"]),
};

export default mockProviderService;
