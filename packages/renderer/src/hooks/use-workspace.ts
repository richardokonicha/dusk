import { useState, useCallback, useEffect } from "react";
import type { Workspace, WorkspaceState } from "../types";
import { duskIPC } from "../services/ipc-client";

const generateId = () => Math.random().toString(36).slice(2, 11);

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>({
    workspaces: [],
    currentWorkspace: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await duskIPC.workspace.list();
      const workspaces = (response as { success: boolean; data: Workspace[] }).data;
      setState((prev) => ({
        ...prev,
        workspaces: workspaces || [],
        currentWorkspace: (workspaces || [])[0] || null,
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load workspaces",
        isLoading: false,
      }));
    }
  }, []);

  const createWorkspace = useCallback(async (name: string, description?: string): Promise<Workspace> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const path = `/tmp/dusk-workspaces/${generateId()}`;
      const response = await duskIPC.workspace.create({ name, path });
      await loadWorkspaces();
      return (response as { success: boolean; data: Workspace }).data;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to create workspace",
        isLoading: false,
      }));
      throw err;
    }
  }, [loadWorkspaces]);

  const deleteWorkspace = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await duskIPC.workspace.delete({ workspaceId: id });
      await loadWorkspaces();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to delete workspace",
        isLoading: false,
      }));
      throw err;
    }
  }, [loadWorkspaces]);

  const switchWorkspace = useCallback(async (id: string) => {
    const workspace = state.workspaces.find((w) => w.id === id);
    if (workspace) {
      setState((prev) => ({
        ...prev,
        currentWorkspace: workspace,
        error: null,
      }));
    }
  }, [state.workspaces]);

  return {
    ...state,
    loadWorkspaces,
    createWorkspace,
    deleteWorkspace,
    switchWorkspace,
  };
}
