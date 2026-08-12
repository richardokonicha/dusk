import "@testing-library/jest-dom/vitest";
import { vi, beforeAll, afterEach } from "vitest";

beforeAll(() => {
  process.env.TZ = "UTC";

  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockResizeObserver;

  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
  Element.prototype.scrollIntoView = function () {};
});

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@shared/types", () => ({
  DuskAPI: {},
}));

const mockDuskAPI = {
  platform: {
    getVersion: vi.fn().mockResolvedValue("0.1.0"),
    getPlatform: vi.fn().mockResolvedValue("darwin"),
  },
  tasks: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: "task-1" }),
    update: vi.fn().mockResolvedValue({ id: "task-1" }),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  events: {
    on: vi.fn().mockReturnValue(() => {}),
  },
};

Object.defineProperty(window, "electron", {
  value: {
    ipcRenderer: {
      invoke: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      removeListener: vi.fn(),
    },
    shell: {
      openExternal: vi.fn().mockResolvedValue(undefined),
    },
  },
  writable: true,
});

Object.defineProperty(window, "dusk", {
  value: mockDuskAPI,
  writable: true,
});
