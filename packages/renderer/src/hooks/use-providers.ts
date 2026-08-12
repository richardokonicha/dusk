import { useState, useEffect, useCallback } from "react";
import { duskIPC } from "../services/ipc-client";

export interface Provider {
  id: string;
  name: string;
  type: "openai" | "anthropic" | "gemini" | "ollama" | "custom";
  enabled: boolean;
  priority: number;
  models?: string[];
}

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await duskIPC.provider.list();
      const data = (response as { success: boolean; data: Provider[] }).data;
      setProviders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const addProvider = useCallback(async (input: {
    name: string;
    type: "openai" | "anthropic" | "gemini" | "ollama" | "custom";
    apiKey?: string;
    baseUrl?: string;
    models?: string[];
  }) => {
    setError(null);
    try {
      const response = await duskIPC.provider.add(input);
      if ((response as { success: boolean }).success) {
        await loadProviders();
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add provider");
      return false;
    }
  }, [loadProviders]);

  const testProvider = useCallback(async (providerId: string): Promise<boolean> => {
    try {
      const result = await duskIPC.provider.test({ providerId });
      return result as boolean;
    } catch {
      return false;
    }
  }, []);

  const updateProvider = useCallback(async (id: string, updates: Record<string, unknown>): Promise<boolean> => {
    setError(null);
    try {
      const response = await duskIPC.provider.update(id, updates);
      if ((response as { success: boolean }).success) {
        await loadProviders();
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update provider");
      return false;
    }
  }, [loadProviders]);

  const removeProvider = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await duskIPC.provider.delete({ providerId: id });
      await loadProviders();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete provider");
      return false;
    }
  }, [loadProviders]);

  return {
    providers,
    isLoading,
    error,
    loadProviders,
    addProvider,
    updateProvider,
    removeProvider,
    testProvider,
  };
}
