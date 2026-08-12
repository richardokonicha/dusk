/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from "electron";
import type { DuskPreloadAPI } from "../../../../shared/dist/src/ipc/types.js";
import type { FileInfo, ArtifactMetadata } from "../../../../shared/dist/src/types/file.js";
import type { OnboardingState } from "../../../../shared/dist/src/types.js";

declare global {
  interface Window {
    dusk: DuskPreloadAPI;
  }
}

const ALLOWED_IPC_CHANNELS = new Set([
  "workspace:list",
  "workspace:create",
  "workspace:get",
  "workspace:update",
  "workspace:delete",
  "workspace:export",
  "workspace:import",
  "conversation:list",
  "conversation:create",
  "conversation:get",
  "conversation:delete",
  "message:send",
  "message:history",
  "message:stream",
  "agent:list",
  "agent:create",
  "agent:get",
  "agent:update",
  "agent:delete",
  "agent:invoke",
  "agent:stop",
  "agent:switch",
  "agent:statuses",
  "agent:active",
  "file:list",
  "file:read",
  "file:write",
  "file:delete",
  "file:create-dir",
  "file:watch",
  "artifact:list",
  "artifact:get",
  "artifact:save",
  "artifact:delete",
  "artifact:link",
  "provider:list",
  "provider:add",
  "provider:update",
  "provider:delete",
  "provider:test",
  "provider:get-models",
  "provider:testConnection",
  "settings:get",
  "settings:set",
  "onboarding:status",
  "onboarding:complete",
  "onboarding:skip",
  "onboarding:setStep",
  "onboarding:isFirstRun",
  "onboarding:reset",
  "job:list",
  "job:get",
  "job:cancel",
  "job:retry",
  "system:info",
  "system:open-path",
  "system:open-external",
]);

const ALLOWED_LISTENER_CHANNELS = new Set([
  "auto-update",
]);

const getCspNonce = (): string | undefined => {
  const meta = document.querySelector('meta[name="csp-nonce"]');
  return meta?.getAttribute("content") || undefined;
};

const sanitizeUrl = (raw: string): string => {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed.length > 2048) return "";
  if (/^(javascript|data|vbscript|file)\s*:/i.test(trimmed)) return "";
  return trimmed;
};

const validateIpcChannel = (channel: string): boolean => {
  if (typeof channel !== "string") return false;
  if (!ALLOWED_IPC_CHANNELS.has(channel)) {
    console.warn(`Blocked IPC call to unregistered channel: ${channel}`);
    return false;
  }
  return true;
};

const validateListenerChannel = (channel: string): boolean => {
  if (typeof channel !== "string") return false;
  if (!ALLOWED_LISTENER_CHANNELS.has(channel) && !channel.startsWith("dusk:")) {
    console.warn(`Blocked IPC listener on unregistered channel: ${channel}`);
    return false;
  }
  return true;
};

