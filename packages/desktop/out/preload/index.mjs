import { contextBridge, ipcRenderer } from "electron";
const ALLOWED_IPC_CHANNELS = /* @__PURE__ */ new Set([
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
  "system:open-external"
]);
const ALLOWED_LISTENER_CHANNELS = /* @__PURE__ */ new Set([
  "auto-update"
]);
const getCspNonce = () => {
  const meta = document.querySelector('meta[name="csp-nonce"]');
  return meta?.getAttribute("content") || void 0;
};
const sanitizeUrl = (raw) => {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed.length > 2048) return "";
  if (/^(javascript|data|vbscript|file)\s*:/i.test(trimmed)) return "";
  return trimmed;
};
const validateIpcChannel = (channel) => {
  if (typeof channel !== "string") return false;
  if (!ALLOWED_IPC_CHANNELS.has(channel)) {
    console.warn(`Blocked IPC call to unregistered channel: ${channel}`);
    return false;
  }
  return true;
};
const validateListenerChannel = (channel) => {
  if (typeof channel !== "string") return false;
  if (!ALLOWED_LISTENER_CHANNELS.has(channel) && !channel.startsWith("dusk:")) {
    console.warn(`Blocked IPC listener on unregistered channel: ${channel}`);
    return false;
  }
  return true;
};
const api = {
  ipc: {
    invoke: async (channel, ...args) => {
      if (!validateIpcChannel(channel)) {
        throw new Error(`IPC channel not allowed: ${channel}`);
      }
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, callback) => {
      if (!validateListenerChannel(channel)) {
        return () => {
        };
      }
      const wrappedCallback = (_event, data) => {
        callback(data);
      };
      ipcRenderer.on(channel, wrappedCallback);
      return () => {
        ipcRenderer.removeListener(channel, wrappedCallback);
      };
    },
    off: (channel, callback) => {
      if (!validateListenerChannel(channel)) {
        return;
      }
      ipcRenderer.removeListener(channel, callback);
    }
  },
  workspace: {
    list: (input) => ipcRenderer.invoke("workspace:list", input),
    create: (input) => ipcRenderer.invoke("workspace:create", input),
    get: (input) => ipcRenderer.invoke("workspace:get", input),
    update: (input) => ipcRenderer.invoke("workspace:update", input),
    delete: (input) => ipcRenderer.invoke("workspace:delete", input),
    export: (input) => ipcRenderer.invoke("workspace:export", input),
    import: (input) => ipcRenderer.invoke("workspace:import", input)
  },
  conversation: {
    list: (input) => ipcRenderer.invoke("conversation:list", input),
    create: (input) => ipcRenderer.invoke("conversation:create", input),
    get: (input) => ipcRenderer.invoke("conversation:get", input),
    delete: (input) => ipcRenderer.invoke("conversation:delete", input)
  },
  message: {
    send: (input) => ipcRenderer.invoke("message:send", input),
    history: (input) => ipcRenderer.invoke("message:history", input),
    stream: (input) => ipcRenderer.invoke("message:stream", input)
  },
  agent: {
    list: () => ipcRenderer.invoke("agent:list"),
    create: (config) => ipcRenderer.invoke("agent:create", { config }),
    get: (input) => ipcRenderer.invoke("agent:get", input),
    update: (input) => ipcRenderer.invoke("agent:update", input),
    delete: (input) => ipcRenderer.invoke("agent:delete", input),
    invoke: (input) => ipcRenderer.invoke("agent:invoke", input),
    stop: (input) => ipcRenderer.invoke("agent:stop", input),
    switch: (input) => ipcRenderer.invoke("agent:switch", input),
    statuses: () => ipcRenderer.invoke("agent:statuses"),
    active: () => ipcRenderer.invoke("agent:active")
  },
  file: {
    list: (input) => ipcRenderer.invoke("file:list", input),
    read: (input) => ipcRenderer.invoke("file:read", input),
    write: (input) => ipcRenderer.invoke("file:write", input),
    delete: (input) => ipcRenderer.invoke("file:delete", input),
    createDir: (input) => ipcRenderer.invoke("file:create-dir", input),
    watch: (input) => ipcRenderer.invoke("file:watch", input)
  },
  artifact: {
    list: (input) => ipcRenderer.invoke("artifact:list", input),
    get: (input) => ipcRenderer.invoke("artifact:get", input),
    save: (input) => ipcRenderer.invoke("artifact:save", input),
    delete: (input) => ipcRenderer.invoke("artifact:delete", input),
    link: (input) => ipcRenderer.invoke("artifact:link", input)
  },
  provider: {
    list: () => ipcRenderer.invoke("provider:list"),
    add: (input) => ipcRenderer.invoke("provider:add", input),
    update: (input) => ipcRenderer.invoke("provider:update", input),
    delete: (input) => ipcRenderer.invoke("provider:delete", input),
    test: (input) => ipcRenderer.invoke("provider:test", input),
    getModels: (input) => ipcRenderer.invoke("provider:get-models", input),
    testConnection: (input) => ipcRenderer.invoke("provider:testConnection", input)
  },
  settings: {
    get: (input) => ipcRenderer.invoke("settings:get", input),
    set: (input) => ipcRenderer.invoke("settings:set", input),
    update: (partial) => ipcRenderer.invoke("settings:update", partial),
    updateTheme: (theme) => ipcRenderer.invoke("settings:updateTheme", theme),
    updateGeneral: (general) => ipcRenderer.invoke("settings:updateGeneral", general)
  },
  onboarding: {
    status: () => ipcRenderer.invoke("onboarding:status"),
    complete: () => ipcRenderer.invoke("onboarding:complete"),
    skip: () => ipcRenderer.invoke("onboarding:skip"),
    setStep: (step) => ipcRenderer.invoke("onboarding:setStep", step),
    isFirstRun: () => ipcRenderer.invoke("onboarding:isFirstRun"),
    reset: () => ipcRenderer.invoke("onboarding:reset"),
    testConnection: (input) => ipcRenderer.invoke("provider:testConnection", input),
    testProviderConnection: (input) => ipcRenderer.invoke("provider:testConnection", input)
  },
  providers: {
    list: () => ipcRenderer.invoke("provider:list"),
    create: (provider) => ipcRenderer.invoke("provider:add", provider),
    update: (id, partial) => ipcRenderer.invoke("provider:update", { id, ...partial }),
    delete: (id) => ipcRenderer.invoke("provider:delete", { id }),
    test: (input) => ipcRenderer.invoke("provider:test", input)
  },
  agents: {
    list: () => ipcRenderer.invoke("agent:list"),
    create: (agent) => ipcRenderer.invoke("agent:create", agent),
    update: (id, partial) => ipcRenderer.invoke("agent:update", { id, ...partial }),
    delete: (id) => ipcRenderer.invoke("agent:delete", { id })
  },
  job: {
    list: (input) => ipcRenderer.invoke("job:list", input),
    get: (input) => ipcRenderer.invoke("job:get", input),
    cancel: (input) => ipcRenderer.invoke("job:cancel", input),
    retry: (input) => ipcRenderer.invoke("job:retry", input)
  },
  system: {
    info: () => ipcRenderer.invoke("system:info"),
    openPath: (input) => ipcRenderer.invoke("system:open-path", input),
    openExternal: (url) => {
      const sanitized = sanitizeUrl(url);
      if (!sanitized) {
        return Promise.resolve({ success: false, error: { code: "INVALID_URL", message: "URL is empty or contains a blocked protocol" } });
      }
      return ipcRenderer.invoke("system:open-external", sanitized);
    }
  },
  csp: {
    nonce: getCspNonce()
  }
};
contextBridge.exposeInMainWorld("dusk", api);
