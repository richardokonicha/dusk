import type { IPCChannel } from "./types";

export interface IPCClientWorkspace {
  list(input?: { workspaceId?: string }): Promise<unknown>;
  create(input: { name: string; path: string }): Promise<unknown>;
  get(input: { workspaceId: string }): Promise<unknown>;
  update(input: { workspaceId: string; name?: string; path?: string }): Promise<unknown>;
  delete(input: { workspaceId: string }): Promise<unknown>;
}

export interface IPCClientConversation {
  list(input: { workspaceId: string }): Promise<unknown>;
  create(input: { workspaceId: string; title?: string }): Promise<unknown>;
  get(input: { conversationId: string }): Promise<unknown>;
  delete(input: { conversationId: string }): Promise<unknown>;
}

export interface IPCClientMessage {
  send(input: { conversationId: string; content: string; role?: string }): Promise<unknown>;
  history(input: { conversationId: string; limit?: number; offset?: number }): Promise<unknown>;
  stream(input: { conversationId: string; content: string; role?: string; checkpoint?: Record<string, unknown> }): Promise<unknown>;
}

export interface IPCClientAgent {
  list(): Promise<unknown>;
  create(config: unknown): Promise<unknown>;
  get(input: { agentId: string }): Promise<unknown>;
  update(input: { agentId: string; updates: Record<string, unknown> }): Promise<unknown>;
  delete(input: { agentId: string }): Promise<unknown>;
  invoke(input: { agentId: string; input: unknown; options?: Record<string, unknown> }): Promise<unknown>;
  stop(input: { agentId: string }): Promise<unknown>;
  switch(input: { agentId: string }): Promise<unknown>;
  statuses(): Promise<unknown>;
  active(): Promise<unknown>;
}

export interface IPCClientFile {
  list(input: { workspaceId: string; path?: string }): Promise<unknown>;
  read(input: { workspaceId: string; path: string }): Promise<unknown>;
  write(input: { workspaceId: string; path: string; content: string; encoding?: string }): Promise<unknown>;
  delete(input: { workspaceId: string; path: string }): Promise<unknown>;
  createDir(input: { workspaceId: string; path: string }): Promise<unknown>;
  watch(input: { workspaceId: string }): Promise<unknown>;
}

export interface IPCClientProvider {
  list(): Promise<unknown>;
  add(input: { name: string; type: string; apiKey?: string; baseUrl?: string; models?: string[] }): Promise<unknown>;
  update(input: { id: string } & Record<string, unknown>): Promise<unknown>;
  delete(input: { providerId: string }): Promise<unknown>;
  test(input: { providerId: string }): Promise<unknown>;
  getModels(input: { providerId: string }): Promise<unknown>;
}

export interface IPCClientSettings {
  get(input: { key: string }): Promise<unknown>;
  set(input: { key: string; value: unknown }): Promise<unknown>;
}

export interface IPCClientOnboarding {
  status(): Promise<unknown>;
  complete(): Promise<unknown>;
  skip(): Promise<unknown>;
  setStep(step: string): Promise<unknown>;
  isFirstRun(): Promise<unknown>;
  reset(): Promise<unknown>;
  testConnection(input: { type: string; baseUrl: string; apiKey: string }): Promise<unknown>;
}

export interface IPCClientJob {
  list(input?: { workspaceId?: string; agentId?: string; status?: string }): Promise<unknown>;
  get(input: { jobId: string }): Promise<unknown>;
  cancel(input: { jobId: string }): Promise<unknown>;
  retry(input: { jobId: string }): Promise<unknown>;
}

export interface IPCClientSystem {
  info(): Promise<unknown>;
  openPath(input: { path: string }): Promise<unknown>;
}

export interface IPCClientInterface {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  on(channel: string, callback: (data: unknown) => void): () => void;
  off(channel: string, callback: (data: unknown) => void): void;
}

export interface IPCClientMethodGroups {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  on(channel: string, callback: (data: unknown) => void): () => void;
  off(channel: string, callback: (data: unknown) => void): void;
  workspace: IPCClientWorkspace;
  conversation: IPCClientConversation;
  message: IPCClientMessage;
  agent: IPCClientAgent;
  file: IPCClientFile;
  provider: IPCClientProvider;
  settings: IPCClientSettings;
  onboarding: IPCClientOnboarding;
  job: IPCClientJob;
  system: IPCClientSystem;
}