const api: DuskPreloadAPI = {
  ipc: {
    invoke: async <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
      if (!validateIpcChannel(channel)) {
        throw new Error(`IPC channel not allowed: ${channel}`);
      }
      return ipcRenderer.invoke(channel, ...args) as Promise<T>;
    },
    on: (channel: string, callback: (data: unknown) => void): (() => void) => {
      if (!validateListenerChannel(channel)) {
        return () => {};
      }
      const wrappedCallback = (_event: Electron.IpcRendererEvent, data: unknown) => {
        callback(data);
      };
      ipcRenderer.on(channel, wrappedCallback);
      return () => {
        ipcRenderer.removeListener(channel, wrappedCallback);
      };
    },
    off: (channel: string, callback: (data: unknown) => void): void => {
      if (!validateListenerChannel(channel)) {
        return;
      }
      ipcRenderer.removeListener(channel, callback);
    },
  },
  workspace: {
    list: (input: unknown) => ipcRenderer.invoke("workspace:list", input),
    create: (input: unknown) => ipcRenderer.invoke("workspace:create", input),
    get: (input: unknown) => ipcRenderer.invoke("workspace:get", input),
    update: (input: unknown) => ipcRenderer.invoke("workspace:update", input),
    delete: (input: unknown) => ipcRenderer.invoke("workspace:delete", input),
    export: (input: unknown) => ipcRenderer.invoke("workspace:export", input),
    import: (input: unknown) => ipcRenderer.invoke("workspace:import", input),
  },
  conversation: {
    list: (input: unknown) => ipcRenderer.invoke("conversation:list", input),
    create: (input: unknown) => ipcRenderer.invoke("conversation:create", input),
    get: (input: unknown) => ipcRenderer.invoke("conversation:get", input),
    delete: (input: unknown) => ipcRenderer.invoke("conversation:delete", input),
  },
  message: {
    send: (input: unknown) => ipcRenderer.invoke("message:send", input),
    history: (input: unknown) => ipcRenderer.invoke("message:history", input),
    stream: (input: unknown) => ipcRenderer.invoke("message:stream", input),
  },
  agent: {
    list: () => ipcRenderer.invoke("agent:list"),
    create: (config: unknown) => ipcRenderer.invoke("agent:create", { config }),
    get: (input: unknown) => ipcRenderer.invoke("agent:get", input),
    update: (input: unknown) => ipcRenderer.invoke("agent:update", input),
    delete: (input: unknown) => ipcRenderer.invoke("agent:delete", input),
    invoke: (input: unknown) => ipcRenderer.invoke("agent:invoke", input),
    stop: (input: unknown) => ipcRenderer.invoke("agent:stop", input),
    switch: (input: unknown) => ipcRenderer.invoke("agent:switch", input),
    statuses: () => ipcRenderer.invoke("agent:statuses"),
    active: () => ipcRenderer.invoke("agent:active"),
  },
  file: {
    list: (input: unknown) => ipcRenderer.invoke("file:list", input),
    read: (input: unknown) => ipcRenderer.invoke("file:read", input),
    write: (input: unknown) => ipcRenderer.invoke("file:write", input),
    delete: (input: unknown) => ipcRenderer.invoke("file:delete", input),
    createDir: (input: unknown) => ipcRenderer.invoke("file:create-dir", input),
    watch: (input: unknown) => ipcRenderer.invoke("file:watch", input),
  },
  artifact: {
    list: (input: unknown) => ipcRenderer.invoke("artifact:list", input),
    get: (input: unknown) => ipcRenderer.invoke("artifact:get", input),
    save: (input: unknown) => ipcRenderer.invoke("artifact:save", input),
    delete: (input: unknown) => ipcRenderer.invoke("artifact:delete", input),
    link: (input: unknown) => ipcRenderer.invoke("artifact:link", input),
  },
  provider: {
    list: () => ipcRenderer.invoke("provider:list"),
    add: (input: unknown) => ipcRenderer.invoke("provider:add", input),
    update: (input: unknown) => ipcRenderer.invoke("provider:update", input),
    delete: (input: unknown) => ipcRenderer.invoke("provider:delete", input),
    test: (input: unknown) => ipcRenderer.invoke("provider:test", input),
    getModels: (input: unknown) => ipcRenderer.invoke("provider:get-models", input),
    testConnection: (input: unknown) => ipcRenderer.invoke("provider:testConnection", input),
  },
  settings: {
    get: (input: unknown) => ipcRenderer.invoke("settings:get", input),
    set: (input: unknown) => ipcRenderer.invoke("settings:set", input),
    update: (partial: unknown) => ipcRenderer.invoke("settings:update", partial),
    updateTheme: (theme: unknown) => ipcRenderer.invoke("settings:updateTheme", theme),
    updateGeneral: (general: unknown) => ipcRenderer.invoke("settings:updateGeneral", general),
  },
  onboarding: {
    status: () => ipcRenderer.invoke("onboarding:status"),
    complete: () => ipcRenderer.invoke("onboarding:complete"),
    skip: () => ipcRenderer.invoke("onboarding:skip"),
    setStep: (step: unknown) => ipcRenderer.invoke("onboarding:setStep", step),
    isFirstRun: () => ipcRenderer.invoke("onboarding:isFirstRun"),
    reset: () => ipcRenderer.invoke("onboarding:reset"),
    testConnection: (input: unknown) => ipcRenderer.invoke("provider:testConnection", input),
    testProviderConnection: (input: unknown) => ipcRenderer.invoke("provider:testConnection", input),
  },
  providers: {
    list: () => ipcRenderer.invoke("provider:list"),
    create: (provider: unknown) => ipcRenderer.invoke("provider:add", provider),
    update: (id: string, partial: unknown) => ipcRenderer.invoke("provider:update", { id, ...(partial as Record<string, unknown>) }),
    delete: (id: string) => ipcRenderer.invoke("provider:delete", { id }),
    test: (input: { providerId: string }) => ipcRenderer.invoke("provider:test", input),
  },
  agents: {
    list: () => ipcRenderer.invoke("agent:list"),
    create: (agent: unknown) => ipcRenderer.invoke("agent:create", agent),
    update: (id: string, partial: unknown) => ipcRenderer.invoke("agent:update", { id, ...(partial as Record<string, unknown>) }),
    delete: (id: string) => ipcRenderer.invoke("agent:delete", { id }),
  },
  job: {
    list: (input: unknown) => ipcRenderer.invoke("job:list", input),
    get: (input: unknown) => ipcRenderer.invoke("job:get", input),
    cancel: (input: unknown) => ipcRenderer.invoke("job:cancel", input),
    retry: (input: unknown) => ipcRenderer.invoke("job:retry", input),
  },
  system: {
    info: () => ipcRenderer.invoke("system:info"),
    openPath: (input: unknown) => ipcRenderer.invoke("system:open-path", input),
    openExternal: (url: string) => {
      const sanitized = sanitizeUrl(url);
      if (!sanitized) {
        return Promise.resolve({ success: false as const, error: { code: "INVALID_URL", message: "URL is empty or contains a blocked protocol" } });
      }
      return ipcRenderer.invoke("system:open-external", sanitized) as Promise<{ success: boolean; error?: { code: string; message: string } }>;
    },
  },
  csp: {
    nonce: getCspNonce(),
  },
};

contextBridge.exposeInMainWorld("dusk", api);
