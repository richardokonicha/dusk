export interface IPCRequest<T = unknown> {
  channel: string;
  args: T;
  requestId: string;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export interface IPCEvent<T = unknown> {
  channel: string;
  data: T;
  timestamp: number;
}

export type IPCChannel =
  | "workspace:list"
  | "workspace:create"
  | "workspace:get"
  | "workspace:update"
  | "workspace:delete"
  | "workspace:export"
  | "workspace:import"
  | "conversation:list"
  | "conversation:create"
  | "conversation:get"
  | "conversation:delete"
  | "message:send"
  | "message:history"
  | "message:stream"
  | "agent:list"
  | "agent:create"
  | "agent:get"
  | "agent:update"
  | "agent:delete"
  | "agent:invoke"
  | "agent:stop"
  | "agent:run"
  | "agent:stream-chunk"
  | "agent:switch"
  | "agent:statuses"
  | "agent:active"
  | "file:list"
  | "file:read"
  | "file:write"
  | "file:delete"
  | "file:create-dir"
  | "file:watch"
  | "artifact:list"
  | "artifact:get"
  | "artifact:save"
  | "artifact:delete"
  | "artifact:link"
  | "provider:list"
  | "provider:add"
  | "provider:update"
  | "provider:delete"
  | "provider:test"
  | "provider:get-models"
  | "provider:testConnection"
  | "settings:get"
  | "settings:set"
  | "onboarding:status"
  | "onboarding:complete"
  | "onboarding:skip"
  | "onboarding:setStep"
  | "onboarding:isFirstRun"
  | "onboarding:reset"
  | "job:list"
  | "job:get"
  | "job:cancel"
  | "job:retry"
  | "system:info"
  | "system:open-path";

export interface IpcClientInterface {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  on(channel: string, callback: (data: unknown) => void): () => void;
  off(channel: string, callback: (data: unknown) => void): void;
}

export interface DuskPreloadAPI {
  ipc: {
    invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
    on: (channel: string, callback: (data: unknown) => void) => () => void;
    off: (channel: string, callback: (data: unknown) => void) => void;
  };
  workspace: {
    list: (input?: { workspaceId?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    create: (input: { name: string; path: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    get: (input: { workspaceId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    update: (input: { workspaceId: string; name?: string; path?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (input: { workspaceId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    export: (input: { workspaceId: string }) => Promise<{ success: boolean; data?: ArrayBuffer; error?: { code: string; message: string } }>;
    import: (input: { data: ArrayBuffer }) => Promise<{ success: boolean; data?: { workspaceId: string; imported: number; files: string[] }; error?: { code: string; message: string } }>;
  };
  conversation: {
    list: (input: { workspaceId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    create: (input: { workspaceId: string; title?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    get: (input: { conversationId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (input: { conversationId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  message: {
    send: (input: { conversationId: string; content: string; role?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    history: (input: { conversationId: string; limit?: number; offset?: number }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    stream: (input: { conversationId: string; content: string; role?: string; checkpoint?: Record<string, unknown> }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  agent: {
    list: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    create: (config: unknown) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    get: (input: { agentId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    update: (input: { agentId: string; updates: Record<string, unknown> }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (input: { agentId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    invoke: (input: { agentId: string; input: unknown; options?: Record<string, unknown> }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    stop: (input: { agentId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    switch: (input: { agentId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    statuses: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    active: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  artifact: {
    list: (input: { workspaceId: string; agentId?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    get: (input: { artifactId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    save: (input: { workspaceId: string; agentId: string; name: string; description?: string; content: string; conversationId?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (input: { artifactId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    link: (input: { artifactId: string; conversationId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  file: {
    list: (input: { workspaceId: string; path?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    read: (input: { workspaceId: string; path: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    write: (input: { workspaceId: string; path: string; content: string; encoding?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (input: { workspaceId: string; path: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    createDir: (input: { workspaceId: string; path: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    watch: (input: { workspaceId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  provider: {
    list: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    add: (input: { name: string; type: string; apiKey?: string; baseUrl?: string; models?: string[] }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    update: (input: { id: string } & Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (input: { providerId: string }) => Promise<{ success: boolean; data?: boolean; error?: { code: string; message: string } }>;
    test: (input: { providerId: string }) => Promise<{ success: boolean; data?: boolean; error?: { code: string; message: string } }>;
    getModels: (input: { providerId: string }) => Promise<{ success: boolean; data?: string[]; error?: { code: string; message: string } }>;
    testConnection: (input: { type: string; baseUrl: string; apiKey: string }) => Promise<{ success: boolean; data?: { models?: string[]; latency?: number }; error?: { code: string; message: string } }>;
  };
  settings: {
    get: (input: { key: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    set: (input: { key: string; value: unknown }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    update: (partial: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    updateTheme: (theme: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    updateGeneral: (general: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  onboarding: {
    status: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    complete: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    skip: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    setStep: (step: string) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    isFirstRun: () => Promise<{ success: boolean; data?: boolean; error?: { code: string; message: string } }>;
    reset: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    testConnection: (input: { type: string; baseUrl: string; apiKey: string }) => Promise<{ success: boolean; data?: { models?: string[]; latency?: number; error?: string }; error?: { code: string; message: string } }>;
    testProviderConnection: (input: { type: string; baseUrl: string; apiKey: string }) => Promise<{ success: boolean; data?: { models?: string[]; latency?: number; error?: string }; error?: { code: string; message: string } }>;
  };
  providers: {
    list: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    create: (provider: unknown) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    update: (id: string, partial: unknown) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (id: string) => Promise<{ success: boolean; data?: boolean; error?: { code: string; message: string } }>;
    test: (input: { providerId: string }) => Promise<{ success: boolean; data?: boolean; error?: { code: string; message: string } }>;
  };
  agents: {
    list: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    create: (agent: unknown) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    update: (id: string, partial: unknown) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    delete: (id: string) => Promise<{ success: boolean; data?: boolean; error?: { code: string; message: string } }>;
  };
  job: {
    list: (input?: { workspaceId?: string; agentId?: string; status?: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    get: (input: { jobId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    cancel: (input: { jobId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    retry: (input: { jobId: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  system: {
    info: () => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    openPath: (input: { path: string }) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
    openExternal: (url: string) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  };
  csp: {
    nonce: string | undefined;
  };
}

declare global {
  interface Window {
    dusk: DuskPreloadAPI;
  }
}