export class IPCClient implements IPCClientMethodGroups {
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  async invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
    if (!window.dusk?.ipc) {
      throw new Error("IPC bridge not available. Ensure preload script is loaded.");
    }
    try {
      return await window.dusk.ipc.invoke<T>(channel, ...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : "IPC invoke failed";
      throw new Error(`IPC invoke failed [${channel}]: ${message}`);
    }
  }

  on(channel: string, callback: (data: unknown) => void): () => void {
    if (!window.dusk?.ipc) {
      throw new Error("IPC bridge not available. Ensure preload script is loaded.");
    }

    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }

    const channelListeners = this.listeners.get(channel)!;
    if (channelListeners.has(callback)) {
      return () => {
        channelListeners.delete(callback);
        if (channelListeners.size === 0) {
          this.listeners.delete(channel);
        }
      };
    }

    channelListeners.add(callback);
    return window.dusk.ipc.on(channel, (data: unknown) => {
      callback(data);
    });
  }

  off(channel: string, callback: (data: unknown) => void): void {
    if (!window.dusk?.ipc) {
      return;
    }

    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.delete(callback);
      if (channelListeners.size === 0) {
        this.listeners.delete(channel);
      }
    }

    window.dusk.ipc.off(channel, callback);
  }

  removeAllListeners(channel?: string): void {
    if (channel) {
      this.listeners.delete(channel);
    } else {
      this.listeners.clear();
    }
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
  };

  agent = {
    list: () => this.invoke("agent:list"),
    create: (config: unknown) => this.invoke("agent:create", { config }),
    get: (input: { agentId: string }) => this.invoke("agent:get", input),
    update: (input: { agentId: string; updates: Record<string, unknown> }) => this.invoke("agent:update", input),
    delete: (input: { agentId: string }) => this.invoke<void>("agent:delete", input),
    invoke: (input: { agentId: string; input: unknown; options?: Record<string, unknown> }) =>
      this.invoke("agent:invoke", input),
    stop: (input: { agentId: string }) => this.invoke<void>("agent:stop", input),
    switch: (input: { agentId: string }) => this.invoke("agent:switch", input),
    statuses: () => this.invoke("agent:statuses"),
    active: () => this.invoke("agent:active"),
  };

  file = {
    list: (input: { workspaceId: string; path?: string }) => this.invoke("file:list", input),
    read: (input: { workspaceId: string; path: string }) => this.invoke("file:read", input),
    write: (input: { workspaceId: string; path: string; content: string; encoding?: string }) =>
      this.invoke("file:write", input),
    delete: (input: { workspaceId: string; path: string }) => this.invoke<void>("file:delete", input),
    createDir: (input: { workspaceId: string; path: string }) => this.invoke<void>("file:create-dir", input),
    watch: (input: { workspaceId: string }) => this.invoke("file:watch", input),
  };

  provider = {
    list: () => this.invoke("provider:list"),
    add: (input: { name: string; type: string; apiKey?: string; baseUrl?: string; models?: string[] }) =>
      this.invoke("provider:add", input),
    update: (input: { id: string } & Record<string, unknown>) => this.invoke("provider:update", input),
    delete: (input: { providerId: string }) => this.invoke<void>("provider:delete", input),
    test: (input: { providerId: string }) => this.invoke("provider:test", input),
    getModels: (input: { providerId: string }) => this.invoke("provider:get-models", input),
  };

  settings = {
    get: (input: { key: string }) => this.invoke("settings:get", input),
    set: (input: { key: string; value: unknown }) => this.invoke("settings:set", input),
  };

  onboarding = {
    status: () => this.invoke("onboarding:status"),
    complete: () => this.invoke("onboarding:complete"),
    skip: () => this.invoke("onboarding:skip"),
    setStep: (step: string) => this.invoke("onboarding:setStep", step),
    isFirstRun: () => this.invoke("onboarding:isFirstRun"),
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
    openPath: (input: { path: string }) => this.invoke("system:open-path", input),
  };
}

export const ipcClient = new IPCClient();
