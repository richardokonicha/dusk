import { ipcClient, type IPCChannel } from "@shared/ipc";
import type { AgentConfig, AgentInput, AgentState } from "@shared/types/agent";

export class DuskIPCClient {
  async invoke<T = unknown>(channel: IPCChannel, ...args: unknown[]): Promise<T> {
    return ipcClient.invoke<T>(channel, ...args);
  }

  on(channel: IPCChannel, callback: (data: unknown) => void): () => void {
    return ipcClient.on(channel, callback);
  }

  off(channel: IPCChannel, callback: (data: unknown) => void): void {
    ipcClient.off(channel, callback);
  }

  removeAllListeners(channel?: IPCChannel): void {
    ipcClient.removeAllListeners(channel);
  }

  workspace = {
    list: (input?: { workspaceId?: string }) => this.invoke("workspace:list", input),
    create: (input: { name: string; path: string }) => this.invoke("workspace:create", input),
    get: (input: { workspaceId: string }) => this.invoke("workspace:get", input),
    update: (input: { workspaceId: string; name?: string; path?: string }) =>
      this.invoke("workspace:update", input),
    delete: (input: { workspaceId: string }) => this.invoke<void>("workspace:delete", input),
  };

  conversation = {
    list: (input: { workspaceId: string }) => this.invoke("conversation:list", input),
    create: (input: { workspaceId: string; title?: string }) =>
      this.invoke("conversation:create", input),
    get: (input: { conversationId: string }) => this.invoke("conversation:get", input),
    delete: (input: { conversationId: string }) => this.invoke<void>("conversation:delete", input),
  };

  message = {
    send: (input: { conversationId: string; content: string; role?: string }) =>
      this.invoke("message:send", input),
    history: (input: { conversationId: string; limit?: number; offset?: number }) =>
      this.invoke("message:history", input),
    stream: (input: { conversationId: string; content: string; role?: string; checkpoint?: Record<string, unknown> }) =>
      this.invoke("message:stream", input),
    resumeStream: (input: { conversationId: string; checkpoint: Record<string, unknown> }) =>
      this.invoke("message:stream", { ...input, resume: true }),
  };

  agent = {
    list: () => this.invoke<AgentConfig[]>("agent:list"),
    create: (config: AgentConfig) => this.invoke<AgentConfig>("agent:create", { config }),
    get: (input: { agentId: string }) => this.invoke<AgentConfig>("agent:get", input),
    update: (input: { agentId: string; updates: Partial<AgentConfig> }) => this.invoke<AgentConfig>("agent:update", input),
    delete: (input: { agentId: string }) => this.invoke<void>("agent:delete", input),
    invoke: (input: { agentId: string; input: AgentInput }) => this.invoke<unknown>("agent:invoke", input),
    stop: (input: { agentId: string }) => this.invoke<void>("agent:stop", input),
    switch: (input: { agentId: string }) => this.invoke<{ success: boolean; activeAgentId: string }>("agent:switch", input),
    statuses: () => this.invoke<Array<{ id: string; type: string; state: AgentState }>>("agent:statuses"),
    active: () => this.invoke<{ id: string; status: AgentState }>("agent:active"),
  };

  file = {
    list: (input: { workspaceId: string; path?: string }) => this.invoke("file:list", input),
    read: (input: { workspaceId: string; path: string }) => this.invoke<string>("file:read", input),
    write: (input: { workspaceId: string; path: string; content: string; encoding?: string }) =>
      this.invoke<void>("file:write", input),
    delete: (input: { workspaceId: string; path: string }) => this.invoke<void>("file:delete", input),
    createDir: (input: { workspaceId: string; path: string }) => this.invoke<void>("file:create-dir", input),
    watch: (input: { workspaceId: string }) => this.invoke("file:watch", input),
  };

  provider = {
    list: () => this.invoke("provider:list"),
    add: (input: { name: string; type: "openai" | "anthropic" | "gemini" | "ollama" | "custom"; apiKey?: string; baseUrl?: string; models?: string[] }) =>
      this.invoke("provider:add", input),
    update: (id: string, partial: Record<string, unknown>) => this.invoke("provider:update", { id, ...partial }),
    delete: (input: { providerId: string }) => this.invoke<void>("provider:delete", input),
    test: (input: { providerId: string }) => this.invoke<boolean>("provider:test", input),
    getModels: (input: { providerId: string }) => this.invoke<string[]>("provider:get-models", input),
  };

  settings = {
    get: (input: { key: string }) => this.invoke("settings:get", input),
    set: (input: { key: string; value: unknown }) => this.invoke<void>("settings:set", input),
  };

  onboarding = {
    status: () => this.invoke("onboarding:status"),
    complete: () => this.invoke("onboarding:complete"),
    skip: () => this.invoke("onboarding:skip"),
    setStep: (step: string) => this.invoke("onboarding:setStep", step),
    isFirstRun: () => this.invoke<boolean>("onboarding:isFirstRun"),
    reset: () => this.invoke("onboarding:reset"),
    testConnection: (input: { type: string; baseUrl: string; apiKey: string }) =>
      this.invoke("provider:testConnection", input),
  };

  job = {
    list: (input?: { workspaceId?: string; agentId?: string; status?: string }) =>
      this.invoke("job:list", input),
    get: (input: { jobId: string }) => this.invoke("job:get", input),
    cancel: (input: { jobId: string }) => this.invoke("job:cancel", input),
    retry: (input: { jobId: string }) => this.invoke("job:retry", input),
  };

  system = {
    info: () => this.invoke("system:info"),
    openPath: (input: { path: string }) => this.invoke<void>("system:open-path", input),
  };
}

export const duskIPC = new DuskIPCClient();
