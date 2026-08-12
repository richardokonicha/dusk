import { useState, useEffect, useCallback } from "react";
import type { Provider, Agent, Settings, ThemeSettings, GeneralSettings, OnboardingState } from "@shared/types";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [s, p, a] = await Promise.all([
        window.dusk.settings.get({ key: "app" }),
        window.dusk.providers.list(),
        window.dusk.agents.list()
      ]);
      setSettings(s.data as Settings);
      setProviders(p.data as Provider[]);
      setAgents(a.data as Agent[]);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const result = await window.dusk.settings.update(partial);
    setSettings(result.data as Settings);
    return result.data as Settings;
  }, []);

  const updateTheme = useCallback(async (theme: Partial<ThemeSettings>) => {
    const result = await window.dusk.settings.updateTheme(theme);
    const updated = result.data as Partial<ThemeSettings>;
    setSettings((prev) => prev ? { ...prev, theme: { ...prev.theme, ...updated } } : prev);
    return updated;
  }, []);

  const updateGeneral = useCallback(async (general: Partial<GeneralSettings>) => {
    const result = await window.dusk.settings.updateGeneral(general);
    const updated = result.data as Partial<GeneralSettings>;
    setSettings((prev) => prev ? { ...prev, general: { ...prev.general, ...updated } } : prev);
    return updated;
  }, []);

  const createProvider = useCallback(async (provider: Omit<Provider, "id" | "createdAt" | "updatedAt">) => {
    const result = await window.dusk.providers.create(provider);
    setProviders((prev) => [...prev, result.data as Provider]);
    return result.data as Provider;
  }, []);

  const updateProvider = useCallback(async (id: string, partial: Partial<Provider>) => {
    const result = await window.dusk.providers.update(id, partial);
    const updated = result.data as Partial<Provider> | undefined;
    if (updated) {
      setProviders((prev) => prev.map((p) => p.id === id ? { ...p, ...updated } : p));
    }
    return updated as Provider | undefined;
  }, []);

  const deleteProvider = useCallback(async (id: string) => {
    const result = await window.dusk.providers.delete(id);
    if (result.data) {
      setProviders((prev) => prev.filter((p) => p.id !== id));
    }
    return result.data;
  }, []);

  const createAgent = useCallback(async (agent: Omit<Agent, "id" | "createdAt" | "updatedAt">) => {
    const result = await window.dusk.agents.create(agent);
    setAgents((prev) => [...prev, result.data as Agent]);
    return result.data as Agent;
  }, []);

  const updateAgent = useCallback(async (id: string, partial: Partial<Agent>) => {
    const result = await window.dusk.agents.update(id, partial);
    const updated = result.data as Partial<Agent> | undefined;
    if (updated) {
      setAgents((prev) => prev.map((a) => a.id === id ? { ...a, ...updated } : a));
    }
    return updated as Agent | undefined;
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    const result = await window.dusk.agents.delete(id);
    if (result.data) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
    }
    return result.data;
  }, []);

  return {
    settings,
    providers,
    agents,
    loading,
    refresh: loadAll,
    updateSettings,
    updateTheme,
    updateGeneral,
    createProvider,
    updateProvider,
    deleteProvider,
    createAgent,
    updateAgent,
    deleteAgent
  };
}
