import { vi } from "vitest";

export const mockElectron = {
  ipcRenderer: {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue(() => {}),
    removeListener: vi.fn(),
    send: vi.fn(),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
};

export function mockWindowElectron() {
  const mockIpc = {
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue(() => {}),
    removeListener: vi.fn(),
    send: vi.fn(),
  };

  Object.defineProperty(window, "electron", {
    value: {
      ipcRenderer: mockIpc,
      shell: {
        openExternal: vi.fn().mockResolvedValue(undefined),
      },
    },
    writable: true,
    configurable: true,
  });

  return mockIpc;
}
