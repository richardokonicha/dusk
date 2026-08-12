import { useState, useCallback, useEffect, useRef } from "react";
import { useIPC } from "./useIPC";
import { duskIPC } from "../services/ipc-client";
import type { AgentConfig, AgentEvent, AgentInput, AgentState } from "@shared/types/agent";

interface AgentStateData {
  agents: AgentConfig[];
  selectedAgent: AgentConfig | null;
  isLoading: boolean;
  error: string | null;
  activeAgentId: string | null;
  statuses: Array<{ id: string; type: string; state: AgentState }>;
}

export interface UseAgentReturn extends AgentStateData {
  loadAgents: () => Promise<void>;
  createAgent: (config: Omit<AgentConfig, "id">) => Promise<AgentConfig | null>;
  updateAgent: (id: string, updates: Partial<AgentConfig>) => Promise<AgentConfig | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  getAgent: (id: string) => Promise<AgentConfig | null>;
  invokeAgent: (input: AgentInput) => Promise<unknown>;
  stopAgent: (id: string) => Promise<boolean>;
  switchAgent: (agentId: string) => Promise<{ success: boolean; activeAgentId: string }>;
  loadStatuses: () => Promise<void>;
  loadActiveAgent: () => Promise<void>;
  selectAgent: (agent: AgentConfig | null) => void;
  onAgentEvent: (callback: (event: AgentEvent) => void) => () => void;
  clearError: () => void;
}

export function useAgent(): UseAgentReturn {
  const [state, setState] = useState<AgentStateData>({
    agents: [],
    selectedAgent: null,
    isLoading: false,
    error: null,
    activeAgentId: null,
    statuses: [],
  });

  const loadAgents = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const agents = await duskIPC.agent.list();
      setState((prev) => ({
        ...prev,
        agents: Array.isArray(agents) ? agents : [],
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load agents",
        isLoading: false,
      }));
    }
  }, []);

  const createAgent = useCallback(async (config: Omit<AgentConfig, "id">) => {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticAgent = { ...config, id: optimisticId } as AgentConfig;

    setState((prev) => ({
      ...prev,
      agents: [...prev.agents, optimisticAgent],
      isLoading: true,
      error: null,
    }));

    try {
      const agent = await duskIPC.agent.create(config as AgentConfig);
      setState((prev) => ({
        ...prev,
        agents: prev.agents.map((a) => (a.id === optimisticId ? agent as AgentConfig : a)),
        isLoading: false,
      }));
      return agent as AgentConfig;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        agents: prev.agents.filter((a) => a.id !== optimisticId),
        error: err instanceof Error ? err.message : "Failed to create agent",
        isLoading: false,
      }));
      return null;
    }
  }, []);

  const updateAgent = useCallback(async (id: string, updates: Partial<AgentConfig>) => {
    const previousAgents = state.agents;
    const previousSelected = state.selectedAgent;

    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      selectedAgent: prev.selectedAgent?.id === id ? { ...prev.selectedAgent, ...updates } : prev.selectedAgent,
      isLoading: true,
      error: null,
    }));

    try {
      const agent = await duskIPC.agent.update({ agentId: id, updates });
      setState((prev) => ({
        ...prev,
        agents: prev.agents.map((a) => (a.id === id ? { ...a, ...agent } : a)),
        selectedAgent: prev.selectedAgent?.id === id ? { ...prev.selectedAgent, ...agent } : prev.selectedAgent,
        isLoading: false,
      }));
      return agent as AgentConfig;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        agents: previousAgents,
        selectedAgent: previousSelected,
        error: err instanceof Error ? err.message : "Failed to update agent",
        isLoading: false,
      }));
      return null;
    }
  }, [state.agents, state.selectedAgent]);

  const deleteAgent = useCallback(async (id: string) => {
    const previousAgents = state.agents;
    const previousSelected = state.selectedAgent;

    setState((prev) => ({
      ...prev,
      agents: prev.agents.filter((a) => a.id !== id),
      selectedAgent: prev.selectedAgent?.id === id ? null : prev.selectedAgent,
      isLoading: true,
      error: null,
    }));

    try {
      await duskIPC.agent.delete({ agentId: id });
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        agents: previousAgents,
        selectedAgent: previousSelected,
        error: err instanceof Error ? err.message : "Failed to delete agent",
        isLoading: false,
      }));
      return false;
    }
  }, [state.agents, state.selectedAgent]);

  const getAgent = useCallback(async (id: string) => {
    try {
      const agent = await duskIPC.agent.get({ agentId: id });
      return agent as AgentConfig | null;
    } catch {
      return null;
    }
  }, []);

  const invokeAgent = useCallback(async (input: AgentInput) => {
    try {
      return await duskIPC.agent.invoke({ agentId: input.conversationId || "default", input });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to invoke agent",
      }));
      throw err;
    }
  }, []);

  const stopAgent = useCallback(async (id: string) => {
    try {
      await duskIPC.agent.stop({ agentId: id });
      return true;
    } catch {
      return false;
    }
  }, []);

  const switchAgent = useCallback(async (agentId: string) => {
    try {
      const result = await duskIPC.agent.switch({ agentId });
      setState((prev) => ({
        ...prev,
        activeAgentId: result.activeAgentId,
      }));
      return result;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to switch agent",
      }));
      return { success: false as const, activeAgentId: state.activeAgentId || "" };
    }
  }, [state.activeAgentId]);

  const loadStatuses = useCallback(async () => {
    try {
      const statuses = await duskIPC.agent.statuses();
      const typedStatuses = (Array.isArray(statuses) ? statuses : []).map((s) => ({
        ...s,
        state: s.state as AgentState,
      }));
      setState((prev) => ({
        ...prev,
        statuses: typedStatuses,
      }));
    } catch {
      // ignore status load errors
    }
  }, []);

  const loadActiveAgent = useCallback(async () => {
    try {
      const active = await duskIPC.agent.active();
      setState((prev) => ({
        ...prev,
        activeAgentId: active.id,
      }));
    } catch {
      // ignore
    }
  }, []);

  const selectAgent = useCallback((agent: AgentConfig | null) => {
    setState((prev) => ({
      ...prev,
      selectedAgent: agent,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const eventCallbackRef = useRef<((event: AgentEvent) => void) | null>(null);

  const handleAgentEvent = useCallback((data: unknown) => {
    if (eventCallbackRef.current) {
      eventCallbackRef.current(data as AgentEvent);
    }
  }, []);

  useIPC<AgentEvent>("agent:stream-chunk", handleAgentEvent);

  const onAgentEvent = useCallback((callback: (event: AgentEvent) => void) => {
    eventCallbackRef.current = callback;
    return () => {
      eventCallbackRef.current = null;
    };
  }, []);

  useEffect(() => {
    loadAgents();
    loadActiveAgent();
  }, [loadAgents, loadActiveAgent]);

  return {
    ...state,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent,
    invokeAgent,
    stopAgent,
    switchAgent,
    loadStatuses,
    loadActiveAgent,
    selectAgent,
    onAgentEvent,
    clearError,
  };
}
