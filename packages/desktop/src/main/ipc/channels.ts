export const channels = {
  workspace: {
    list: "workspace:list",
    create: "workspace:create",
    get: "workspace:get",
    update: "workspace:update",
    delete: "workspace:delete",
    export: "workspace:export",
    import: "workspace:import",
  },
  conversation: {
    list: "conversation:list",
    create: "conversation:create",
    get: "conversation:get",
    delete: "conversation:delete",
  },
  message: {
    send: "message:send",
    history: "message:history",
    stream: "message:stream",
  },
  agent: {
    list: "agent:list",
    create: "agent:create",
    get: "agent:get",
    update: "agent:update",
    delete: "agent:delete",
    invoke: "agent:invoke",
    stop: "agent:stop",
  },
  file: {
    list: "file:list",
    read: "file:read",
    write: "file:write",
    delete: "file:delete",
    createDir: "file:create-dir",
    watch: "file:watch",
  },
  artifact: {
    list: "artifact:list",
    get: "artifact:get",
    save: "artifact:save",
    delete: "artifact:delete",
    link: "artifact:link",
  },
  provider: {
    list: "provider:list",
    add: "provider:add",
    update: "provider:update",
    delete: "provider:delete",
    test: "provider:test",
    getModels: "provider:get-models",
  },
  settings: {
    get: "settings:get",
    set: "settings:set",
  },
  job: {
    list: "job:list",
    get: "job:get",
    cancel: "job:cancel",
    retry: "job:retry",
  },
  onboarding: {
    status: "onboarding:status",
    complete: "onboarding:complete",
    skip: "onboarding:skip",
    setStep: "onboarding:setStep",
    isFirstRun: "onboarding:isFirstRun",
    reset: "onboarding:reset",
    testConnection: "provider:testConnection",
  },
  system: {
    info: "system:info",
    openPath: "system:open-path",
  },
} as const;

export type ChannelName = (typeof channels)[keyof typeof channels][keyof (typeof channels)[keyof typeof channels]];

export const allChannels: readonly string[] = Object.values(channels).flatMap((group) =>
  Object.values(group)
);
