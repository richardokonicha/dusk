import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useThemeContext } from "@/components/theme-provider";

let localStorageMock: ReturnType<typeof createLocalStorageMock>;

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  const mock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
  return mock;
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  localStorageMock = createLocalStorageMock();
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});

function TestConsumer() {
  const context = useThemeContext();
  return (
    <div>
      <span data-testid="theme">{context.theme}</span>
      <span data-testid="resolved-theme">{context.resolvedTheme}</span>
      <button onClick={() => context.setTheme("dark")}>Set Dark</button>
      <button onClick={() => context.setTheme("system")}>Set System</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("renders children", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Content</div>
      </ThemeProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("provides default theme context", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("reads theme from localStorage on mount", () => {
    localStorageMock.setItem("dusk-theme", "light");
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("sets data-theme attribute when theme is set", async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    await userEvent.click(screen.getByText("Set Dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("removes data-theme attribute for system theme", async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestConsumer />
      </ThemeProvider>
    );
    await userEvent.click(screen.getByText("Set Dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await userEvent.click(screen.getByText("Set System"));
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("persists theme to localStorage", async () => {
    const setItemSpy = vi.spyOn(localStorageMock, "setItem");
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    await userEvent.click(screen.getByText("Set Dark"));
    expect(setItemSpy).toHaveBeenCalledWith("dusk-theme", "dark");
    setItemSpy.mockRestore();
  });

  it("throws error when useThemeContext is used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useThemeContext must be used within a ThemeProvider");
    consoleError.mockRestore();
  });
});
