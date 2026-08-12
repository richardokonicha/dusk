import { vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => `/tmp/${name}`),
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    on: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
    },
  })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    send: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
}));
